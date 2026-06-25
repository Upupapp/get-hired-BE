# GETHIRED QA8 Fix Sprint — OPTIMIZE Report

**Date:** 2026-06-25
**Scope:** QA8 fix sprint changed files only
**Files audited:**
- BE: `controllers/jobsController.js`, `controllers/cvController.js`, `controllers/applicantsController.js`, `controllers/contactsController.js`, `controllers/companiesController.js`
- FE: `src/app/job/state/job.effects.ts`, `src/app/job/job-create/job-create.component.ts`, `src/app/employer-panel/employer-panel.component.scss`

---

## 1. `createJobs` DB call count

**Finding: 2 DB calls — getUserCompany + INSERT. Was 1 (INSERT only) before QA8 FIX-2.**

Before QA8 the handler accepted `companyId` from `req.body` and fed it straight into the INSERT. That was a BOLA (QA8 FIX-2). The fix correctly replaces the body-supplied value with a `getUserCompany(uid)` lookup, adding one SELECT round-trip.

**Is the overhead acceptable?** Yes. The security requirement is non-negotiable: the only safe way to determine `companyId` for a write is to derive it from the verified Firebase token. One extra SELECT per job-create is negligible and structurally identical to every other employer-write endpoint in the codebase.

**Could `getUserCompany` be cached per-request via middleware?** Yes, in principle. A request-scoped middleware could call `getUserCompany(uid)` once and attach the result to `req.callerCompany`, so the four employer-write endpoints that currently each invoke it (`createJobs`, `updateJob`, `deleteJob`, `updateStatusOfJob`) share a single DB round-trip per request. This is a valid future optimisation but is **out of scope** for the fix sprint — it requires router-level changes and would need the same middleware to also cover `contactsController` and `companiesController` endpoints. **Deferred and documented.**

---

## 2. Sub-array ownership checks (`applicantsController`)

### Current shape (post-QA8)

Each of `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, and `saveDocuments` follows this pattern:

```js
// Step 1 — ownership SELECT (1 DB call)
const ownerCheck = await dbQuery.query(
  `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
  [applicantProfileId, uid]
);
if (!ownerCheck.rows || ownerCheck.rows.length === 0) { return 403; }

// Step 2 — deleteArrayApplicantEntry DELETE (1 DB call)
await deleteArrayApplicantEntry(applicantProfileId, '<table>', 'applicant_id');

// Step 3 — N INSERT calls for the new array items
```

Total: 2 + N DB calls per handler.

### Can the ownership SELECT be folded into the write?

The pattern used successfully in `cvController` (OPT-03) and `contactsController` / `jobsController` (OPT-01/OPT-02) is to add an `AND user_id=$N` clause to the write's WHERE, then check `rowCount === 0` for the 403. This works cleanly when the write target row is owned by the caller (e.g. `cv` table has `user_id`).

**The applicant sub-array case is structurally different.** `deleteArrayApplicantEntry` deletes from child tables (`applicant_work_experience`, `applicant_educational_background`, `applicant_certificates`, `applicant_skills`, `documents`) via `WHERE applicant_id = $1`. These child tables do not have a `user_id` column — ownership is in the parent `applicants_profile` table. There is therefore no single-query fold available for the DELETE step without:

1. Rewriting `deleteArrayApplicantEntry` to accept an additional JOIN or subquery, **or**
2. Changing it to `DELETE FROM child_table WHERE applicant_id IN (SELECT applicant_profile_id FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2)` — a correlated subquery.

**Risk assessment:** Both approaches require touching `deleteArrayApplicantEntry`, which is also called from `applicant.service.js` (the `updateApplicationProfile` service function) in several other code paths. Changing its signature or query in a fix sprint risks regressions in those callers, which were not part of the QA8 fix scope.

**Decision: deferred.** The current 2-DB-call pattern (SELECT + DELETE) is correct, safe, and O(1) — the overhead is one lightweight `SELECT 1` per endpoint call. A future OPTIMIZE pass could introduce a subquery fold (see template below) once the wider call-site impact is assessed.

**Subquery fold template for a future pass (do not apply now):**
```sql
-- Replaces the separate SELECT 1 + DELETE pair:
DELETE FROM <schema>.<child_table>
WHERE applicant_id = $1
  AND EXISTS (
    SELECT 1 FROM <schema>.applicants_profile
    WHERE applicant_profile_id = $1 AND user_id = $2
  );
-- rowCount === 0 → either profile not found, user_id mismatch, or no child rows (all safe to 403)
```

---

## 3. `createContact` / `multipleContact` / `createGroup`

### `createContact` — 2 DB calls
`getUserCompany(uid)` (1 call) + `addContact(...)` INSERT (1 call). Correct. `getUserCompany` is called once at the top of the handler; companyId is derived once and reused. No waste.

### `multipleContact` — getUserCompany called ONCE (correct)
```js
const callerCompany = await getUserCompany(req.user.uid); // called ONCE before the loop
const companyId = callerCompany.companyId;

contacts.forEach(async option => {
  await addMultipleContact({ ...option, companyId }, groupName, groupId);
});
```

`getUserCompany` is called once before the `contacts.forEach` loop. The derived `companyId` is spread into each contact object inside the loop. **This is already optimal** — it does not call `getUserCompany` once per contact.

**Note (pre-existing, not introduced by QA8):** The `forEach + async` pattern is a known anti-pattern in Node.js — `forEach` does not await the async callbacks, so the Promise returned by each `addMultipleContact` call is dropped. The `new Promise` wrapper and the `resolve()` call inside the loop are a manual workaround. This is a correctness concern (not a performance concern), was pre-existing before QA8, and is out of scope for this OPTIMIZE pass. Flagged for a future code-quality sweep.

### `createGroup` — 2 DB calls (correct)
Same pattern: `getUserCompany(uid)` once, then `addGroup(groupName, companyId)` once. The `emails.forEach` loop that follows calls `addInGroupList` (not `getUserCompany`) per email. No per-item overhead from the ownership lookup.

---

## 4. `getCvById`

**Already optimal.** Single DB call:
```sql
SELECT * FROM <schema>.cv WHERE cv_id = $1 AND user_id = $2;
```
`user_id = $2` folds ownership into the SELECT itself. Zero rows returns a 403 with no information leak. No further optimisation possible.

---

## 5. `getUserCVlist`

**Already optimal.** Single DB call:
```sql
SELECT * FROM <schema>.cv WHERE user_id = $1;
```
Caller identity locked to `req.user.uid`, not a query param. No further optimisation possible.

---

## 6. `formSubs` replacement in `job-create.component.ts`

**Finding: Negligible performance impact. Documented.**

The QA8 FIX-10 pattern in `setFormGroup()` is:
```ts
this.formSubs.unsubscribe();
this.formSubs = new Subscription();
```

This replaces the `formSubs` bag on each call. `setFormGroup` is called:
- Once at component init when no `jobId` is set (new job), OR
- Each time `editJob$` emits when a `jobId` exists (load + any subsequent store updates).

In the edit-job path, `editJob$` typically emits once (initial load) and then only on explicit store dispatches. The `new Subscription()` allocation is a trivial V8 object creation — no DOM access, no async, no memory leak risk (the prior bag is unsubscribed before it is replaced). This is not a meaningful performance concern.

The alternative (calling `.unsubscribe()` on each individual sub then re-adding, without replacing the bag) would be semantically equivalent and slightly more verbose. The current approach is idiomatic Angular and correct.

**No change needed.**

---

## 7. `employer-panel.component.scss`

The SCSS file audited (`src/app/employer-panel/employer-panel.component.scss`) contains layout rules only: `z-index`, `overflow`, `min-height`, `padding`, sidebar dimensions. There are no selector chains, deep nesting, or `@each`/`@for` loops that would produce bloated compiled output. The file imports `_colors` and `_motion` shared partials — both are already part of the design system. No optimisation warranted.

---

## Summary: Applied vs Deferred

| Item | Status | Action |
|------|--------|--------|
| `createJobs` 2-call overhead | Accepted (security required) | Documented only |
| `getUserCompany` per-request cache via middleware | Deferred | Document for future OPTIMIZE pass |
| Sub-array ownership SELECT fold (applicantsController) | Deferred (cross-cutting risk) | Subquery template provided above |
| `multipleContact` getUserCompany call-count | Already correct (once before loop) | No change |
| `getCvById` ownership | Already optimal (folded into SELECT) | No change |
| `getUserCVlist` scoping | Already optimal | No change |
| `formSubs` new Subscription() cost | Negligible | Documented only |
| `employer-panel.component.scss` | No issues | No change |

**Zero code changes applied.** All QA8 security fixes are correctly implemented; the one optimisation opportunity (sub-array SELECT fold) carries enough cross-cutting risk to defer to a dedicated refactor pass when `deleteArrayApplicantEntry`'s full call graph can be audited.
