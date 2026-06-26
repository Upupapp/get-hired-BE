# GETHIRED_CONTRACT_TEST_MATRIX_RECENT_3
**Date:** 2026-06-26
**BE HEAD:** a32aa3b | **FE HEAD:** 2ff2409

---

## API Contract Verification

### POST /contacts/multiplecontact (contactsController.multipleContact)

| Contract Aspect | Before | After | Verified |
|-----------------|--------|-------|----------|
| HTTP 200 on partial success | 200 | 200 | PASS |
| HTTP 200 on all_success | 200 | 200 | PASS |
| HTTP 403 on BOLA (bad companyId from JWT) | 403 | 403 | PASS |
| HTTP 500/error on op failure | error status | error status | PASS |
| Response shape: `{ contacts: [...], summary: {...} }` | NOTIFY-P2 shape | Same | PASS |
| summary.totalRequested = input count | Yes | Yes | PASS |
| summary.successCount = ADDED count | Yes | Yes | PASS |
| summary.duplicateCount = DUPLICATE_CONTACT count | Yes | Yes | PASS |
| summary.failureCount = rejected count | Yes | Yes | PASS |
| summary.outcome values (all_success/partial_success/duplicate_only/all_failed) | Yes | Yes | PASS |

**Key change verified:** `r.value?.status === 'ADDED'` changed to `r.value && r.value.status === 'ADDED'`. Semantically identical: both expressions are false when `r.value` is null/undefined. ESM safe.

---

### POST /candidates/multiplecandidate (candidateController.multipleCandidate)

| Contract Aspect | Before | After | Verified |
|-----------------|--------|-------|----------|
| HTTP 200 on success | 200 | 200 | PASS |
| HTTP 403 on BOLA | 403 | 403 | PASS |
| Response shape: `{ candidates: [...], summary: {...} }` | Yes | Yes | PASS |
| DUPLICATE_CANDIDATE correctly counted | `r.value?.status` | `r.value && r.value.status` | PASS |
| null value guard prevents crash | Via optional chain | Via `r.value &&` | PASS |

---

### POST /contacts/creategroup (contactsController.createGroup)

| Contract Aspect | Before | After | Verified |
|-----------------|--------|-------|----------|
| HTTP 200 with group + contacts array | Yes | Yes | PASS |
| addInGroupList failures don't crash response | Via allSettled | Via allSettled (same) | PASS |
| Filter: `r.status === 'fulfilled' && r.value` (no status check needed) | Yes | Yes | PASS |

---

### PUT /contacts/updategroup (contactsController.updateGroup)

| Contract Aspect | Before | After | Verified |
|-----------------|--------|-------|----------|
| HTTP 200 with updated group | Yes | Yes | PASS |
| FORBIDDEN error → 403 JSON | Yes | Yes | PASS |
| allSettled filter same as createGroup | Yes | Yes | PASS |

---

### All authenticated endpoints: verifyRoles middleware

| Contract Aspect | Old Code | New Code | Verified |
|-----------------|----------|----------|----------|
| Valid uid → `next()` called | `req.user?.uid` truthy → query | `req.user && req.user.uid` truthy → query | PASS |
| Missing user → 401 | `undefined` → falsy | `null`/`undefined` → falsy | PASS |
| Role check SQL query unchanged | Yes | Yes | PASS |
| 401 JSON shape unchanged | `{message: 'User not allowed...'}` | Same | PASS |

---

## FE SSR Contract

### GET /jobs/details/:id (SSR rendering)

| Contract Aspect | Before | After | Verified |
|-----------------|--------|-------|----------|
| Valid job: HTTP 200 + HTML | 200 | 200 | PASS (no change) |
| 404 job: HTTP status sent to crawler | HTTP 200 (soft 404) | HTTP 404 (real 404) | PASS — `response.status(404)` called |
| 404 job: noindex meta | Was noindex (NOTIFY-P2) | Still noindex | PASS |
| `@Optional()` — browser renders without RESPONSE provider | n/a | Confirmed by decorator | PASS |
| isPlatformServer guard — no window access in Node | n/a | Confirmed by guard | PASS |

---

## SEO Service Contract

### SeoService.setCanonical / clearCanonical

| Contract Aspect | V3 (bare document) | V4 (DOCUMENT token) | Verified |
|-----------------|---------------------|---------------------|----------|
| Browser: DOM manipulated correctly | Yes | Yes | PASS |
| SSR: no crash on server | Crashed (no globalThis.document) | Works (Angular Universal DOM stub) | PASS |
| Canonical set in SSR HTML | No | Yes | PASS |
| Canonical updated in-place (no duplicates) | Yes | Yes | PASS |
| clearCanonical on no-canonical pages | Yes | Yes | PASS |
