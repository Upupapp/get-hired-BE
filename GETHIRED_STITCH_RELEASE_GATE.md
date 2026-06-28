# GetHired STITCH Release Gate — QA Cycle 11

Generated: 2026-06-25

---

## Release Gate Summary

| Gate | Description | Status |
|------|-------------|--------|
| A | No new BOLA / object-level auth gaps | PASS |
| B | All new contracts stitched end-to-end with correct types | PASS (after fixes) |
| C | No silent data corruption or null-payload regressions | PASS (after fixes) |
| D | Auth/session handoff correct for all new endpoints | PASS |
| E | Public portal and applicant flows unaffected | PASS |

---

## Gate A — No new BOLA / object-level authorization gaps

**Result: PASS**

**Evidence:**
- `GET /api/messages/recruiter/threads`: Company scoping derived from JWT (`resolveCallerCompany`); no client-supplied ID accepted; FORBIDDEN if no company. Cross-company isolation verified by WHERE clause on `mt.company_id`. SECURE.
- `GET /api/interview/hub`: Company scoping derived from JWT (`getUserCompany`); no client-supplied ID accepted; WHERE `j.company_id = $1` enforces isolation. SECURE.
- All existing interview endpoints (`getall`, `getalltemplates`, `getallrecipients`): Use `callerBelongsToCompany()` which matches JWT-derived companyId against the query param. No new regressions.
- `saveQuestionTemplate`: companyId derived from JWT (QA9 fix), not from body. No regression.
- `updateJobInterviewQuestion`: Ownership verified via subquery (QA9 fix). No regression.

**No Gate A failures.**

---

## Gate B — All new contracts stitched end-to-end with correct types

**Result: PASS (after FIX F-01 and FIX F-02)**

**Evidence:**

**B01 — GET /api/messages/recruiter/threads:**
- BE: `listRecruiterThreads()` returns `RecruiterThreadSummary[]` shape ✓
- FE: `MessageService.getRecruiterThreads()` types return as `RecruiterThreadSummary[]` ✓
- FE interface `RecruiterThreadSummary` in `message.service.ts` matches BE output shape ✓
- `applicantName: string | null` — after FIX F-01, correctly populated from `firstname`/`lastname` ✓
- `applicantPhotoUrl: string | null` — correctly passed through; FIX F-02 handles broken URLs in FE ✓
- `needsReply: boolean` — derived server-side from `lastSenderRole === "applicant"` ✓
- Component uses `threads ?? []` null guard; empty state handled ✓

**B03 — GET /api/interview/hub:**
- BE: `getInterviewHub()` returns `{ items: InterviewHubItem[], total: number }` shape ✓
- FE: `RecruiterInterviewHubService.getInterviewHub()` types return as `InterviewHubResponse` ✓
- FE interface `InterviewHubItem` matches BE output shape ✓
- `applicantName: string | null` — after FIX F-01, correctly populated ✓
- Component uses `res.items || []` null guard ✓
- Template handles `loading`, `error`, `items.length === 0`, and `items.length > 0` states ✓

**B02 — Mobile sidebar:**
- `routerSub` unsubscribed in `ngOnDestroy` ✓
- Escape handler via `@HostListener('document:keydown.escape')` ✓
- Focus management with `setTimeout` for CSS transition ✓
- `employer-panel.component.ts` implements `OnDestroy` ✓

**SEC-01 — Rate limiting:**
- 4 tiers configured in `server.js` ✓
- Tier 3 `skip` function correctly exempts GET/HEAD/OPTIONS ✓
- Tier 4 paths match actual route registrations ✓
- RFC 6585 `RateLimit-*` headers enabled (`standardHeaders: true`, `legacyHeaders: false`) ✓

**Pre-fix failures (now resolved):**
- FIX F-01 was required: `u.first_name`/`u.last_name`/`u.email` → `u.firstname`/`u.lastname`/`uc.email`
- FIX F-02 was required: Broken img URL fallback in recruiter-messages avatar

---

## Gate C — No silent data corruption or null-payload regressions

**Result: PASS (after FIX F-01)**

**Evidence:**
- Before FIX F-01: `applicantName` would always be null in production. This is a null payload, not data corruption (no data is written incorrectly).
- After FIX F-01: Names and emails correctly populated.
- Message body: 4000-char cap enforced server-side; trim() applied; no truncation mid-word in DB.
- `videoAnswerCount`: `parseInt(r.video_answer_count, 10) || 0` — safe integer coercion from COALESCE.
- `needsReply`: Derived at read time, not stored — cannot be corrupted.
- All new writes (POST /messages/thread, POST /messages/thread/send) use parameterized queries — no SQL injection risk.
- Thread uniqueness: `UNIQUE (job_id, applicant_uid)` constraint prevents duplicate thread creation.

---

## Gate D — Auth/session handoff correct for all new endpoints

**Result: PASS**

**Evidence:**
- All 4 new endpoints (`/messages/thread`, `/messages/thread/messages`, `/messages/thread/send`, `/messages/recruiter/threads`, `/interview/hub`) use `verifyAuth` middleware ✓
- `AuthInterceptor` in FE attaches `Authorization: <token>` to every HTTP request ✓
- `UnAuthorizedInterceptor` handles 401/403 by redirecting to signin ✓
- Role derivation is server-side only; no role claim is read from JWT ✓
- Tier 4 sensitive paths match actual route paths ✓
- No endpoint in QA11 scope accepts anonymous requests ✓

**Known limitation:** `verifyAuth` sends plain text 403 body instead of JSON. FE handles by HTTP status code. Not a breaking issue; tagged as OPT-05 for cleanup.

---

## Gate E — Public portal and applicant flows unaffected

**Result: PASS**

**Evidence:**
- QA11 changes are additive only:
  - New routes: `GET /messages/recruiter/threads`, `GET /interview/hub`
  - Modified files: `services/message.service.js` (B01 SQL fix), `controllers/interviewController.js` (B03 SQL fix)
  - FE: New components `RecruiterMessagesComponent`, `RecruiterInterviewHubComponent`; new employer-panel route at `/recruiter/messages`; new lazy-loaded route at `/recruiter/interview`
- No existing routes renamed, removed, or modified in behavior
- No DB schema changes (all DDL was applied in prior QA cycles)
- Public portal routes (`/jobs`, `/jobs/:id`, `/apply`) not touched ✓
- Applicant-side messaging (`app-message-thread` component) not modified ✓
- Public rate limits (Tier 1 global, 500/15min) are generous enough not to affect normal browsing ✓

---

## Open Risks at Gate (non-blocking)

| Risk ID | Description | Severity | Gate Impact |
|---------|-------------|----------|-------------|
| R-01 | Firebase Storage URL expiry (no backend refresh) | Medium | None — FIX F-02 handles UX |
| R-02 | 429 response has no FE handler | Low | None — app shows generic error, doesn't crash |
| R-03 | Response envelope inconsistency on /interview/hub | Low | None — FE adapted |
| R-04 | verifyRoles uid source (pre-existing) | Medium | None — not on QA11 endpoints |
| R-05 | No LIMIT on listRecruiterThreads | Low | None — companies with large thread counts may see slow load |

---

## Release Decision

**All 5 gates PASS.** QA Cycle 11 deployment scope is cleared for release with FIX F-01 (column name mismatch) and FIX F-02 (avatar fallback) applied.

Commit and deploy:
1. BE: `services/message.service.js` (F-01), `controllers/interviewController.js` (F-01)
2. FE: `recruiter-messages.component.html` (F-02)
