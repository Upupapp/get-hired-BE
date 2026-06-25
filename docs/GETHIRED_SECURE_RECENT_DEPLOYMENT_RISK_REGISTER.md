# GetHired — Security Risk Register
**Last updated:** 2026-06-26 (NOTIFY-P2 audit)
**Previous version:** 2026-06-24

---

## P0 — Critical (Must fix before launch / must be externally mitigated)

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| P0-1 | PayMongo webhook HMAC verification missing | `routes/paymentRoute.js`, webhook handler | OPEN | Endpoint accepts any event without signature check. Attacker can forge payment confirmations. No NOTIFY-P2 impact. |
| P0-2 | Firebase service account key in git history | git history (committed secret) | OPEN — EXTERNAL ACTION REQUIRED | Cannot be fixed by code change alone. Requires: (1) rotate the key in Firebase Console, (2) add secret to `.gitignore`, (3) consider git history scrub. No NOTIFY-P2 impact. |

---

## P1 — High (Fix before public launch)

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| P1-1 | CORS wildcard (`app.use(cors())`) | `app.js` or server entry | OPEN | Allows any origin. Awaiting domain list from user to configure allowed origins. No NOTIFY-P2 impact. |
| P1-2 | `verifyAuth.js` leaks raw Firebase error messages to clients | `middleware/verifyAuth.js` | PARTIALLY OPEN | Generic error path still returns some internal error context. Low exploitability but information disclosure risk. |
| P1-3 | `createGroup`/`updateGroup` broken `forEach(async)` race condition | `controllers/contactsController.js` lines 221-239, 269-283 | OPEN | Race condition can cause "headers already sent" Express errors + partial group creation with no failure response. DoS/data integrity risk under concurrent load. Not a secret leak but availability/integrity concern. Not fixed in NOTIFY-P2 (only `multipleContact`/`multipleCandidate` were fixed). |

---

## Medium (M) — Should fix before scaling

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| M2-1 | `checkEmailIfExistInCandidate` global scope (cross-tenant oracle) | `services/candidate.service.js` line 57 | OPEN — pre-existing, confirmed 2026-06-26 | SQL has no company_id filter. An employer can determine if any email is in the platform's candidates table globally. NOTIFY-P2 made this more visible via structured status. Fix documented in FIX_LOG. |

---

## Fixed / Closed

| ID | Title | Fixed in | Notes |
|---|---|---|---|
| F-1 | BOLA on createContact (companyId from body) | QA8 FIX-7 | getUserCompany from JWT now used |
| F-2 | BOLA on multipleContact (companyId from body) | QA8 FIX-7 | JWT-derived companyId overrides body |
| F-3 | No auth middleware on contact routes | STITCH GH-ACT-011 | verifyAuth added to all contact routes |
| F-4 | No auth middleware on candidate routes | STITCH GH-ACT-011 | verifyAuth added to all candidate routes |
| F-5 | GET /job/details anonymous access missing auth guard | SEC-02 | optionalVerifyAuth added |
| F-6 | GET /job/sharelink anonymous access missing auth guard | SEC-02 | optionalVerifyAuth added |
| F-7 | GET /job/applicants — no auth, exposed full applicant PII | SECURE pass | verifyAuth added; ownership check in controller |
| F-8 | Hardcoded password `p@ssw0rd1111` emailed to invited users | STITCH GH-ACT-004 | Replaced with random password + Firebase reset link |
| F-9 | deleteContact/deleteGroup — no ownership check | QA7 FIX-5 | Ownership folded into DELETE WHERE company_id=$2 |
| F-10 | updateContact/updateGroup — no ownership check | QA7 FIX-5 | Ownership folded into UPDATE WHERE company_id=$2 |
| F-11 | BOLA on list/grouplist (companyId from query param) | QA9 FIX-12 | getUserCompany from JWT |
| F-12 | BOLA on createCandidate/multipleCandidate | QA10 FIX-5 | getUserCompany from JWT, body companyId overridden |
| F-13 | forEach(async) race in multipleContact/multipleCandidate | NOTIFY-P2 | Replaced with Promise.allSettled |
| F-14 | SQL injection in deleteContact via string interpolation | STITCH fix | Parameterized query with $1/$2 |

---

## Low / Informational

| ID | Title | Status | Notes |
|---|---|---|---|
| L-1 | `console.log(dbResponse)` in candidateList logs full list to server | OPEN | Pre-existing; cosmetic; no external exposure |
| L-2 | FE `console.log(data)` in import-add-user constructor | OPEN | Browser-side only; cosmetic |
| L-3 | No rate limiting anywhere on write endpoints | OPEN | Known gap from prior sessions; flagged for future SECURE pass |
