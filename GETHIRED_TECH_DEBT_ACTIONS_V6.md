# GETHIRED TECH DEBT ACTIONS — V6
**Date:** 2026-07-01 | **Scope:** Infrastructure, dependency, code quality, DX, and architectural debt

---

## Tech Debt Inventory

### TD-ACT-001 (= ACT-017): Node.js 14 Migration Plan
**Action ID:** ACT-017
**Priority:** P2
**Category:** Infrastructure / Runtime
**Problem:** GetHired BE runs on Node.js 14, which reached End-of-Life in April 2023. Node 14 receives no security patches. The `esm` package is used to support `import` syntax in the BE — this package requires Node 14 and prevents a straightforward upgrade.
**Why it matters:** EOL runtime is a security risk. npm audit results for Node 14 packages are unreliable. Future dependencies may drop Node 14 support.
**Technical impact:** Migration path: remove `esm` dependency → convert all `import`/`export` to `require()`/`module.exports` (CommonJS) → upgrade to Node 18 LTS or Node 20 LTS → update PM2 ecosystem config on Linode.
**Scope:** (Phase A) Audit all files using `import` syntax in BE. (Phase B) Convert to CommonJS. (Phase C) Remove `esm` from `package.json`. (Phase D) Test on Node 18 locally. (Phase E) Upgrade Linode Node version via nvm.
**Non-scope:** Migrating to ES modules natively (more complex; CommonJS is simpler and already partially in use).
**Affected repo:** BE
**Affected files:** All BE `.js` files using `import`; `package.json`; Linode nvm config
**Dependencies:** None
**Risk level:** Medium (breaking change risk if any import alias or circular dependency)
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** 1 day assessment + 2 days migration + 1 day validation
**Suggested owner:** BE developer
**Acceptance criteria:** All BE tests pass on Node 18. PM2 shows Node 18 in `pm2 env 0`. No `esm` in package.json.
**Rollback notes:** Maintain Node 14 nvm alias until Node 18 is confirmed stable on Linode.
**Status:** OPEN

---

### TD-ACT-002 (= P3-BCRYPT-JS): bcrypt → bcryptjs
**Action ID:** P3-BCRYPT-JS
**Priority:** P3
**Category:** Dependency / Build fragility
**Problem:** `bcrypt` package requires native binary compilation via `node-gyp`. On Node 14 deploys or CI without build tools, this can fail silently or produce non-functional binaries. `bcryptjs` is a pure-JS implementation with identical API.
**Scope:** Replace `bcrypt` with `bcryptjs` in `package.json`. Update all `require('bcrypt')` to `require('bcryptjs')`. API is identical — no logic changes needed.
**Affected repo:** BE
**Affected files:** `package.json`, any controller/service requiring `bcrypt` (search: `require('bcrypt')`)
**Risk level:** Very low — API identical
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~30 minutes
**Acceptance criteria:** `npm install` completes without `node-gyp` output. Password hash/verify functions work correctly.
**Status:** OPEN

---

### TD-ACT-003 (= P3-AXIOS-1X): axios 0.x → 1.x
**Action ID:** P3-AXIOS-1X
**Priority:** P3
**Category:** Dependency / Security
**Problem:** BE uses `axios` 0.x, which has known CVEs and is no longer maintained. `axios` 1.x is a breaking-change upgrade with a migration guide.
**Scope:** Run `npm install axios@latest`. Test all HTTP calls (PayMongo API, Firebase REST API, any external integrations). Axios 1.x changed error handling — `error.response` vs `error.request` branching may need updates.
**Affected repo:** BE
**Affected files:** `package.json`, any controller/service using `axios.get()` / `axios.post()` (search: `require('axios')`)
**Risk level:** Medium (breaking change in error handling)
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~3-4 hours (upgrade + test all axios call sites)
**Acceptance criteria:** All PayMongo + Firebase HTTP calls work correctly. No axios-related errors in PM2 logs during manual QA.
**Status:** OPEN

---

### TD-ACT-004 (= P3-TOAST-EXTRACT): Shared Toast Decision Utility
**Action ID:** P3-TOAST-EXTRACT
**Priority:** P3
**Category:** Code Quality / DX
**Problem:** `import-add-user.component.ts`, `import-add-contact.component.ts`, and `import-add-candidate.component.ts` all contain ~95% identical toast branching logic for import outcomes.
**Why it matters:** Any future change to toast behavior (copy, class, duration) must be made in 3 places. A regression fix in one place often misses the others.
**Scope:** Extract toast decision logic into a shared utility `src/app/shared/utils/import-toast.util.ts` with a `resolveImportToast(res, entityLabel)` function. Update all 3 components to use it.
**Non-scope:** Changing toast behavior itself.
**Affected repo:** FE
**Affected files:** `import-add-user.component.ts`, `import-add-contact.component.ts`, `import-add-candidate.component.ts`, new `import-toast.util.ts`
**Risk level:** Low (refactor only, no behavior change)
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~2-3 hours
**Acceptance criteria:** All 3 import components use shared utility. Behavior unchanged (regression QA on all 3 import flows).
**Status:** OPEN

---

### TD-ACT-005 (= P3-DEAD-LOG-CONTACT): Remove Dead Snackbar Branches
**Action ID:** P3-DEAD-LOG-CONTACT
**Priority:** P3
**Category:** Code Quality / Dead Code
**Problem:** `contact-list.component.ts:102` and `candidate-list.component.ts:100` subscribe to `contact.success` / `candidate.success` NGRX reducer fields that are never populated. These branches are dead code — they never execute.
**Scope:** Remove the dead subscribe blocks. Verify no other component depends on these reducer fields.
**Affected repo:** FE
**Affected files:** `src/app/company/contact-list/contact-list.component.ts`, `src/app/company/candidate-list/candidate-list.component.ts`
**Risk level:** Very low (dead code removal)
**Priority:** P3
**MoSCoW:** Won't (cleanup sprint only)
**Estimated effort:** ~15 minutes
**Status:** OPEN

---

### TD-ACT-006 (= P3-CANDIDATE-FORM-GUARD): importCandidateForm Initialization Guard
**Action ID:** P3-CANDIDATE-FORM-GUARD
**Priority:** P3
**Category:** Code Quality / Defensive Programming
**Problem:** `importCandidateForm` is `undefined` at `ngOnInit` in `import-add-candidate.component.ts`. It is only initialized inside `uploadListener()`. If any future template or logic change calls `saveOnboardMultiple()` before a CSV is uploaded, it will throw a runtime error.
**Scope:** Initialize `importCandidateForm` with a default empty value in `ngOnInit` or in the class field declaration. This is a defensive change with no behavioral impact today.
**Affected repo:** FE
**Affected files:** `src/app/company/import-add-candidate/import-add-candidate.component.ts`
**Risk level:** Very low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~15 minutes
**Status:** OPEN

---

### TD-ACT-007 (= P2-POOL-EXHAUSTION): DB Connection Pool Concurrency Limiter
**Action ID:** P2-POOL-EXHAUSTION
**Priority:** P2
**Category:** Infrastructure / Database
**Problem:** `Promise.allSettled` in `multipleContact`/`multipleCandidate` fans out ALL rows concurrently. A 100-row CSV fires 100 parallel service calls, each needing 2-5 sequential DB queries. With `max: 10` pool connections and `connectionTimeoutMillis: 5000`, rows time out and appear as failures with valid data.
**Scope:** Install `p-limit`. Apply concurrency limiter (`pLimit(10)`) to `multipleContact` and `multipleCandidate` bulk import handlers.
**Non-scope:** Changing pool max size (optional follow-up).
**Affected repo:** BE
**Affected files:** `controllers/contactsController.js`, `controllers/candidateController.js`, `package.json`
**Risk level:** Low (additive change — wraps existing Promise.allSettled)
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~3-5 hours (install + apply + test with large CSV)
**Acceptance criteria:** 100-row CSV import completes with 0 timeout errors in PM2 logs. All valid rows appear in DB.
**Status:** OPEN

---

### TD-ACT-008 (= P2-CSV-ROW-CAP): CSV Import Row Count Cap
**Action ID:** P2-CSV-ROW-CAP
**Priority:** P2
**Category:** Infrastructure / Defense
**Problem:** No client-side guard on CSV import row count. Employers can import unlimited rows, triggering DB pool exhaustion (see TD-ACT-007).
**Scope:** Add client-side row count validation in all 3 import components. Limit: 50 rows (safe without pool fix; revisit to 100 after TD-ACT-007).
**Affected repo:** FE
**Affected files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts`
**Risk level:** Low
**Priority:** P2
**MoSCoW:** Must (interim mitigation until TD-ACT-007)
**Estimated effort:** ~1 hour
**Acceptance criteria:** Uploading a 51-row CSV shows "CSV has 51 rows. Maximum allowed is 50." Import does not proceed.
**Status:** OPEN

---

### TD-ACT-009 (= P3-CANDIDATE-SINGULAR): Bulk Import Field Name Asymmetry
**Action ID:** P3-CANDIDATE-SINGULAR
**Priority:** P3
**Category:** Code Quality / API Contract
**Problem:** `import-add-candidate.component.ts` sends `{ candidate: [...] }` (singular). BE destructures `const { candidate } = req.body`. The contact bulk endpoint uses `{ contacts: [...] }` (plural). Asymmetry is a maintenance trap — future alignment refactors could break the candidate endpoint.
**Scope:** Document the asymmetry clearly in both files (JSDoc comment). Optionally normalize to plural in a non-breaking change (requires BE + FE coord).
**Affected repo:** BE + FE
**Affected files:** `import-add-candidate.component.ts`, `controllers/candidateController.js`
**Risk level:** Very low (documentation only until normalization chosen)
**Priority:** P3
**MoSCoW:** Won't (document now; fix in API v2)
**Estimated effort:** ~30 minutes (doc) or ~2 hours (normalize)
**Status:** OPEN

---

### TD-ACT-010 (= GH-ACT-090): Modal Acknowledgement Persistence to DB
**Action ID:** GH-ACT-090
**Priority:** P3
**Category:** UX / Data Persistence
**Problem:** Company setup success modal acknowledgement is stored only in `sessionStorage`. On session end or device change, the modal may re-appear.
**Why it matters:** Low — sessionStorage is cleared when the tab closes, but the company setup modal is a one-time flow. For most users this is fine. DB persistence would be better for cross-device and post-session-restore scenarios.
**Scope:** Add `POST /api/employer/company-setup-acknowledged` BE endpoint. Store acknowledgement as a flag on the employer/company record. FE reads this flag on dashboard load to suppress modal re-display.
**Non-scope:** Other modal acknowledgements; onboarding checklist state.
**Affected repo:** BE + FE
**Affected files:** BE: new route + controller + migration; FE: `company-setup.component.ts` or dashboard component
**Risk level:** Low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~3-4 hours (BE migration + controller + FE)
**Acceptance criteria:** After company setup completion, refreshing the page or signing in from a different device does not re-show the setup modal.
**Status:** OPEN

---

## Closed Tech Debt Items (History)

| Item | Closed | Detail |
|---|---|---|
| forEach(async) in contacts/candidates | CLOSED | Promise.allSettled (2ff6358) |
| forEach(async) in createGroup/updateGroup | CLOSED | Promise.allSettled (25f5e17) |
| forEach(async) in interview.service.js | CLOSED | Promise.allSettled (25f5e17) |
| Dead ?id= param in getApplicant() | CLOSED | Removed (94e4d39) |
| isMobileViewAllowed dead route data | CLOSED | Removed (94e4d39) |
| success-snackbar missing color | CLOSED | Fixed (5ea4466) |
| warning-snackbar WCAG contrast | CLOSED | Fixed (5ea4466) |
| Spurious SAVE_CONTACT dispatch | CLOSED | Removed (21657a5) |

---

## Priority Summary

| Priority | Count |
|---|---|
| P2 tech debt | 3 (TD-ACT-001, TD-ACT-007, TD-ACT-008) |
| P3 tech debt | 7 |
| Total open | 10 |
