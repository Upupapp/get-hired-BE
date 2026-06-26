# GETHIRED Anti-Corruption Layer Guide — STITCH 3 (Recent Deployment)
_Generated: 2026-06-26_

---

## Overview

Anti-corruption layer (ACL) patterns prevent changes in one layer (BE API, SSR engine, Angular token injection) from silently corrupting consumers in another. This guide documents the ACL patterns added or verified in STITCH 3.

---

## ACL-01: RESPONSE Token — Optional Injection Guard

**Location:** `src/app/jobs/job-posts-details/job-posts-details.component.ts:68`

**Pattern:**
```typescript
@Optional() @Inject(RESPONSE) private response: any
```

**What it prevents:**
- Browser builds crashing when `RESPONSE` is not provided (it is an SSR-only token).
- `@Optional()` means Angular injects `null` if the provider is absent, rather than throwing `NullInjectorError`.

**Runtime guard:**
```typescript
if (isPlatformServer(this.platformId) && this.response) {
  this.response.status(404);
}
```
Double guard: `isPlatformServer` prevents this running in browser; `this.response` guard prevents null method call even if somehow platform detection returns true with no response object.

**ACL verdict: CORRECT. No changes needed.**

---

## ACL-02: DOCUMENT Token — Angular Built-in Provider

**Location:** `src/app/core/services/seo.service.ts:59`

**Pattern:**
```typescript
@Inject(DOCUMENT) private doc: Document
```

**What it prevents:**
- `ReferenceError: document is not defined` during SSR (the V3 anti-pattern of using bare `document` global).
- In Angular Universal, DOCUMENT is provided as a Domino stub — the same API surface, working on the server.

**ACL verdict: CORRECT. DOCUMENT is auto-provided by Angular's ServerModule. No registration gap.**

---

## ACL-03: Firebase Credential Chain — Fail-Fast on Bad Config

**Location:** `middleware/firebaseApp.js:44-120`

**Pattern:** Each credential strategy wraps its initialization in try/catch and throws (not silently falls through) on failure.

**What it prevents:**
- Silent credential fallthrough (e.g., a bad base64 string quietly trying ADC instead).
- Server starting with no valid Firebase connection and failing at request time rather than startup time.

**ACL verdict: CORRECT. Fail-fast pattern is in place.**

---

## ACL-04: Promise.allSettled r.value Guard (esm v3.2.25)

**Location:** `controllers/contactsController.js:61-63` and `controllers/candidateController.js:60-62`

**Pattern:**
```javascript
// WRONG (optional chaining — not supported in esm v3.2.25):
// r.value?.status

// CORRECT (esm v3.2.25 compatible):
r.value && r.value.status
```

**What it prevents:**
- SyntaxError in esm v3.2.25 which does not support `?.` optional chaining.
- Accessing `.status` on an undefined `r.value` (for rejected promises, `r.value` is always undefined; rejected items are filtered before reaching the `.map(r => r.value)` line).

**ACL verdict: CORRECT. Pattern is safe and esm-compatible.**

---

## ACL-05: verifyRoles uid Guard

**Location:** `middleware/verifyRoles.js:21`

**Pattern:**
```javascript
// WRONG (optional chaining):
// const uid = req.user?.uid;

// CORRECT (esm v3.2.25 compatible):
const uid = req.user && req.user.uid;
```

**What it prevents:**
- SyntaxError in esm v3.2.25.
- Null reference if `verifyRoles` were called without `verifyAuth` upstream.
- The guard returns 401 "Authentication required" if uid is falsy — a correct fail-safe.

**ACL verdict: CORRECT. Pattern is safe and esm-compatible.**

---

## Pre-existing ACL Gaps (Carry Forward)

### GAP-01: SQL Injection in Legacy Query Helpers

**Location:** `services/contact.service.js`, `services/candidate.service.js`

Functions using string interpolation (not parameterized queries):
- `checkContactIfExist(contactId)` — line 224
- `checkIfExistInGroup(email, groupId)` — line 449
- `checkGroupIfExist(groupId)` — line 464
- `checkGroupNameIfExist(groupName)` — line 480
- `listOfContacts(companyId, groupName)` — line 541-558 (groupName from req.query)
- `checkGroups(complete)` — complete.email interpolated — line 357
- `contactList(companyId)` — companyId interpolated — lines 308-327
- `candidateList(companyId)` — companyId interpolated — lines 124-138

**Risk:** groupName and email are user-controlled. companyId is JWT-derived (lower risk but not parameterized).

**Correct pattern (to apply in a dedicated fix pass):**
```javascript
// Replace:
const searchQuery = `SELECT * FROM ${dbSchema}."group" WHERE group_name='${groupName}'`;
const { rows } = await dbQuery.query(searchQuery, []);

// With:
const searchQuery = `SELECT * FROM ${dbSchema}."group" WHERE group_name=$1`;
const { rows } = await dbQuery.query(searchQuery, [groupName]);
```

**Status:** Pre-existing, deferred. Not introduced by STITCH 3 changes.

### GAP-02: verifyRoles Is Dead Code
`verifyRoles` is not imported or used by any route file. If it is ever wired in, it must be placed after `verifyAuth`. The comment in `verifyRoles.js:20` documents this requirement — but there is no enforcement mechanism. Consider adding a startup assertion if this middleware is ever activated.
