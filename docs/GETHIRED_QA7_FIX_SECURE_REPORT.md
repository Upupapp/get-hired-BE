# GETHIRED QA7 FIX SPRINT — SECURE VERIFICATION REPORT

**Date:** 2026-06-25
**Scope:** QA7 fix sprint — 6 targeted fixes across 5 BE controllers + 3 FE files
**Audited by:** Claude Code / SECURE audit pass
**Verdict:** PASS WITH FINDINGS

All 6 fixes are correctly implemented and close the BOLA vulnerabilities they
targeted. Three residual open issues remain (P1, P2, P3) that were not in scope
for this sprint but must be tracked.

---

## Overall Verdict

**PASS WITH FINDINGS**

The 6 QA7 fixes are correctly implemented. No fix introduces a new vulnerability.
The BOLA footprint is materially smaller than before the sprint. Three residual
gaps are documented below and must be tracked.

---

## Fix Verification

### Fix 1 — updateStatusOfJob BOLA (jobsController.js, lines 355-385)

**Verdict: PASS**

- Ownership check is present. Lines 363-374 perform the check before any write.
- `companyId` is derived from `getUserCompany(req.user.uid)` — never from
  `req.body`. The body-supplied `jobId` is used only as a lookup key, not as
  an identity assertion.
- The ownership `SELECT` (lines 368-373) runs before `updateJobStatus()` is
  called (line 376). Order is correct.
- Returns 403 (not 401 or 500) on ownership mismatch — both the guard at line
  365 and the row-check at line 374 return `res.status(403)`.
- If `getUserCompany` throws, the outer `catch` at line 381 catches it and
  returns HTTP 500 with a generic error message. This is the correct fallback;
  the write is never reached.
- The internal `updateJobStatus` helper function (lines 387-401) does not have
  its own ownership check, but that is acceptable — it is a non-exported helper
  only called from within `updateStatusOfJob` (which has the check) and is not
  exposed as a route handler.

**One minor observation (not a finding):** `updateJobStatus` does not fold
the `company_id` constraint into the UPDATE WHERE clause (unlike `updateJob`
and `deleteJob` which use the OPT-01 pattern). This means a race between the
ownership SELECT and the UPDATE is theoretically possible, though it requires
the database to allow another caller to reassign job ownership simultaneously
— an extremely unlikely race given no job-reassignment endpoint exists. Not
a practical risk; documented for completeness.

---

### Fix 4 — Applicant Profile BOLA (applicantsController.js, lines 173-200)

**Verdict: PASS**

**updateProfile (lines 188-201):**
- Line 193: `{ ...req.body, userId: req.user.uid }` — the spread happens first,
  then the `userId` property is overwritten with the JWT-derived value. Because
  object spread + explicit key assignment means the last write wins, a
  request body containing `{ userId: 'victim-uid', bio: 'hacked' }` would have
  its `userId` overwritten by `req.user.uid` before the service call. Correct.
- The service's WHERE clause at `applicant.service.js:422` is
  `WHERE user_id=$14` using the destructured `userId` from the argument object.
  Since the controller overwrites `userId` to `req.user.uid`, the service will
  only ever update the authenticated caller's row.
- `req.body.userId` does not reach the DB write path.

**updateBasicProfileInfo (lines 173-186):**
- Identical pattern at line 178: `{ ...req.body, userId: req.user.uid }`.
- Service's WHERE clause at `applicant.service.js:314` is `WHERE user_id=$13`.
- Same conclusion: attacker's supplied `userId` is overwritten. Correct.

**Adversarial test:**
  - Attacker sends `{ userId: 'victim-uid', bio: 'hacked' }`.
  - Controller spreads body → `userId` is temporarily `'victim-uid'`.
  - Controller then sets `userId: req.user.uid` (JS object literal: last key wins).
  - Service receives `userId = req.user.uid` (attacker's uid).
  - DB UPDATE WHERE clause uses attacker's own uid. Victim's row untouched. CORRECT.

**Other paths using a passed-in userId:**
  - `createProfile` (line 161) passes `req.body` directly to
    `createApplicationProfile`. This accepts a caller-supplied `userId` and
    uses it in the INSERT (applicant.service.js line 76). This is creation,
    not mutation of another user's record — but it is worth noting that a caller
    could create a profile attached to a different uid. See Findings table, P2.
  - `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments`
    all accept `applicantProfileId` from the body with no ownership check.
    See Findings table, P2.

---

### Fix 5 — Contacts/Groups BOLA (contactsController.js)

**Verdict: PASS**

All 4 mutation handlers verified:

**updateContact (lines 107-138):**
- Lines 111-120: `getUserCompany(req.user.uid)` → Array.isArray guard →
  ownership SELECT (`WHERE contact_id=$1 AND company_id=$2`) → check rowcount.
- Write (`editContact`) only reached if ownership confirmed.
- Table used: `gethired.contact`, column `company_id`. Correct.

**deleteContact (lines 68-105):**
- Lines 82-92: same pattern — guard → SELECT → rowcount → then DELETE.
- Table and column correct.
- One ordering quirk: `checkContactIfExist` is called before the try block
  (line 75), so if that throws it would be an unhandled rejection. Pre-existing
  issue, not introduced by this fix. Low severity (the check uses a SELECT, not
  a write).

**updateGroup (lines 231-288):**
- Lines 236-246: guard → SELECT from `gethired."group"` WHERE `group_id=$1
  AND company_id=$2` → rowcount → then `editGroup`.
- Table: `gethired."group"`, column `company_id`. Correct per sprint spec.

**deleteGroup (lines 313-350):**
- Lines 327-337: same pattern.
- Same pre-try ordering quirk for `checkGroupIfExist` (line 320). Same
  severity as deleteContact.

**createContact and createGroup — company scoping:**
- `createContact` (line 9): passes `contact` from `req.body` directly to
  `addContact`. The service inserts `company_id` from the body-supplied
  contact object (contact.service.js line 67). No JWT ownership check.
  An authenticated employer user could create a contact under any `companyId`
  by supplying an arbitrary one. **See Findings table, P2.**
- `createGroup` (line 186): passes `companyId` from `req.body` to `addGroup`.
  Same issue. **See Findings table, P2.**
- `multipleContact` (line 33): same issue.

---

### Fix 6 — CV BOLA (cvController.js)

**Verdict: PASS**

**updateCV (lines 71-132):**
- Line 87: `const userId = req.user.uid` — JWT-derived, never from body.
- Lines 91-97: ownership SELECT `WHERE cv_id=$1 AND user_id=$2` runs before
  the UPDATE. Returns 403 if no matching row.
- The UPDATE at line 99 also sets `user_id=$1` to `userId` (the
  JWT-derived value), providing defense-in-depth.
- Correct.

**deleteCV (lines 134-158):**
- Lines 141-147: ownership SELECT `WHERE cv_id=$1 AND user_id=$2` using
  `req.user.uid`. Returns 403 if no row.
- DELETE at line 149 runs only after ownership confirmed.
- Correct.

**listCVs (getUserCVlist, lines 160-174):**
- Uses `req.query.userid` (caller-supplied) as the WHERE clause.
- An authenticated caller can read any other user's CV list by passing a
  different userid. This is an information-disclosure BOLA on the CV list
  endpoint. **See Findings table, P1.**

**getCvById (lines 176-190):**
- Uses `req.query.id` (caller-supplied) with no ownership check.
- An authenticated caller can read any CV by passing its id.
- **See Findings table, P1.**

---

### Fix 2 — companiesController dangling line

**Verdict: PASS**

- Lines 404-414: the `getSetupListCompany` function is fully commented out as
  a block comment. No live code in the block.
- The export at line 733 does not include `getSetupListCompany`.
- The module can load without the removed function.
- No other lines in the same commented block were left accidentally live —
  the entire function body is inside `/* ... */`.
- The only change visible in this area is the clean comment-out. No mutation
  of `errorMessage` at startup is present anywhere in the module.

---

### Fix 3 — Array.isArray guard

**Verdict: PASS — adversarial analysis below**

The `getUserCompany` function (companiesController.js, lines 186-212) returns:
- `[]` (empty array) when no `company_employees` row exists (line 200-201).
- A mapped company object `{ companyId, ... }` on success (line 203-207).
- Throws on DB error (line 209).

The guard pattern used consistently across all fixed handlers:
```js
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403)...
}
```

**Case 1: `getUserCompany` returns `[]`**
- `Array.isArray([])` → `true`. Guard triggers → 403. CORRECT.

**Case 2: `getUserCompany` returns `null`**
- This cannot happen today (the function returns `[]` or throws, never null),
  but the guard `!callerCompany` catches it defensively. CORRECT.

**Case 3: `getUserCompany` returns `{ companyId: null }`**
- This cannot happen today (companyId comes from `company_id` which is a NOT
  NULL PK in the schema), but `!callerCompany.companyId` catches `null` and
  `undefined`. CORRECT.

**Case 4: `getUserCompany` returns `{ companyId: 'valid-uuid' }`**
- `Array.isArray({...})` → `false`
- `!callerCompany` → `false`
- `!callerCompany.companyId` → `false`
- Guard does not trigger. Code proceeds. CORRECT.

**Note on updateCompany:**
The `updateCompany` handler (lines 103-184) uses an older guard pattern:
```js
if (!userCompany || userCompany.companyId !== companyId) {
```
This predates QA7 and does not include the `Array.isArray` check. If
`getUserCompany` returns `[]`, then `!userCompany` is `false` (an empty array
is truthy), and `[].companyId !== companyId` evaluates to `undefined !== <str>`
which is `true` — so the 403 is still returned. Functionally safe but relies
on the `companyId` mismatch leg rather than the `Array.isArray` leg. The newer
QA7 pattern is cleaner and should be retrofitted here for consistency. See
Findings table, P3.

---

## Remaining BOLA Scan — Post-Sprint Open Issues

### Controllers checked:

| Controller | Mutations checked |
|---|---|
| userController | `deleteAccountById` — FIXED (userId === req.user.uid check, line 546) |
| jobsController | `createJobs`, `updateJob`, `deleteJob`, `updateStatusOfJob` — see below |
| applicantsController | `updateProfile`, `updateBasicProfileInfo` — FIXED |
| contactsController | `updateContact`, `deleteContact`, `updateGroup`, `deleteGroup` — FIXED |
| cvController | `updateCV`, `deleteCV` — FIXED; `getUserCVlist`, `getCvById` — OPEN |
| companiesController | `updateCompany` — FIXED (prior sprint); `removeCompanyUser` — FIXED (prior sprint) |
| subscriptionController | `createPaymentIntent` — derives companyId from JWT (FIXED prior sprint) |
| paymentController | `paymongoWebhook` — webhook callback, no user auth applicable |
| employerController | Read-only handlers only; no mutations |
| messageController | `postMessage`, `openThread` — authorization enforced in message.service.js via `loadAuthorizedThread` / `resolveCallerCompany`; CORRECT |

**createJobs — still open:**
`companyId` at line 49 is taken directly from `req.body` and passed into the
INSERT at line 95 (`$4`). An authenticated employer user can create a job
under any `companyId` by supplying an arbitrary one. The JWT-derived uid is
used for the interview template (line 133) but not for the job's company
ownership. **See Findings table, P1.**

**applicants sub-profile mutations — open:**
`saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments`
all accept `applicantProfileId` from `req.body` with no ownership check.
An authenticated applicant could modify another applicant's sub-profile
entries by supplying the correct `applicantProfileId`. **See Findings table, P2.**

**createProfile — open:**
`createProfile` passes `req.body` directly to `createApplicationProfile`,
which uses the caller-supplied `userId` in the INSERT. A caller could create
a profile attached to a different uid. **See Findings table, P2.**

**createContact / createGroup — open:**
`company_id` is taken from `req.body` with no ownership check. An employer
could create contacts/groups under a different company. **See Findings table, P2.**

---

## Fair-Hiring Guardrail Confirmation

None of the 9 QA7 fixes affect:
- **MATCH scoring** — match logic lives in `services/match/`, not touched.
- **Applicant visibility** — no changes to applicant listing or filtering queries.
- **Certification behavior** — `saveCert` was not modified (the fix for `saveCert` BOLA is tracked as a residual P2 but the function body itself was not changed).
- **Video answers** — `saveVideoCV` and `updateProfileSaveVideoCV` were not modified; the fix for `saveVideoCV` applicantProfileId BOLA is tracked as a residual P2 but the function body itself was not changed.

All 6 fixes are narrowly scoped to authorization guards. No business logic,
scoring, or ranking code was changed. Fair-hiring guardrails are intact.

---

## Findings Table

| ID | Severity | Controller / File | Description | Remediation |
|---|---|---|---|---|
| F-QA7-01 | P1 | cvController.js `getUserCVlist` (line 160) | `userid` query param is caller-supplied; any authenticated user can list any other user's CVs. | Lock to `req.user.uid`; remove the query param. |
| F-QA7-02 | P1 | cvController.js `getCvById` (line 176) | `id` query param is caller-supplied; any authenticated user can read any CV by id. | Add `AND user_id = $2` with `req.user.uid` to the WHERE clause. |
| F-QA7-03 | P1 | jobsController.js `createJobs` (line 49) | `companyId` is taken from `req.body` and inserted directly. An employer can create jobs under a company they do not belong to. | Replace with `(await getUserCompany(req.user.uid)).companyId`; remove `companyId` from body destructuring for the INSERT. |
| F-QA7-04 | P2 | applicantsController.js `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments` | `applicantProfileId` from `req.body` is used for DELETE+INSERT with no ownership check. An applicant can mutate another applicant's sub-profile arrays. | Add ownership check: `SELECT applicant_profile_id FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` using `req.user.uid` before any delete/insert. |
| F-QA7-05 | P2 | applicantsController.js `createProfile` | `userId` from `req.body` is passed to the INSERT. A caller can create a profile attached to another uid. | Replace with `req.user.uid`; exclude `userId` from body destructuring. |
| F-QA7-06 | P2 | contactsController.js `createContact`, `multipleContact`, `createGroup` | `companyId` from `req.body` is used directly in INSERT. An employer can create contacts/groups under any company. | Derive companyId from `getUserCompany(req.user.uid)` in each handler. |
| F-QA7-07 | P3 | companiesController.js `updateCompany` (line 138) | Missing `Array.isArray` leg in the guard (uses older `!userCompany` pattern). Functionally safe today because `[]` is caught by the `companyId !==` leg, but inconsistent with the QA7 guard pattern. | Update to `Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId`. |

---

## Summary

| Category | Count |
|---|---|
| Fixes verified PASS | 6 of 6 |
| New vulnerabilities introduced by fixes | 0 |
| Residual P1 open | 3 |
| Residual P2 open | 3 |
| Residual P3 open | 1 |
| Fair-hiring guardrails affected | 0 |
