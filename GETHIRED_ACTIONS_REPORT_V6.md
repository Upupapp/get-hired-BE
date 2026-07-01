# GETHIRED ACTIONS REPORT — V6
**Date:** 2026-07-01 | **Baseline:** GETHIRED_ACTIONS_REPORT_RECENT_V5.md + V6 context updates
**FE HEAD (last known):** e828f7b | **BE HEAD (last known):** 98b4bfb

---

## Executive Summary

V6 incorporates all V5 findings plus six status updates from the 2026-07-01 session:

| Update | Detail |
|---|---|
| LinkedIn OIDC COMPLETE | LinkedIn OAuth sign-in is shipped and wired end-to-end |
| Company setup modal COMPLETE | World-class activation modal is shipped |
| Sign-out fix COMPLETE | Employer panel sign-out works correctly |
| Cert/license feature COMPLETE | Job cert/license requirements feature is shipped |
| Google OAuth COMPLETE | New OAuth web client created and deployed (ACT-001/002/003 closed) |
| PayMongo webhook verification OPEN | Remains P0 — env var must be confirmed and real secret verified on Linode |

Five new actions have been added (GH-ACT-088 through GH-ACT-092).

**Current system health: GREEN with 1 security P0 and 1 ops P1**

---

## V5 Action Status Roll-Up

| V5 ID | Title | V6 Status |
|---|---|---|
| ACT-001 | Create new OAuth web client | CLOSED — Google Auth verified complete |
| ACT-002 | Update environment files with new Client ID | CLOSED — Google Auth verified complete |
| ACT-003 | Deploy requestUri fix to Linode | CLOSED — deployed (BE=98b4bfb) |
| ACT-004 | Wire ProfileQualityService into Applicant Dashboard | OPEN — P1 |
| ACT-005 | Add JobPosting JSON-LD to /jobs/:id | OPEN — P1 |
| ACT-006 | PayMongo Webhook Signature Verification (code) | CLOSED — code shipped (commit 97cd657); env var P1 open |
| ACT-007 | CORS Allowlist | CLOSED — shipped (commit d4e34c7) |
| ACT-008 | Add noindex to Role Classification Page | OPEN — P2 |
| ACT-009 | Messages Widget is_read + All-Threads Endpoint | OPEN — P2 deferred |
| ACT-010 | Add provider column to user_credentials | OPEN — P2 |
| ACT-011 | Google One Tap (FedCM) | OPEN — P2 (defer until OAuth QA complete) |
| ACT-012 | Easy Job Post Extraction Per-User Rate Limit | OPEN — P1 |
| ACT-013 | Git History Purge (Secrets) | OPEN — P0 user action |
| ACT-014 | CV Doctor FE Wiring | OPEN — P2 |
| ACT-015 | Applicant Profile Grading UI | OPEN — P2 |
| ACT-016 | Canonical URL Meta + Sitemap.xml | OPEN — P2 |
| ACT-017 | Node.js 14 Migration Plan | OPEN — P2 |
| ACT-018 | Automated Test Suite for Critical Paths | OPEN — P2 |
| ACT-019 | Video CV Public Display | OPEN — P3 |
| ACT-020 | Job Seeker Match Score Wiring | OPEN — P3 |

---

## New V6 Actions Added

| ID | Title | Priority | Status |
|---|---|---|---|
| GH-ACT-088 | LinkedIn Unlink UI — Account Settings Component | P2 | OPEN |
| GH-ACT-089 | LinkedIn Error Page Polish | P2 | OPEN |
| GH-ACT-090 | Modal Acknowledgement Persistence to DB | P3 | OPEN |
| GH-ACT-091 | PayMongo Webhook Signing Secret — Linode Env Var Confirmation | P0 | OPEN |
| GH-ACT-092 | Google One Tap (FedCM) — Deferred P2 | P2 | OPEN (matches ACT-011, formalized with full schema) |

Note: GH-ACT-092 formalizes ACT-011 under the sequential V6 ID scheme. Both refer to the same feature.

---

## Completed Since V5

1. LinkedIn OIDC (sign-in, callback, role routing) — COMPLETE
2. Company setup success modal (world-class activation) — COMPLETE
3. Employer panel sign-out — COMPLETE
4. Job cert/license requirements feature — COMPLETE
5. Google OAuth new web client + env update + requestUri deploy — COMPLETE (ACT-001/002/003)
6. CORS allowlist — COMPLETE (prior sprint, confirmed closed)
7. PayMongo HMAC code — COMPLETE (prior sprint, confirmed closed)

---

## Launch Gate Assessment V6

| Gate | Status | Notes |
|---|---|---|
| No P0 in code | CONDITIONAL PASS | P0-FIREBASE is user-action (key rotation); GH-ACT-091 is ops action |
| Google OAuth | PASS | New client created, deployed, verified |
| LinkedIn OAuth | PASS | OIDC fully wired |
| Security: BOLA guards | PASS | All endpoints use JWT-derived companyId |
| Security: Auth middleware | PASS | All write routes have verifyAuth |
| Security: PayMongo HMAC code | PASS | Shipped 97cd657 |
| Security: PayMongo env var | FAIL | GH-ACT-091 — must confirm on Linode |
| Security: CORS | PASS | Scoped to app URL |
| Security: Firebase key in git | FAIL | P0-FIREBASE / ACT-013 — user action required |
| Rate limiting (global) | PASS | 4-tier limiter confirmed present |
| Cert/license feature | PASS | Shipped and complete |
| Company setup modal | PASS | Shipped and complete |
| OG image | FAIL | Missing asset — P1-OG-IMAGE |
| Mobile: public pages | PASS | All blocks removed |
| LinkedIn unlink UI | OPEN | GH-ACT-088 — not blocking launch |

**Verdict: BLOCKED FOR PUBLIC LAUNCH**
Blockers: P0-FIREBASE (ACT-013) + PayMongo env var (GH-ACT-091) + OG image (P1-OG-IMAGE)

---

## Source Reports Used

- GETHIRED_ACTIONS_REPORT_RECENT_V5.md (primary baseline)
- docs/GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
- docs/GETHIRED_BACKLOG_RECENT_V5.md
- docs/GETHIRED_SECURE_RISK_REGISTER_RECENT_V5.md
- V6 context updates (session 2026-07-01)
