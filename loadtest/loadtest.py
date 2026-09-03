#!/usr/bin/env python3
# =============================================================
# Beediyo Kall — Load Test Harness (250-300 concurrent users)
#
# What it does:
#   1. SEED  — inserts `count` disposable test profiles (test_user_xxx)
#              into Supabase via the service-role REST API.
#   2. LOAD  — simulates concurrent real users against the deployed
#              Next.js API. Each "user" holds a REAL signed session
#              cookie (minted with REQUEST_SIGNING_KEY) and walks the
#              same flows the app does: /api/me -> /api/match (with
#              their tier's filters) -> /api/user-tier -> occasional
#              /api/daily-usage.
#   3. REPORT— prints per-endpoint latency (avg / p95 / p99) + errors.
#   4. CLEAN — ALWAYS removes the seeded test users afterwards
#              (FK cascades clean subscriptions & daily usage).
#
# Requires only the Python standard library. Run from anywhere:
#
#   python loadtest/loadtest.py --env .env.local \
#       --base https://bkl-airdrophubgroups-projects.vercel.app \
#       --users 300 --workers 60 --rounds 2
#
# Optional modes:
#   --mode leaderboard   hammer the public leaderboard endpoint instead
#   --cleanup-only       only delete any leftover test users
#
# SECURITY: keys are read from --env (never printed). Cookies are used
# only in-memory. Never point this at a production you do not own.
# =============================================================

import argparse
import hashlib
import hmac
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ENV_KEYS = {
    "url": "NEXT_PUBLIC_SUPABASE_URL",
    "service": "SUPABASE_SERVICE_ROLE_KEY",
    "signing": "REQUEST_SIGNING_KEY",
}

TEST_PREFIX = "test_user_"


# -------------------------------------------------------------
# Env / config
# -------------------------------------------------------------
def load_env(path):
    vals = {}
    if not path or not os.path.exists(path):
        sys.exit(f"env file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def rest_headers(cfg, prefer=None):
    h = {
        "apikey": cfg["service"],
        "Authorization": f"Bearer {cfg['service']}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def http_json(method, url, cfg, payload=None, headers=None, timeout=25):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, raw, time.perf_counter() - start
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, raw, time.perf_counter() - start
    except Exception as e:  # network etc.
        return -1, str(e).encode(), time.perf_counter() - start


# -------------------------------------------------------------
# Deterministic synthetic users
# -------------------------------------------------------------
def fake_wallet(i):
    # 0x + 40 lowercase hex, unique per index
    return "0x" + f"{0x1000 + i:040x}"


def fake_uuid(i):
    return f"00000000-0000-4000-8000-{i:012d}"


COUNTRIES = ["IN", "US", "GB", "DE", "FR", "JP", "BR", "NG", "MX", "PH"]
GENDERS = ["male", "female", "other"]


def build_profiles(count):
    rows = []
    for i in range(1, count + 1):
        rows.append(
            {
                "id": fake_uuid(i),
                "worldcoin_id": f"test_wc_{i:04d}",
                "wallet": fake_wallet(i),
                "username": f"{TEST_PREFIX}{i:03d}",
                "country": COUNTRIES[i % len(COUNTRIES)],
                "age": 18 + (i % 28),
                "gender": GENDERS[i % len(GENDERS)],
                "onboarded": True,
                "privacy_accepted": True,
            }
        )
    return rows


def build_subscriptions(count):
    rows = []
    now = time.time()
    for i in range(1, count + 1):
        if i % 2 == 0:  # ~50% premium users, spread across tiers
            rows.append(
                {
                    "user_id": fake_uuid(i),
                    "tier": (i % 3) + 1,
                    "starts_at": datetime_iso(now - 86400),
                    "expires_at": datetime_iso(now + 8 * 86400),
                }
            )
    return rows


def datetime_iso(epoch):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(epoch))


# -------------------------------------------------------------
# Seeding via Supabase REST
# -------------------------------------------------------------
def seed(cfg, count):
    base = cfg["url"].rstrip("/")
    h = rest_headers(cfg, prefer="resolution=merge-duplicates,return=minimal")

    profiles = build_profiles(count)
    for start in range(0, len(profiles), 200):  # chunked inserts
        chunk = profiles[start : start + 200]
        code, raw, _ = http_json(
            "POST", f"{base}/rest/v1/bk_profiles", cfg, chunk, h
        )
        if code not in (200, 201, 204):
            sys.exit(f"SEED profiles failed HTTP {code}: {raw[:300]}")

    subs = build_subscriptions(count)
    if subs:
        for start in range(0, len(subs), 200):
            chunk = subs[start : start + 200]
            code, raw, _ = http_json(
                "POST", f"{base}/rest/v1/bk_subscriptions", cfg, chunk, h
            )
            if code not in (200, 201, 204):
                sys.exit(f"SEED subscriptions failed HTTP {code}: {raw[:300]}")
    print(f"SEED: {count} profiles + {len(subs)} subscriptions inserted.")


def cleanup(cfg):
    base = cfg["url"].rstrip("/")
    h = rest_headers(cfg)
    q = urllib.parse.quote(f"{TEST_PREFIX}%")
    url = f"{base}/rest/v1/bk_profiles?username=like.{q}"
    code, raw, _ = http_json("DELETE", url, cfg, headers=h)
    # count what remains (Content-Range header via Prefer count=exact)
    h2 = dict(h)
    h2["Prefer"] = "count=exact"
    h2["Range"] = "0-0"
    _, raw2, _ = http_json("GET", url, cfg, headers=h2)
    remain = raw2.decode(errors="ignore").strip() or "[]"
    print(f"CLEANUP: delete HTTP {code}; remaining test rows: {remain}")
    return code in (200, 204)


# -------------------------------------------------------------
# Session cookie (same scheme as src/lib/session.ts)
# -------------------------------------------------------------
def mint_cookie(cfg, wallet):
    sig = hmac.new(cfg["signing"].encode(), wallet.encode(), hashlib.sha256).hexdigest()
    return f"{wallet}.{sig}"


# -------------------------------------------------------------
# Simulated user behaviour
# -------------------------------------------------------------
def simulate_user(args, cfg, user_idx, results):
    i = user_idx
    wallet = fake_wallet(i)
    uuid = fake_uuid(i)
    tier = (i % 3) + 1 if i % 2 == 0 else 0  # same split as seed
    cookie = mint_cookie(cfg, wallet)
    base = args.base.rstrip("/")
    headers = {
        "Cookie": f"bk_session={cookie}",
        "Content-Type": "application/json",
    }

    # Rounds of realistic app traffic
    for r in range(args.rounds):
        # 1. App boot -> profile fetch
        code, _, lat = http_json("GET", f"{base}/api/me", cfg, headers=headers)
        results.append(("GET /api/me", code, lat))

        # 2. Match request with the tier's own filters
        filters = {"gender": "any", "country": "any", "ageMin": 18, "ageMax": 65}
        if tier >= 2:
            filters["gender"] = GENDERS[(i + r) % 2] if (i + r) % 2 < 2 else "male"
        if tier >= 3:
            filters["country"] = COUNTRIES[(i + r) % len(COUNTRIES)]
        body = {"excludeId": uuid, "tier": tier, "filters": filters}
        code, _, lat = http_json(
            "POST", f"{base}/api/match", cfg, body, headers
        )
        results.append(("POST /api/match", code, lat))

        # 3. Peer badge check
        code, _, lat = http_json(
            "GET", f"{base}/api/user-tier?userId={uuid}", cfg, headers=headers
        )
        results.append(("GET /api/user-tier", code, lat))

        # 4. Free users log a 5s chunk every other round
        if tier == 0 and r % 2 == 1:
            code, _, lat = http_json(
                "POST",
                f"{base}/api/daily-usage",
                cfg,
                {"seconds": 5},
                headers,
            )
            results.append(("POST /api/daily-usage", code, lat))

        time.sleep(random.uniform(0.05, 0.3))  # think-time


def hammer_leaderboard(args, cfg, results):
    base = args.base.rstrip("/")

    def worker(_):
        for _ in range(args.rounds):
            code, _, lat = http_json(
                "GET", f"{base}/api/leaderboard?limit=50", cfg
            )
            results.append(("GET /api/leaderboard", code, lat))
            time.sleep(random.uniform(0.01, 0.05))

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(worker, range(args.workers)))


# -------------------------------------------------------------
# Reporting
# -------------------------------------------------------------
def report(results, duration):
    if not results:
        print("No requests recorded.")
        return
    by_ep = {}
    for ep, code, lat in results:
        by_ep.setdefault(ep, []).append((code, lat))

    print(f"\n{'='*60}\nSUMMARY — {len(results)} requests in {duration:.1f}s "
          f"({len(results)/max(duration,0.01):.1f} req/s)")
    print(f"{'endpoint':<22}{'reqs':>6}{'errors':>8}{'avg ms':>9}{'p95 ms':>9}{'p99 ms':>9}")
    for ep in sorted(by_ep):
        rows = by_ep[ep]
        codes = [c for c, _ in rows]
        lats = sorted(l for _, l in rows)
        errs = sum(1 for c in codes if c >= 400 or c == -1)
        n = len(lats)
        avg = sum(lats) / n * 1000
        p95 = lats[min(n - 1, int(n * 0.95))] * 1000
        p99 = lats[min(n - 1, int(n * 0.99))] * 1000
        flag = "  <-- FAILING" if errs > 0 else ""
        print(f"{ep:<22}{n:>6}{errs:>8}{avg:>9.0f}{p95:>9.0f}{p99:>9.0f}{flag}")

    # error code breakdown
    codes = [c for _, c, _ in results]
    err_codes = sorted({c for c in codes if c >= 400 or c == -1})
    if err_codes:
        print("\nError codes seen:")
        for c in err_codes:
            print(f"  {c}: {sum(1 for x in codes if x == c)}")
    else:
        print("\nZero HTTP errors.")


# -------------------------------------------------------------
# main
# -------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="Beediyo Kall load test")
    p.add_argument("--env", default=".env.local", help="path to env file with Supabase + signing keys")
    p.add_argument("--base", required=True, help="deployed app base URL, e.g. https://app.example.vercel.app")
    p.add_argument("--users", type=int, default=250, help="number of simulated users (default 250)")
    p.add_argument("--workers", type=int, default=50, help="concurrent workers (default 50)")
    p.add_argument("--rounds", type=int, default=2, help="rounds of traffic per user (default 2)")
    p.add_argument("--mode", choices=["app", "leaderboard"], default="app")
    p.add_argument("--no-seed", dest="seed", action="store_false", help="skip seeding (rows must already exist)")
    p.add_argument("--cleanup-only", action="store_true")
    args = p.parse_args()

    vals = load_env(args.env)
    cfg = {k: vals.get(envk, "") for k, envk in ENV_KEYS.items()}
    if not cfg["service"] or not cfg["signing"] or not cfg["url"]:
        sys.exit("Missing Supabase service key / URL / REQUEST_SIGNING_KEY in env file.")

    if args.cleanup_only:
        cleanup(cfg)
        return

    t0 = time.time()
    try:
        if args.mode == "app" and args.seed:
            seed(cfg, args.users)

        results = []
        if args.mode == "leaderboard":
            hammer_leaderboard(args, cfg, results)
        else:
            with ThreadPoolExecutor(max_workers=args.workers) as ex:
                # Deterministic wall: users indexed 1..N
                list(ex.map(lambda u: simulate_user(args, cfg, u, results),
                            range(1, args.users + 1)))
        report(results, time.time() - t0)
    finally:
        if args.mode == "app":
            cleanup(cfg)


if __name__ == "__main__":
    main()
