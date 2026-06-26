# GETHIRED_TEST_COVERAGE_MATRIX_RECENT_3
**Date:** 2026-06-26
**BE HEAD:** a32aa3b | **FE HEAD:** 2ff2409

---

## Coverage by Change

### Change 1 — ESM compat: verifyRoles.js `req.user && req.user.uid`

| Test Case | Method | Result |
|-----------|--------|--------|
| Valid user object with uid | Logic self-test | PASS — `uid = 'abc123'` (truthy) |
| `req.user = null` | Logic self-test | PASS — `uid = null` (falsy) → guard blocks |
| `req.user` absent | Logic self-test | PASS — `uid = undefined` (falsy) → guard blocks |
| `req.user = {}` (no uid) | Logic self-test | PASS — `uid = undefined` (falsy) → guard blocks |

**Note:** `null && x.uid` evaluates to `null` (not `undefined`). Both are falsy. `if (!uid)` correctly blocks in all cases. The semantics of `req.user?.uid` (returns `undefined` when `req.user` is nullish) vs `req.user && req.user.uid` (returns `null` when `req.user` is `null`) differ only in the specific falsy value — behavior of the downstream `if (!uid)` guard is identical. **Functionally equivalent.**

---

### Change 2 — Promise.allSettled in contactsController.js

| Test Case | Method | Result |
|-----------|--------|--------|
| All succeed (ADDED) | Logic self-test | PASS — correct count |
| Mix ADDED + DUPLICATE_CONTACT + rejected | Logic self-test | PASS — added=2, dup=1, fail=1 |
| null value returned from settled | Logic self-test | PASS — null filtered out by `r.value &&` guard |
| createGroup filter (fulfilled + truthy value only) | Static review | PASS — no status check needed for addInGroupList |
| updateGroup filter (fulfilled + truthy value only) | Static review | PASS — same pattern as createGroup |
| multipleContact: summary object shape | Static review | PASS — totalRequested, successCount, failureCount, duplicateCount, outcome all correct |

**allSettled call count in contactsController:** 4 (multipleContact, createGroup, updateGroup, and one more)

---

### Change 3 — Promise.allSettled in candidateController.js

| Test Case | Method | Result |
|-----------|--------|--------|
| ADDED candidates filtered | Logic self-test | PASS — added=2 |
| DUPLICATE_CANDIDATE counted | Logic self-test | PASS — duplicateCount=1 |
| rejected counted | Static review | PASS — failureCount tracked |
| null value guard | Logic self-test | PASS — `r.value &&` prevents NPE |

**allSettled call count in candidateController:** 2 (multipleCandidate + one other)

---

### Change 4 — firebaseApp.js 4-strategy credential chain

| Test Case | Method | Result |
|-----------|--------|--------|
| FIREBASE_SERVICE_ACCOUNT_BASE64 path | Static review | PASS — base64 decode + JSON parse |
| FIREBASE_SERVICE_ACCOUNT_JSON path | Static review | PASS — JSON parse |
| GOOGLE_APPLICATION_CREDENTIALS path | Static review | PASS — applicationDefault() |
| FIREBASE_SERVICE_ACCOUNT_PATH (local only) | Static review | PASS — blocked in production |
| No credentials found | Static review | PASS — throws descriptive error |
| init guard (admin.apps.length > 0) | Static review | PASS — prevents double-init |
| Private key newline normalization | Static review | PASS — `replace(/\\n/g, '\n')` |

---

### Change 5 — SSR 404 in job-posts-details.component.ts

| Test Case | Method | Result |
|-----------|--------|--------|
| `@Optional()` prevents crash in browser | Static review | PASS — decorator confirmed |
| `@Inject(RESPONSE)` from nguniversal | Static review | PASS — correct import |
| `isPlatformServer()` guard before response.status(404) | Static review | PASS — double guard |
| noindex meta set on error | Static review | PASS — `updateTag({name:'robots', content:'noindex'})` |
| Title set to 'Job not found | GetHired' on error | Static review | PASS |
| Subscription cleanup (ngOnDestroy) | Static review | jobErrorSub declared — **NOT VERIFIED** (ngOnDestroy not read) |

---

### Change 6 — seo.service.ts DOCUMENT token injection

| Test Case | Method | Result |
|-----------|--------|--------|
| `setCanonical` uses `this.doc` not bare `document` | Static review | PASS — confirmed in source |
| `clearCanonical` uses `this.doc` | Static review | PASS |
| `setJsonLd` uses `this.doc` | Static review | PASS |
| `clearJsonLd` uses `this.doc` | Static review | PASS (inferred from pattern) |
| DOCUMENT token injected in constructor | Static review | PASS — `@Inject(DOCUMENT) private doc: Document` |
| seo.service.spec.ts structured (Karma/Jasmine) | File review | PASS — 30+ test cases present |
| Spec uses TestBed without DOCUMENT token | Static review | **FLAG** — spec providers list does not include DOCUMENT provider |

---

## ESM Compat Scan Results

| Directory | Files Scanned | ?. in comments only | ?. in runtime code | ?? in runtime code |
|-----------|--------------|---------------------|--------------------|--------------------|
| controllers/ | All .js | jobsController.js: 1 in comment only | 0 | 0 |
| middleware/ | All .js | 0 | 0 | 0 |
| services/ | All .js | 0 | 0 | 0 |
| helpers/ | All .js | 0 | 0 | 0 |
| db/ | All .js | 0 | 0 | 0 |
| routes/ | All .js | 0 | 0 | 0 |
| scripts/ | All .js | 0 | **1 (line 96)** | 0 |
| server.js | 1 | 0 | 0 | 0 |
| start.js | 1 | 0 | 0 | 0 |

**Runtime concern:** `scripts/backfill_application_snapshots.js` line 96 contains `v.errors?.length`. This script loads esm via `require = require("esm")(module)` at line 25, so it IS parsed by esm@3.2.25 and WILL FAIL at runtime if that line is reached. This script is a one-off maintenance script (not part of the server), but it is an ESM compat bug.

---

## FE Build

| Metric | Value |
|--------|-------|
| Build command | `npm run build-prod` (ng build --configuration=production) |
| Build result | PASS — completed in 39171ms |
| Errors | 0 |
| Warnings | 2 (autoprefixer `start` value — pre-existing, not new) |
| main.js size | 2.06 MB raw / 466.51 kB gzip |
| Lazy chunks | 19 chunks generated |
