# GETHIRED ACTIONS — RECENT 3 Main Report
**Generated:** 2026-06-26
**Previous ACTIONS:** GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md (BE 6a7755c / FE 41b5920)
**This ACTIONS scope:** Post-V5 deployment hardening session — Firebase credential hardening, SSH deploy key, OG image, Google Search Console, BE catch-up deploy, SSR fixes, ESM Acorn limitation discovery

---

## 1. Executive Summary

ACTIONS RECENT 3 reflects a substantially improved security and deployment posture. Nine items that were blocking or high-risk in V5 are now confirmed CLOSED — including the Firebase credential chain (P0), SSH deploy key (P1), OG image (P1), Google Search Console (P1), SSR real 404 (P1), SSR JSON-LD injection fix, and all subscription leaks.

One new P1 tech-debt risk has been discovered and added to the backlog: the ESM v3.2.25 Acorn limitation that silently breaks production if any developer adds optional chaining (`?.`) or nullish coalescing (`??`) syntax to BE files.

**Current system health: GREEN with one remaining launch blocker (PayMongo webhook secret env var confirmation)**

Production readiness assessment: upgraded from "beta-safe" to **public-launch-ready except for PayMongo webhook secret verification on Linode**.

- P0 count: 0 (Firebase P0 confirmed CLOSED this session)
- P1 count: 4 (1 new ESM tech debt; 3 carried from V5 plus rescoped)
- P2 count: 10 (carried + PM2 ecosystem file added)
- P3 count: 10 (carried from V5)
- Dependabot vulnerabilities: 114 (6 critical, 61 high) — tracked but not primary blocker

---

## 2. Items Closed This Session

| Item | Category | Notes |
|---|---|---|
| **P0-FIREBASE** | Security | `middleware/firebaseApp.js` now uses env-base64 → env-json → ADC → local-file chain; production `.env` on Linode has `FIREBASE_SERVICE_ACCOUNT_BASE64`; old key auto-revoked by Google |
| **P1-SSH-DEPLOY-KEY** | Ops | `gethired-deploy-linode` SSH key added to GitHub; Linode configured; `git pull` now works without PAT |
| **P1-OG-IMAGE** | SEO/Brand | `src/assets/brand/gethired-og-default.png` (1200×630) created; `seo.service.ts` updated |
| **P1-GSC** | SEO | Google Search Console property verified; sitemap submitted |
| **P1-BE-CATCHUP-DEPLOY** | Ops | Linode synced to `a32aa3b`; all prior work now deployed |
| **SSR-REAL-404** | SEO | `job-posts-details.component.ts` uses RESPONSE token; real HTTP 404 on unknown jobs |
| **SSR-JSON-LD** | SEO | `seo.service.ts` uses DOCUMENT token injection (eliminates SSR JSON-LD hydration issues) |
| **SUBSCRIPTION-LEAKS** | FE quality | job-posts-list, banner, public-search subscription leaks fixed |
| **ESM-COMPAT** | BE quality | `?.` replaced with `&&` guards in 3 BE files to restore Acorn compatibility |

Total items closed: **9**

---

## 3. New Risks Added This Session

| Item | Priority | Description |
|---|---|---|
| **P1-ESM-ACORN** | P1 | ESM v3.2.25 bundles Acorn 6/7; cannot parse `?.` or `??`; any dev using modern syntax silently breaks production |
| **P2-PM2-ECOSYSTEM** | P2 | PM2 process list knowledge risk: wrong entry point (`server.js` vs `start.js`) causes `ERR_MODULE_NOT_FOUND`; PM2 ecosystem file needed |
| **P3-DEPENDABOT-114** | P3 | 114 Dependabot vulnerabilities (6 critical, 61 high) confirmed post-deployment; known but unaddressed |

---

## 4. Full Open Backlog Summary

| Priority | Count | Primary Items |
|---|---|---|
| P0 | 0 | — |
| P1 | 4 | ESM Acorn limitation, PayMongo webhook env var, rate limiting, Dependabot critical CVEs |
| P2 | 10 | Pool exhaustion, CSV row cap, SSR verify, company sitemap, hero CTA, SVG CLS, localStorage SSR, candidate singular, PM2 ecosystem, Dependabot high CVEs |
| P3 | 10 | Snackbar assertive, dialog UX, failed-email indicator, toast tests, bcrypt-js, axios 1.x, toast extract, dead log, candidate form guard, mobile table |
| Deferred features | 4 | Messages widget, admin pages, indexing API, programmatic SEO |

---

## 5. Launch Gate Assessment

| Gate | Status | Notes |
|---|---|---|
| Internal demo | **PASS** | No blockers |
| Invite-only beta | **PASS** | No blockers |
| Public launch | **CONDITIONAL PASS** | Verify `PAYMONGO_WEBHOOK_SECRET` env var on Linode; confirm payment webhooks functional; then clear for public launch |

**Recommended final step before public launch announcement:**
`ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"` — must return a non-empty value.

---

## 6. Source Reports Used

- GETHIRED_ACTIONS_RECENT_DEPLOYMENT_REPORT.md (NOTIFY-P2)
- GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md (full QA cycle synthesis)
- GETHIRED_BACKLOG_RECENT_V5.md (25 open items)
- GETHIRED_ACTIONS_RECENT_DEPLOYMENT_BACKLOG.md
- GETHIRED_ACTIONS_RECENT_DEPLOYMENT_LAUNCH_CHECKLIST.md
- V5 implementation logs (employer onboarding, employer flow, applicant completeness)
- Session context from prompt (9 items closed, 3 new risks)

---

## 7. Top 5 Immediate Actions

1. **Verify `PAYMONGO_WEBHOOK_SECRET` on Linode** (P1, XS, 5 min): `ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"` — final remaining payment safety gate
2. **Plan ESM migration** (P1, M): Add PM2 ecosystem file + ESM lint rule blocking `?.`/`??` in BE source as interim protection; plan full ESM migration path
3. **Create PM2 ecosystem file** (P2, S): `ecosystem.config.js` committing `start.js` as entry point; prevents wrong-entry-point restart after reboots
4. **Add rate limiting** (P1, M): Install `express-rate-limit`; tiered limits on auth/write/public-read endpoints — see EXEC-PACK-1
5. **Address Dependabot critical CVEs** (P1, S-M): Review 6 critical alerts; triage each for actual exploitability in the GetHired context; upgrade affected packages

---

## 8. Top 5 Tech-Debt Items

1. **P1-ESM-ACORN**: ESM v3.2.25 / Acorn 6/7 — cannot parse `?.` or `??`; developer trap; migrate to native Node ESM or install Babel transform
2. **P3-BCRYPT-JS**: Replace `bcrypt` (native binaries, fragile on Node 14) with `bcryptjs` (pure JS)
3. **P3-AXIOS-1X**: Upgrade `axios` 0.x → 1.x (CVE exposure + breaking-change housekeeping)
4. **P2-POOL-EXHAUSTION**: DB pool `max: 10` with unlimited concurrent CSV bulk imports; add `p-limit` concurrency cap
5. **P3-TOAST-EXTRACT**: Identical toast decision logic in 3 import-add components; extract shared utility

---

## 9. Recommended First Execution Pack

**EXEC-PACK-PAYMONGO-VERIFY** — 5 minutes, zero risk, unblocks public launch:
```powershell
ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"
```
If the value is present and non-empty: public launch is cleared. If missing: add it to `.env` on Linode and `pm2 restart all`.
