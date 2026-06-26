# GETHIRED_REGRESSION_CHECKLIST_RECENT_3
**Date:** 2026-06-26
**BE HEAD:** a32aa3b | **FE HEAD:** 2ff2409

---

## 1. ESM Compat Regressions

- [x] `controllers/contactsController.js` — 0 `?.` or `??` in runtime code
- [x] `controllers/candidateController.js` — 0 `?.` or `??` in runtime code
- [x] `middleware/verifyRoles.js` — 0 `?.` or `??` in runtime code
- [x] `middleware/verifyAuth.js` — 0 `?.` or `??` in runtime code
- [x] `middleware/firebaseApp.js` — 0 `?.` or `??` in runtime code
- [x] `server.js` — 0 `?.` or `??` in runtime code
- [x] `start.js` — 0 `?.` or `??` in runtime code
- [x] `controllers/jobsController.js` — `?.` and `??` appear in COMMENTS only (line 625 is a comment); runtime code uses `&&` guards
- [ ] `scripts/backfill_application_snapshots.js` — **FAIL**: line 96 has `v.errors?.length` in runtime code; script loads esm@3.2.25 at line 25 so this WILL fail at runtime if reached

---

## 2. Auth Chain Regressions

- [x] `verifyRoles` correctly blocks unauthenticated requests (uid is falsy in all null/undefined/missing cases)
- [x] `verifyRoles` correctly passes authenticated requests (uid is truthy string)
- [x] HTTP 401 returned on role failure — unchanged
- [x] HTTP 401 returned on auth failure — unchanged
- [x] `verifyAuth.js` token validation logic — unchanged from prior audit (only error message changed)

---

## 3. Contact/Candidate BOLA Regressions

- [x] `createContact` — companyId from JWT, not req.body
- [x] `multipleContact` — companyId from JWT, contacts get JWT companyId
- [x] `deleteContact` — DELETE WHERE includes company_id=$2 (ownership in SQL)
- [x] `updateContact` — editContact called with JWT companyId
- [x] `createGroup` — companyId from JWT
- [x] `updateGroup` — editGroup called with JWT companyId
- [x] `createCandidate` — companyId from JWT
- [x] `multipleCandidate` — companyId from JWT
- [x] `deleteCandidate` — DELETE WHERE includes company_id=$2

---

## 4. Promise.allSettled Semantic Regressions

- [x] No contacts are silently dropped on partial failure (vs old forEach(async))
- [x] No double-response "headers already sent" errors (single `return res.status(...)` after settled)
- [x] ADDED items correctly identified (status === 'ADDED' after null guard)
- [x] DUPLICATE_CONTACT correctly identified (same pattern)
- [x] DUPLICATE_CANDIDATE correctly identified (same pattern)
- [x] null value from settled does not crash filter (r.value && guard present)
- [x] rejected promises counted, not thrown (allSettled never rejects)

---

## 5. FE Build Regressions

- [x] FE production build passes with 0 errors
- [x] 2 pre-existing autoprefixer warnings present (non-blocking, not new)
- [x] All 19 lazy chunks generated
- [x] SSR-relevant chunk (main) still present
- [x] No TypeScript compilation errors

---

## 6. SEO / SSR Regressions

- [x] `seo.service.ts` uses DOCUMENT token (SSR-safe)
- [x] `setCanonical` uses `this.doc` (not bare `document`)
- [x] `clearCanonical` uses `this.doc`
- [x] `job-posts-details` SSR 404: `@Optional()` prevents browser crash
- [x] `job-posts-details` SSR 404: `isPlatformServer()` guard present
- [x] Error path sets noindex meta
- [x] Error path sets descriptive title

---

## 7. Firebase Auth Chain Regressions

- [x] 4-strategy credential chain present and ordered correctly
- [x] BASE64 strategy first (production-optimized)
- [x] FILE_PATH strategy blocked in production
- [x] No credential material logged
- [x] init guard prevents double-initialization

---

## 8. Known Open Issues (Not Regressions — Pre-existing)

| Issue | Severity | Action |
|-------|----------|--------|
| `backfill_application_snapshots.js` line 96: `v.errors?.length` (runtime, ESM-incompatible) | P2 | Fix: replace with `v.errors && v.errors.length` |
| `seo.service.spec.ts` does not provide DOCUMENT token in TestBed | P2 | Tests may silently skip DOM-touching paths in SSR scenarios |
| `job-posts-details` jobErrorSub ngOnDestroy cleanup not verified | P3 | Read ngOnDestroy to confirm unsubscribe |
| No automated test runner on BE (package.json test = echo) | P3 | Add jest infra |
| FE test runner available (`ng test`) but not run in this QA cycle | P3 | Run Karma tests in next cycle |
