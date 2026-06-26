# GETHIRED_TEST_FIXTURES_INDEX_RECENT_3
**Date:** 2026-06-26
**BE HEAD:** a32aa3b | **FE HEAD:** 2ff2409

---

## Overview

No new test files were created in this QA cycle. All tests were executed as inline `node -e "..."` scripts against CommonJS-compatible logic extracted from the source files. This approach avoids esm@3.2.25 compatibility issues when writing test scripts.

---

## Inline Self-Test Fixtures Used

### Fixture 1: verifyRoles uid guard

```javascript
// 4 test cases — covers all req.user shapes
[
  { req: { user: { uid: 'abc123' } }, expectTruthy: true },  // valid
  { req: { user: null }, expectTruthy: false },               // null user
  { req: {}, expectTruthy: false },                           // no user prop
  { req: { user: {} }, expectTruthy: false },                 // no uid prop
]
// Expression: const uid = req.user && req.user.uid;
// Guard: if (!uid) { return 401; }
```

All 4 cases passed. Critical finding: when `req.user = null`, the expression evaluates to `null` (not `undefined`), but `!null === true` so the guard still correctly blocks.

---

### Fixture 2: contactsController.multipleContact allSettled filter

```javascript
const settled = [
  { status: 'fulfilled', value: { status: 'ADDED', id: 1 } },
  { status: 'fulfilled', value: { status: 'DUPLICATE_CONTACT' } },
  { status: 'rejected', reason: Error('net') },
  { status: 'fulfilled', value: { status: 'ADDED', id: 2 } },
  { status: 'fulfilled', value: null },   // null guard test case
];
// Expected: addedItems.length=2, duplicateCount=1, failureCount=1
```

PASS.

---

### Fixture 3: candidateController.multipleCandidate allSettled filter

```javascript
const settled = [
  { status: 'fulfilled', value: { status: 'ADDED', candidateId: 10 } },
  { status: 'fulfilled', value: { status: 'DUPLICATE_CANDIDATE' } },
  { status: 'rejected', reason: Error('db') },
  { status: 'fulfilled', value: { status: 'ADDED', candidateId: 11 } },
];
// Expected: addedItems.length=2, duplicateCount=1
```

PASS.

---

### Fixture 4: Null value guard

```javascript
const settled = [
  { status: 'fulfilled', value: null },
  { status: 'fulfilled', value: { status: 'ADDED', id: 99 } },
];
// Expected: addedItems.length=1 (null filtered out by r.value &&)
```

PASS. Confirms `r.value && r.value.status === 'ADDED'` correctly excludes null-value settled results.

---

## Existing Test Infrastructure

### BE: `tests/sitemap.test.js`

- Format: Jest (written as spec, not runnable without test infra)
- Dependencies: `jest`, `supertest`, `@babel/core`, `@babel/preset-env`, `babel-jest` — NOT installed
- Status: Documents expected behavior; not executable automatically
- Coverage: GET /sitemap.xml endpoint only

### FE: Karma/Jasmine via `ng test`

- Available: Yes (`package.json` test script calls `ng test`)
- `seo.service.spec.ts`: 30+ test cases covering setPageMeta, setRobots, setCanonical, setJobPostingJsonLd, clearJsonLd, resetToDefaults, SSR safety
- Run status: Not executed in this cycle (requires Chrome/Chromium headless)
- Note: `seo.service.spec.ts` does not provide DOCUMENT token in TestBed providers — tests that call `setCanonical` or `clearCanonical` rely on the actual `document` global available in Karma browser context. This works in browser but is not an SSR-safe test.

---

## Recommended New Test Files (Not Created — Future Work)

### BE: `tests/verifyRoles.test.js`

```javascript
// Safe to write — no ?. or ?? needed
require = require("esm")(module);
const verifyRoles = require("../middleware/verifyRoles").default;
// Mock dbQuery, test: uid guard, role included, role excluded, db error
```

### BE: `tests/contactsController.allSettled.test.js`

```javascript
// Unit test for allSettled filter logic extracted from multipleContact
// Mock addMultipleContact to return ADDED / DUPLICATE_CONTACT / throw
// Verify summary object shape
```

### BE: `tests/candidateController.allSettled.test.js`

```javascript
// Same pattern as contactsController test above
```

### FE: `job-posts-details.component.spec.ts`

```typescript
// Test SSR 404 behavior: mock RESPONSE token, trigger jobError$, verify response.status(404) called
// Test browser: mock RESPONSE as null (@Optional), verify no crash
```
