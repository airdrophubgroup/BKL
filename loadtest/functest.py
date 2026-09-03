#!/usr/bin/env python3
# =============================================================
# Beediyo Kall — Functional test suite (every API function)
#
# Seeds a handful of disposable users (ft_user_xxx) into Supabase,
# then asserts correct behaviour of every production API route —
# happy paths AND negative/security cases — using real signed
# session cookies. Always cleans up afterwards.
#
#   python loadtest/functest.py --env .env.local \
#       --base https://bkl-airdrophubgroups-projects.vercel.app
#
# Exits non-zero if any check fails.
# =============================================================

import argparse
import hashlib
import hmac
import json
import sys
import time
import urllib.error
import urllib.request


def load_env(path):
    d = {}
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"').strip("'")
    return d


def uuid(i):
    return f"00000000-0000-4000-8000-{i:012d}"


def wallet(i):
    return "0x" + f"{0x2000 + i:040x}"


def http(method, url, data=None, headers=None, timeout=35):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return -1, str(e).encode(), {}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--env", default=".env.local")
    p.add_argument("--base", required=True)
    args = p.parse_args()

    E = load_env(args.env)
    BASE = args.base.rstrip("/")
    SR = E["SUPABASE_SERVICE_ROLE_KEY"]
    REST = E["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    SIG = E["REQUEST_SIGNING_KEY"]

    def rh():
        return {"apikey": SR, "Authorization": f"Bearer {SR}", "Content-Type": "application/json"}

    def ck(w):
        sig = hmac.new(SIG.encode(), w.encode(), hashlib.sha256).hexdigest()
        return {"Cookie": f"bk_session={w}.{sig}", "Content-Type": "application/json"}

    results = []

    def check(name, ok, extra=""):
        results.append((name, bool(ok)))
        print(("PASS " if ok else "FAIL ") + name + (f"  [{extra}]" if extra else ""))

    # ---------- seed ----------
    countries = ["IN", "IN", "GB", "GB", "US", "BR", "ZZ"]
    ages = [20, 22, 30, 28, 25, 40, 18]
    genders = ["male", "male", "female", "female", "other", "male", "any"]
    profiles = []
    for i in range(1, 8):
        profiles.append(
            {
                "id": uuid(i),
                "worldcoin_id": f"ft_wc_{i:03d}",
                "wallet": wallet(i),
                "username": f"ft_user_{i:03d}",
                "country": countries[i - 1],
                "age": ages[i - 1],
                "gender": genders[i - 1],
                "onboarded": i != 7,
                "privacy_accepted": i != 7,
            }
        )
    code, _, _ = http(
        "POST", f"{REST}/rest/v1/bk_profiles", profiles,
        {**rh(), "Prefer": "resolution=merge-duplicates,return=minimal"})
    check("seed profiles", code in (200, 201, 204), f"http {code}")

    subs = []
    for i, tier in ((2, 1), (4, 2), (6, 3)):
        subs.append({
            "user_id": uuid(i), "tier": tier,
            "starts_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() - 86400)),
            "expires_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 8 * 86400)),
        })
    code, _, _ = http("POST", f"{REST}/rest/v1/bk_subscriptions", subs,
                      {**rh(), "Prefer": "resolution=merge-duplicates,return=minimal"})
    check("seed subs", code in (200, 201, 204), f"http {code}")

    code, _, _ = http("POST", f"{REST}/rest/v1/bk_bkl_tokens",
                      [{"user_id": uuid(6), "amount": 10, "source": "bonus"}],
                      {**rh(), "Prefer": "resolution=merge-duplicates,return=minimal"})
    check("seed bkl", code in (200, 201, 204), f"http {code}")

    try:
        # ---------- auth gates ----------
        s, _, _ = http("GET", f"{BASE}/api/me")
        check("A1 /api/me no-cookie 401", s == 401, f"{s}")
        s, _, _ = http("GET", f"{BASE}/api/subscription")
        check("A2 /api/subscription no-cookie 401", s == 401, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/match", {"excludeId": uuid(1), "tier": 0})
        check("A3 /api/match no-cookie 401", s == 401, f"{s}")
        s, _, _ = http("GET", f"{BASE}/api/user-tier?userId=" + uuid(2))
        check("A4 /api/user-tier no-cookie 401", s == 401, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/generate-nonce")
        check("A5 /api/generate-nonce no-cookie 401", s == 401, f"{s}")

        # ---------- session / nonce / siwe ----------
        s, raw, _ = http("GET", f"{BASE}/api/session")
        d = json.loads(raw)
        check("B1 /api/session no-cookie null", s == 200 and d.get("wallet") is None)
        s, raw, _ = http("GET", f"{BASE}/api/session", headers=ck(wallet(1)))
        d = json.loads(raw)
        check("B2 /api/session restore", s == 200 and d.get("wallet") == wallet(1))
        s, raw, hd = http("GET", f"{BASE}/api/nonce")
        d = json.loads(raw)
        nonce = d.get("nonce", "")
        check("B3 /api/nonce nonce+cookie", s == 200 and len(nonce) >= 8 and "bk_siwe_nonce" in hd.get("Set-Cookie", ""), f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/complete-siwe", {"payload": {}, "nonce": nonce})
        check("B4 complete-siwe bad payload 400", s == 400, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/complete-siwe",
                       {"payload": {"message": "x", "signature": "0x" + "ab" * 32}, "nonce": "wrong"})
        check("B5 complete-siwe bad nonce 400", s == 400, f"{s}")
        s, raw, _ = http("POST", f"{BASE}/api/generate-nonce", headers=ck(wallet(1)))
        d = json.loads(raw)
        check("B6 generate-nonce authed", s == 200 and len(d.get("id", "")) > 10, f"{s}")

        # ---------- profile ----------
        s, raw, _ = http("GET", f"{BASE}/api/me", headers=ck(wallet(1)))
        d = json.loads(raw)["profile"]
        check("C1 /api/me free user", s == 200 and d["username"] == "ft_user_001" and d["onboarded"] is True)
        s, raw, _ = http("PATCH", f"{BASE}/api/me",
                         {"username": "NewName_1", "avatarUrl": "https://x.example/a.png"}, ck(wallet(1)))
        d = json.loads(raw).get("profile", {})
        check("C2 /api/me patch username", s == 200 and d.get("username") == "NewName_1")
        s, _, _ = http("PATCH", f"{BASE}/api/me", {"privacyAccepted": True}, ck(wallet(1)))
        check("C3 /api/me patch privacy", s == 200, f"{s}")
        s, _, _ = http("PATCH", f"{BASE}/api/me",
                       {"onboarded": {"country": "USX", "age": 20, "gender": "male"}}, ck(wallet(7)))
        check("C4 onboarding invalid country 400", s == 400, f"{s}")
        s, _, _ = http("PATCH", f"{BASE}/api/me",
                       {"onboarded": {"country": "US", "age": 10, "gender": "male"}}, ck(wallet(7)))
        check("C5 onboarding invalid age 400", s == 400, f"{s}")
        s, raw, _ = http("PATCH", f"{BASE}/api/me",
                         {"onboarded": {"country": "US", "age": 19, "gender": "female"}}, ck(wallet(7)))
        d = json.loads(raw).get("profile", {})
        check("C6 onboarding set 200", s == 200 and d.get("onboarded") is True and d.get("country") == "US")
        s, _, _ = http("PATCH", f"{BASE}/api/me",
                       {"onboarded": {"country": "GB", "age": 22, "gender": "male"}}, ck(wallet(7)))
        check("C7 onboarding lock 409", s == 409, f"{s}")

        # ---------- subscription / tier ----------
        s, raw, _ = http("GET", f"{BASE}/api/subscription", headers=ck(wallet(4)))
        d = json.loads(raw)
        check("D1 /api/subscription premium", s == 200 and d.get("subscription") and d["subscription"].get("tier") == 2)
        s, raw, _ = http("GET", f"{BASE}/api/subscription", headers=ck(wallet(1)))
        d = json.loads(raw)
        check("D2 /api/subscription free null", s == 200 and d.get("subscription") is None)
        s, raw, _ = http("POST", f"{BASE}/api/subscription",
                         {"tier": 1, "txId": "0x" + "ab" * 32}, ck(wallet(1)))
        check("D3 fake 0x hash rejected in prod", s == 400 and b"disabled" in raw.lower(), f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/subscription", {"tier": 9, "txId": "tx_abcdef123"}, ck(wallet(1)))
        check("D4 invalid tier 400", s == 400, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/subscription", {"tier": 1}, ck(wallet(1)))
        check("D5 missing txId 400", s == 400, f"{s}")
        s, raw, _ = http("GET", f"{BASE}/api/user-tier?userId=" + uuid(2), headers=ck(wallet(1)))
        d = json.loads(raw)
        check("D6 user-tier premium peer", s == 200 and d.get("tier") == 1, f"tier={d.get('tier')}")
        s, raw, _ = http("GET", f"{BASE}/api/user-tier?userId=" + uuid(3), headers=ck(wallet(1)))
        d = json.loads(raw)
        check("D7 user-tier free peer 0", s == 200 and d.get("tier") == 0)

        # ---------- daily usage ----------
        s, raw, _ = http("GET", f"{BASE}/api/daily-usage", headers=ck(wallet(1)))
        d = json.loads(raw)
        check("E1 usage free", s == 200 and d.get("premium") is False and d.get("remaining", 0) <= 60,
              f"rem={d.get('remaining')}")
        s, raw, _ = http("POST", f"{BASE}/api/daily-usage", {"seconds": 5}, ck(wallet(1)))
        d = json.loads(raw)
        check("E2 usage log 5s", s == 200 and d.get("remaining", 61) <= 55, f"rem={d.get('remaining')}")
        s, _, _ = http("POST", f"{BASE}/api/daily-usage", {"seconds": 999}, ck(wallet(1)))
        check("E3 usage too-big 400", s == 400, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/daily-usage", {"seconds": 0}, ck(wallet(1)))
        check("E4 usage zero 400", s == 400, f"{s}")
        s, raw, _ = http("GET", f"{BASE}/api/daily-usage", headers=ck(wallet(4)))
        d = json.loads(raw)
        check("E5 usage premium unlimited", s == 200 and d.get("premium") is True, f"{d}")

        # ---------- match ----------
        s, _, _ = http("POST", f"{BASE}/api/match",
                       {"excludeId": uuid(1), "tier": 0, "filters": {"gender": "any"}}, ck(wallet(1)))
        check("F1 match free random", s == 200, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/match",
                       {"excludeId": uuid(1), "tier": 3, "filters": {"gender": "male", "country": "IN"}}, ck(wallet(1)))
        check("F2 match free claims tier3 403", s == 403, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/match",
                       {"excludeId": uuid(2), "tier": 2, "filters": {"gender": "female"}}, ck(wallet(2)))
        check("F3 match tier1 claims tier2 403", s == 403, f"{s}")
        s, raw, _ = http("POST", f"{BASE}/api/match",
                         {"excludeId": uuid(6), "tier": 3,
                          "filters": {"gender": "male", "country": "IN", "ageMin": 18, "ageMax": 99}}, ck(wallet(6)))
        d = json.loads(raw)
        ok = s == 200 and d.get("match") and d["match"].get("gender") == "male" and d["match"].get("country") == "IN"
        check("F4 match tier3 filtered male+IN", ok, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/match", {"excludeId": "not-a-uuid", "tier": 0}, ck(wallet(1)))
        check("F5 match invalid excludeId 400", s == 400, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/match", {"excludeId": uuid(1), "tier": 7}, ck(wallet(1)))
        check("F6 match invalid tier 400", s == 400, f"{s}")

        # ---------- report ----------
        s, raw, _ = http("POST", f"{BASE}/api/report",
                         {"reportedId": uuid(5), "reason": "Inappropriate content shown"}, ck(wallet(1)))
        check("G1 report ok", s == 200, f"{s} {raw[:60]}")
        s, _, _ = http("POST", f"{BASE}/api/report", {"reportedId": uuid(1), "reason": "self"}, ck(wallet(1)))
        check("G2 report self 400", s == 400, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/report",
                       {"reportedId": "00000000-0000-4000-8000-ffffffffffff", "reason": "not here"}, ck(wallet(1)))
        check("G3 report missing user 404", s == 404, f"{s}")
        s, _, _ = http("POST", f"{BASE}/api/report", {"reportedId": uuid(5), "reason": "x"}, ck(wallet(1)))
        check("G4 report short reason 400", s == 400, f"{s}")

        # ---------- expiry + free-limit enforcement ----------
        now_u = time.time()
        code, _, _ = http("POST", f"{REST}/rest/v1/bk_subscriptions",
                          [{"user_id": uuid(3), "tier": 3,
                            "starts_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now_u - 2 * 86400)),
                            "expires_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now_u - 3600))}],
                          {**rh(), "Prefer": "resolution=merge-duplicates,return=minimal"})
        check("seed expired sub", code in (200, 201, 204), f"{code}")
        s, raw, _ = http("GET", f"{BASE}/api/subscription", headers=ck(wallet(3)))
        d = json.loads(raw)
        check("I1 expired sub NOT returned", s == 200 and d.get("subscription") is None, f"{d}")
        s, raw, _ = http("GET", f"{BASE}/api/user-tier?userId=" + uuid(3), headers=ck(wallet(1)))
        d = json.loads(raw)
        check("I2 expired user-tier 0", s == 200 and d.get("tier") == 0)
        today = time.strftime("%Y-%m-%d", time.gmtime())
        code, _, _ = http("POST", f"{REST}/rest/v1/bk_daily_usage",
                          [{"user_id": uuid(5), "usage_date": today, "seconds_used": 60}],
                          {**rh(), "Prefer": "resolution=merge-duplicates,return=minimal"})
        check("seed exhausted usage", code in (200, 201, 204), f"{code}")
        s, raw, _ = http("POST", f"{BASE}/api/match",
                         {"excludeId": uuid(5), "tier": 0, "filters": {}}, ck(wallet(5)))
        check("I3 exhausted free user cannot match 403",
              s == 403 and b"free time" in raw.lower(), f"{s} {raw[:80]}")

        # ---------- bkl / leaderboard ----------
        s, raw, _ = http("GET", f"{BASE}/api/bkl-balance", headers=ck(wallet(6)))
        d = json.loads(raw)
        check("H1 bkl balance premium", s == 200 and d.get("balance", 0) >= 10, f"bal={d.get('balance')}")
        s, raw, _ = http("GET", f"{BASE}/api/leaderboard?limit=50")
        d = json.loads(raw)
        check("H2 leaderboard public", s == 200 and isinstance(d.get("leaderboard"), list))
    finally:
        # ---------- cleanup ----------
        ids = ",".join(uuid(i) for i in range(1, 8))
        for col in ("reporter_id", "reported_id"):
            http("DELETE", f"{REST}/rest/v1/bk_reports?{col}=in.({ids})", headers=rh())
        code, _, _ = http("DELETE", f"{REST}/rest/v1/bk_profiles?username=like.ft_user_%25", headers=rh())
        _, raw, _ = http("GET", f"{REST}/rest/v1/bk_profiles?username=like.ft_user_%25",
                         headers={**rh(), "Prefer": "count=exact", "Range": "0-0"})
        check("Z1 cleanup", code in (200, 204) and b"[]" in raw, f"code={code} remaining={raw[:80]}")

    fails = [r for r in results if not r[1]]
    print(f"\n===== {len(results) - len(fails)}/{len(results)} CHECKS PASSED =====")
    if fails:
        print("FAILED:")
        for n, _ in fails:
            print(" -", n)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
