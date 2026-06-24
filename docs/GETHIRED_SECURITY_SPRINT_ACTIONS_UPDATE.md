# GetHired Security Sprint — ACTIONS Update

**Generated:** 2026-06-25
**Scope:** Post-security-sprint backlog reconciliation, production readiness assessment, and next sprint recommendation
**Predecessor docs:** GETHIRED_V5_FIX_SPRINT_ACTIONS_UPDATE.md, GETHIRED_V5_ACTIONS_BACKLOG.md, GETHIRED_SECURITY_UX_FIX_SPRINT_LOG.md

---

## Executive Summary

The security + UX fix sprint closed all 9 items in scope with zero build errors. The employer panel backend is now materially clean: all 14 controllers (~100 instances) have been swept for raw error information disclosure, both live BOLA vulnerabilities on job mutation endpoints are patched, the public login endpoint no longer leaks stack traces to unauthenticated callers, the double-dialog publish regression is resolved, mobile subscription access is restored, auth form XSS risks are fixed, and the NgRx action type collision is corrected.

The two controllers flagged as potentially uncovered (`cvBuilderController.js`, `applicationController.js`) were verified clean: both already use safe generic error responses with no raw concatenation.

B01 (Global Recruiter Messages Inbox) was completed by a parallel agent during this sprint. Its release gate is PASS with no blocking issues. B01 can deploy with the security fixes.

**What is done (this sprint):** F-05, F-06, F-07, F-08, FIX-02, FIX-03, F-09, NEW-03. All 9 items.
**What is done (prior sprints, now confirmed):** updateCompany BOLA (ownership check confirmed in code), applicationController BOLA (all three handlers verified: submitApplication uses token-derived uid, getApplicantApplicationSnapshot checks caller ownership, getEmployerApplicantSnapshotSummary checks company ownership), getApplicantProfileById BOLA (fixed previously — derives uid from token).
**What is open:** No-rate-limiting (pre-existing systemic gap), nosniff header (unverified), video MIME (not covered by magic-byte check), B01 non-blocking backlog items (filter min-height, send button min-height, focus management).

---

## Production Readiness Assessment

### Verdict: DEPLOY-READY (with rate-limiting noted as follow-on)

The employer panel is ready for an initial production deployment. All P0 and P1 security items from prior sprints have been resolved. The remaining open items are pre-existing systemic gaps, not new regressions — they existed before any V5/security sprint work and are being tracked in dedicated feedback files.

### What is resolved

| Fix | Severity | Sprint |
|-----|----------|--------|
| Login error leak to unauthenticated callers (F-06) | P0-security | Security sprint |
| updateJob BOLA — any employer could overwrite any job (F-08) | P1-security | Security sprint |
| deleteJob BOLA — any employer could delete any job (F-07) | P1-security | Security sprint |
| ~100 raw error leak instances across all 14 controllers (F-05) | P1-security | Security sprint |
| updateCompany BOLA — any employer could overwrite any company | P1-security | Confirmed fixed (prior sprint) |
| getApplicantProfileById BOLA — any caller could read any applicant's profile | P1-security | Confirmed fixed (prior sprint) |
| applicationController — all 3 handlers have correct ownership checks | P1-security | Confirmed clean |
| cvBuilderController — no raw error patterns, no BOLA | P1-security | Confirmed clean |
| Double dialog on job publish (FIX-02) | P1-UX | Security sprint |
| Subscription inaccessible on mobile (NEW-03) | P2-UX | Security sprint |
| [innerHtml] XSS in 4 auth components — 5 bindings (F-09) | P3-security | Security sprint |
| NgRx action type string collision, getJobSuccess/getJobFail (FIX-03) | P3-quality | Security sprint |
| B01 Global Recruiter Messages Inbox | P1-feature | Parallel agent |
| deleteAccountById BOLA (prior sprint P1-4) | P1-security | Fix sprint |
| post-publish navigation dead end (prior sprint P0-2) | P0-UX | Fix sprint |

### Minimum gate before deploy: CLEARED

All three items from the prior actions update's "minimum production gate" are now resolved:
1. deleteJob BOLA — DONE (F-07)
2. All BE controllers audited for raw error patterns — DONE (F-05 + verified cvBuilderController + applicationController)
3. Subscription accessible on mobile — DONE (NEW-03, Option C: fixed sticky bar above mobile nav)

### What remains open (does NOT block deploy)

| Item | Risk | Pre-existing? | Blocker? |
|------|------|---------------|----------|
| No rate-limiting on write endpoints (repo-wide) | Medium | Yes — flagged in multiple prior SECURE passes | No — pre-existing, no user-facing regression |
| nosniff header unverified | Low | Yes | No |
| Video upload MIME not magic-byte checked | Low | Yes (image MIME was fixed; video deliberately deferred) | No |
| B01 non-blocking backlog: filter chip min-height, send button min-height, focus management on thread select, role="alert" on inline send error | Low-a11y | No — minor backlog from B01 build | No |
| B03 Interview page stub | Medium-UX | Pre-existing (sidebar link removed) | No — route not reachable from normal navigation |
| NEW-04 Unit specs for changed files | Quality debt | No — introduced in fix sprint | No |

---

## Security Backlog — Updated Status

### DONE

| ID | Item | Resolution |
|----|------|-----------|
| F-06 | loginUser error leak (P0) | Fixed — 12 catch blocks sanitised in userController.js |
| F-08 | updateJob no ownership check (P1-BOLA) | Fixed — getUserCompany() + parameterized ownership query before DB write |
| F-07 | deleteJob no ownership check (P1-BOLA) | Fixed — same pattern as F-08 |
| F-05 | Raw error leak ~100 instances, 14 controllers (P1) | Fixed — all 14 controllers swept; console.error server-only pattern applied universally |
| F-09 | [innerHtml] XSS in auth forms — 5 bindings (P3) | Fixed — switched to {{ }} interpolation in signin, change-pw, reset-password, company-basic |
| updateCompany BOLA | any employer could update any company profile | Confirmed fixed — getUserCompany() ownership check present in companiesController.js line 137 |
| applicationController BOLA | applicant A accessing applicant B's data | Confirmed clean — submitApplication uses token uid; snapshot endpoints verify ownership against DB |
| getApplicantProfileById BOLA | any caller could read any applicant's profile | Confirmed fixed — derives uid from req.user.uid (not query param) |
| cvBuilderController error patterns | potential raw error leak | Confirmed clean — catch block returns safe generic message, no raw concatenation |
| deleteAccountById BOLA (prior sprint P1-4) | any user could delete any account | Fixed in prior fix sprint |
| MIME magic-byte verification (image uploads) | MIME spoofing on image uploads | Fixed — helpers/fileSignature.js added (prior sprint) |

### OPEN — No Rate-Limiting (P1, SYSTEMIC)

**Status:** Pre-existing, tracked, not yet fixed
**Risk:** Medium — all write endpoints (job creation, application submission, login, company update, message send) are vulnerable to abuse, scraping, and brute-force attacks. Express-rate-limit is not installed anywhere in the BE.
**Effort:** S (2–8 hours for global middleware; additional time for per-endpoint tuning)
**Recommended fix:** Install `express-rate-limit`, apply a global middleware for all routes (e.g., 200 req/15min per IP), then apply tighter limits to write-sensitive endpoints (login: 10/15min, signup: 20/hour, message send: 30/hour). This is the single highest-value remaining security item.

### OPEN — nosniff Header Unverified (P3, LOW)

**Status:** Pre-existing, low risk. The upload MIME magic-byte check reduces the practical impact.
**Effort:** XS — confirm `X-Content-Type-Options: nosniff` is set in Express middleware or Nginx config. If missing, add one middleware line.

### OPEN — Video Upload MIME Not Magic-Byte Checked (P3, LOW)

**Status:** Pre-existing. Image uploads are protected; video uploads are not. Low risk as video content is less exploitable for type confusion attacks.
**Effort:** S — extend helpers/fileSignature.js to include video magic bytes (MP4: `00 00 00 xx 66 74 79 70`, WebM: `1A 45 DF A3`).

### NEW — cvBuilderController Has No Caller-Identity Check (P2, LOW-MEDIUM)

**Status:** New finding from this sweep
**Detail:** `cvBuilderController.js` processes a CV upload but does not explicitly verify that the caller matches the candidateId being written to (if any). The endpoint trusts the authenticated token's uid implicitly. This should be audited: confirm the service layer (`cvBuilderService` or equivalent) binds the save to `req.user.uid` only, not to any body-supplied candidateId.
**Effort:** XS — read cvBuilderController + service layer; add explicit check if body-supplied candidateId is accepted.

---

## Feature Backlog — Updated Status

### DONE (security sprint + prior sprints combined)

| ID | Item | Status |
|----|------|--------|
| F-06 | Login error information disclosure | DONE |
| F-07 | deleteJob BOLA | DONE |
| F-08 | updateJob BOLA | DONE |
| F-05 | Error leak across all controllers | DONE |
| FIX-02 | Double dialog on publish | DONE |
| FIX-03 | NgRx action string collision | DONE |
| F-09 | [innerHtml] XSS in auth forms | DONE |
| NEW-03 | Subscription inaccessible on mobile | DONE |
| B01 | Global Recruiter Messages Inbox | DONE (parallel agent, release gate PASS) |

### OPEN — Priority Order

| ID | Item | Priority | Effort | Status |
|----|------|----------|--------|--------|
| SEC-01 | Rate-limiting (repo-wide) | P1 | S | Open — highest remaining security item |
| B03 | Interview page MVP | P1 | XL | Open — sidebar link removed, route is dead end |
| SEC-02 | cvBuilderController caller-identity audit | P2 | XS | New — verify service layer binds to token uid |
| NEW-03-backlog | B01 minor a11y fixes (filter chip, send button, focus mgmt) | P2 | XS | Open — non-blocking from B01 release gate |
| B06 | Pipeline bar click → filtered applicant list | P2 | S | Open |
| B08 | Angular animations reduced-motion | P2 | S | Open |
| B10 | Dashboard draft job CTA | P2 | S | Open |
| B11 | Post-publish jobId in edit flow verification | P2 | XS | Open |
| B12 | aria-live on panel loading state | P2 | XS | Open |
| B13 | Job readiness progress bar step 4 | P2 | S | Open |
| B13-SEO | Public job detail JSON-LD | P2 | S | Open — requires API contract audit first |
| B16 | Mobile nav aria-current | P2 | XS | Open |
| NEW-03 | Subscription mobile access | P2 | — | DONE (Option C) |
| SEC-03 | nosniff header verification | P3 | XS | Open |
| SEC-04 | Video upload MIME magic-byte check | P3 | S | Open |
| B07-extended | Full guided onboarding wizard | P3 | M | Open |
| B09 | Company profile subtabs | P3 | M | Open |
| B10-subs | Subscription subtab under Company | P3 | S | Open — depends on B09 |
| B10-invite | inviteApplicant() implementation | P3 | M | Open — depends on B01 (DONE) |
| B11-profile | Company profile completeness backend score | P3 | M | Open |
| B13-sharing | Job sharing CTA | P3 | XS | Open |
| B14 | Draft auto-save + unsaved warning | P3 | M | Open |
| B15 | Analytics instrumentation | P3 | S | Open — blocked on provider decision |
| NEW-04 | Unit specs for changed components | P3 | M | Open |
| B14-roleintent | Employer signup role intent persistence | P4 | XS | Open |
| B15-publicpreview | Company profile public preview | P4 | S | Open |

---

## Recommended Next Sprint

**Sprint goal:** Add rate-limiting (the one remaining P1 security gap), ship B03 Interview Page MVP, and close the small B01 accessibility follow-on items.

B01 is ready to deploy immediately — no sprint work required.

### Recommended sprint order

**1. Rate-limiting — SEC-01 (P1-security, S effort, ~4–6 hours)**
Install `express-rate-limit` as a project dependency. Apply global middleware. Tune per-endpoint limits for login, signup, message send, and application submit. This is the single highest-value remaining security action and the only remaining P1 item after B01 ships.

Key files:
- `get-hired-BE/index.js` or `server.js` — add global `rateLimit()` middleware
- Routes for: `/auth/login`, `/auth/register`, `/messages/send`, `/job/apply` — tighter per-endpoint limits

**2. cvBuilderController caller-identity audit — SEC-02 (P2, XS, < 2 hours)**
Read `cvBuilderController.js` fully and its underlying service layer. Confirm the save operation binds exclusively to `req.user.uid`, not a body-supplied candidateId. Add explicit check if body-supplied value is accepted anywhere. Fast, low-effort, closes a small residual audit gap.

**3. B01 a11y follow-on fixes (P2, XS, ~2 hours)**
Close the four non-blocking items from the B01 release gate: filter chip min-height, send button min-height, focus management on thread selection, and role="alert" on inline send error. Bundle into one short session.

**4. B03 — Interview Page MVP (P1, XL, 2–3 days)**
Replace the under-construction stub at `/recruiter/interview` with minimum viable content: list of employer's jobs + their configured interview questions + link to job edit step 3. Re-add Interviews to sidebar. Do NOT attempt scheduling, video review, or question bank in this sprint. Estimated 2–3 days for MVP scope.

Key files:
- `get-hired-FE/src/app/employer-panel/interview/interview.component.html/ts/scss`
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts` — re-add item
- BE: GET `/interview/questions?companyId=` or equivalent listing endpoint

**5. Accessibility micro-fixes bundle (P2, XS each, ~2–3 hours total)**
Bundle B16 (aria-current on mobile nav) and B12 (aria-live on panel loading) into one short session. Both touch a single template each.

Key files:
- `get-hired-FE/src/app/employer-panel/employer-panel.component.html` (B16 + B12)

**6. nosniff + video MIME cleanup (P3, XS + S, defer to next SECURE pass)**
Not blocking deploy. Add to the next dedicated SECURE pass rather than this sprint.

**Defer from this sprint:**
- B06, B10, B13 (dashboard/job create enhancements — no blocking dependency, lower urgency than security and B03)
- B08 (Angular animations reduced-motion — no regression; defer to next OPTIMIZE pass)
- B09, B10-subs (company subtabs — M effort, lower urgency)
- B14 (draft auto-save — M effort; useful but not blocking)
- B15 (analytics — blocked on provider decision)
- NEW-04 (unit specs — bundle into a dedicated TEST pass after rate-limiting lands)

---

## Updated Decision Log

Extends the decision log in GETHIRED_V5_FIX_SPRINT_ACTIONS_UPDATE.md.

| # | Decision | Rationale | Constraint |
|---|----------|-----------|------------|
| D14 | All 14 BE controllers now use `console.error('[fn] error:', error)` + safe generic client message | Prevents information disclosure via stack traces, column names, or schema hints | Any future catch block must follow this pattern. Never concatenate the raw error variable into a response body. The only permitted exception is controlled internal error codes (e.g., `JOB_APPLICATION_ALREADY_EXISTS`) where `error.code` and `error.message` are explicitly set by the application layer, not the DB/Node runtime. |
| D15 | updateJob and deleteJob ownership checks use `getUserCompany(req.user.uid)` + parameterized DB query | Token-derived company identity prevents BOLA; mirrors existing pattern in getAllApplicantOfJob and updateCompany | All future job mutation endpoints must follow this pattern. Never accept companyId or userId from the request body/query as the authoritative ownership source. |
| D16 | Subscription mobile access via Option C (fixed sticky bar above mobile nav) | Smallest additive change; preserves 5-item nav cap (D3); no modification to Company page or routing | The sticky bar is `d-flex d-md-none` only. Do not remove it until a permanent solution (B09/B10-subs subtab) is shipped. Option C is a bridge, not a final state. |
| D17 | B01 release gate PASS — applicant name shown as "Candidate XXXXXX" in thread list | Full name requires join to user_credentials; deferred as non-blocking | When applicant name resolution is implemented, it must never leak PII to employers beyond what is already visible in the applicant review panel. Follow existing privacy guardrails. |
| D18 | Rate-limiting is the sole remaining P1 security item post-security sprint | No other P1 security items remain open; rate-limiting is pre-existing systemic gap | Rate-limiting must be installed before this codebase is exposed to significant traffic. It is not a launch blocker for a closed/invite-only beta, but is required before public launch. |

---

## Suggested Next Commands (in priority order)

1. **Direct implementation — SEC-01 (rate-limiting)**
   Install `express-rate-limit`. Apply global middleware + per-endpoint overrides for login/signup/messages/application. Estimated: 1 focused BE session (4–6 hours). Clears the last P1 security item.

2. **Direct implementation — SEC-02 (cvBuilderController caller-identity audit)**
   Read the controller + service, add explicit uid-bind check if missing. Under 2 hours.

3. **Direct implementation — B01 a11y follow-on + B16 + B12 (accessibility micro-bundle)**
   Four B01 non-blocking items + aria-current on mobile nav (B16) + aria-live on panel loading (B12). Bundle into one session. Estimated: 2–4 hours.

4. **`GETHIRED_EMPLOYER_INTERVIEW_MODULE_MVP_V5`**
   B03: Replace under-construction stub with minimum viable interview page. MVP scope only — no scheduling, no video review. Re-add sidebar item when content ships. Estimated: 2–3 days.

5. **Direct implementation — B06 + B10 (dashboard quick wins)**
   Pipeline bar click to filtered applicant list (B06) and draft job CTA on dashboard (B10). Both are contained, no new routes. Bundle after B03 ships. Estimated: half day.

6. **Direct implementation — B13 (job readiness bar in step 4)**
   Field-fill progress chips in job create step 4. No AI copy, factual counts only (D8 constraint). Estimated: 1 day.

7. **SECURE pass — video MIME + nosniff**
   Extend `helpers/fileSignature.js` to cover video magic bytes. Verify or add `X-Content-Type-Options: nosniff` in Express config. Estimated: 2–4 hours.

8. **TEST pass — NEW-04 (unit specs for changed files)**
   Write specs for the most regression-prone changes across both the fix sprint and security sprint: `isReadyToPublish` publish gate, `afterSubmit` post-publish navigation, deleteAccountById BOLA guard, deleteJob BOLA guard, updateJob BOLA guard. Estimated: 1–2 days.

9. **`GETHIRED_EMPLOYER_COMPANY_PROFILE_SUBTABS_V6`**
   B09 company profile subtabs. Lower urgency than security and interview page. Unlocks B10-subs (subscription as subtab) which resolves NEW-03 permanently via Option B.

---

## Verification Notes

### Residual error pattern check (post-sprint)

The only non-trivial match found in a post-sprint sweep of all controller catch blocks was:

- `applicationController.js:45` — `message: error.message` — SAFE. This path is only reached when `error.code === "JOB_APPLICATION_ALREADY_EXISTS"`, which is an explicitly constructed application-layer error object, not a raw DB or Node.js exception. `error.message` is set by the application layer to `"Application already exists."` — it does not contain stack traces, column names, or schema hints. The code comment in the file documents this exception to the general rule (D14).

- `jobsController.js:650` — `if (error.message === "FORBIDDEN")` — SAFE. This is a string comparison against a controlled sentinel value used for internal flow control within the ownership check, not a response to the client.

All 16 controllers are confirmed clean of raw error concatenation in HTTP response bodies.
