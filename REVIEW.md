# Beediyo Kall — World App Review Submission Pack

Everything you fill in on https://developer.world.org (dev portal) should match
the items below. The app code already follows the guidelines on
`docs.world.org/mini-apps/guidelines/app-guidelines` and
`docs.world.org/mini-apps/guidelines/policy`; these are the portal-side
fields + how the review team will test your app.

---

## 1. Portal submission fields (copy-paste ready)

| Field | Value to enter |
|---|---|
| **App name** | `Beediyo Kall` |
| **Short description (under 25 words)** | `Random video chat. Meet new people around the world face-to-face — your way.` |
| **Category** | Social (or Communication / Lifestyle if offered) |
| **App URL** | `https://bkl-airdrophubgroups-projects.vercel.app` |
| **Support email** | `airdrophubgroup@gmail.com` |
| **Privacy policy URL** | `https://bkl-airdrophubgroups-projects.vercel.app/privacy` |
| **Terms URL** | `https://bkl-airdrophubgroups-projects.vercel.app/terms` |
| **Icon** | dark square icon, `public/icon-512.png` (non-white background ✓) |
| **Content card** | 345×240 px, PNG @3x, no border radius, keep the bottom 94 px empty of important content, no text baked into the image |
| **Maturity / rating** | 18+ (Mature) — the app enforces an 18+ age gate |
| **Permissions** | Enable **`pay`** (App Settings → Permissions) — required for pass purchases |
| **App mode** | Use **Sandbox** while testing the purchase flow, then Production for the real submission |

Full description (long field) — plain, human tone, no token/earning claims:

> Beediyo Kall is a random video chat app. With a small weekly pass paid in
> WLD you get unlimited calls and your own filters — by gender, country or
> age. New users get one free minute of calls every day to try it out.
> Passes also include BKL reward points that never expire. Everything is
> anonymous: you always appear by your World App username, never your wallet
> address.

Do **not** write anything about a future coin, token sale, investment, or
"earn money" in the description, screenshots or support replies.

## 2. What the review team checks (and our status)

- [x] **Live MiniKit integration** — sign-in uses MiniKit `walletAuth` (SIWE)
      and pass purchases use MiniKit `pay`; payment is verified server-side
      with the Worldcoin Developer API (`DEV_PORTAL_API_KEY`).
- [x] **Final version, not a demo** — the home "animation" is labelled
      "How it works" (an explainer), not a demo badge.
- [x] **No infinite loading** — matching auto-retries a few times, then shows
      "No one online right now — tap Next to try again".
- [x] **Privacy consent before data use** — first-run consent gate with
      camera/mic, profile and payment explanations + links to /privacy and
      /terms.
- [x] **Usernames, never wallets** — wallet addresses are only stored
      server-side and never shown to other users.
- [x] **No token pre-sale / yield claims** — BKL is framed as in-app reward
      points with "no cash value" disclaimers.
- [x] **18+ gate** — age is asked once and locked.
- [x] **Moderation path** — Report button in every call; reports are stored
      in the database (reviews go to the support email).
- [x] **Support contact** — in-app support button opens
      mailto:airdrophubgroup@gmail.com and the consent footer shows it too.
- [x] **HTTPS + security headers** — CSP, HSTS, X-Frame-Options DENY are live.
- [x] **Works under denial** — if camera/mic is denied the call continues in
      avatar mode instead of hanging.

## 3. Before you press "Submit"

1. Create a **Sandbox app** in the dev portal, put its App ID in a sandbox
   deploy (or temporarily swap `NEXT_PUBLIC_WORLDCOIN_APP_ID`) and test the
   full flow — sign in → onboarding → buy a pass with test WLD → start a call.
2. Make sure **two phones/two World App accounts** are available: matching
   needs another onboarded user to find. With a single account the app will
   politely stop searching (that is expected behaviour).
3. Test camera permission **allow and deny** on both iOS and Android.
4. Confirm **pay** is enabled on the app being submitted.
5. Keep `airdrophubgroup@gmail.com` monitored — that is the support + review
   contact.

## 4. If rejected

The review email states the reason. Common fixes to have ready:
- Payment flow untestable → ensure sandbox mode is on and `pay` is enabled.
- "App looks like a demo" → remove anything labelled demo/preview/beta.
- Policy concern about rewards → keep all BKL copy to "reward points,
  no cash value" (this repo already does).
- Matching needs another user → provide two test accounts in your notes, or
  ask the reviewer to use the app from two devices.
