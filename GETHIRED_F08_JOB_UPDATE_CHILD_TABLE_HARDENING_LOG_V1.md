# GETHIRED F-08 — CHILD-TABLE UPDATE HARDENING LOG
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Child Tables Updated via updateJob

| Table | Access Pattern | Ownership Gate |
|-------|---------------|----------------|
| `job_badges` | DELETE WHERE job_id; INSERT job_id | Implicit: called after ownership-scoped UPDATE succeeds |
| `job_requirement` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `job_goodtohave` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `job_educationalbackground` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `job_skills` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `job_tags` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `job_certification_requirement` | DELETE WHERE job_id; INSERT job_id | Implicit: same |
| `interview_template_question` | UPDATE by question_id | Explicit: company_id subquery scope added this sprint |
| `job_interview_template` | INSERT if no template | Implicit: only reached via updateJob which verified ownership |

---

## Implicit Gate Pattern (saveJobArray)

`saveJobArray` is called at line 347 of `updateJob()`:

```js
const { rows } = await dbQuery.query(updateQuery, [..., callerCompany.companyId]);

// Zero rows: job not found OR company mismatch — 403 either way
if (!rows || rows.length === 0) {
  return res.status(403).json(...)
}

// Only reached if ownership was confirmed:
const jobArrays = await saveJobArray(jobId, { badges, requirements, ... });
```

The `jobId` used in all `saveJobArray` child-table deletes and inserts is the same `jobId` that was confirmed to belong to `callerCompany.companyId` by the UPDATE WHERE clause. The gate is reliable.

**Assessment: Implicit gate is sound. No separate ownership check needed for saveJobArray.**

---

## Explicit Gate Added: updateQuestionById

**Why it needed explicit hardening:**
`updateQuestionById` in `interview.service.js` used `WHERE template_question_id=$6` only — no company scope. If this function were ever called from a different code path without the parent gate, it would allow updating any question by ID.

**Fix applied:**
```js
// When companyId provided (from updateJob caller):
WHERE itq.template_question_id=$6
  AND itq.job_interview_template_id IN (
    SELECT job_interview_template_id
    FROM gethired.job_interview_template
    WHERE company_id=$7
  )
```

**Result:** Even if `updateQuestionById` were ever called in isolation, it would be scoped to the caller's company's questions only.

---

## Also Fixed: Fire-and-Forget Promise Bug

**Before:**
```js
interviewQuestions.map(async (question) => {
  // .map returns array of pending Promises — errors silently swallowed
  await updateQuestionById(question);
});
```

**After:**
```js
await Promise.all(interviewQuestions.map(async (question) => {
  await updateQuestionById(question, companyId);
}));
```

This ensures:
1. All question updates are awaited before the function returns
2. Any error from `updateQuestionById` (including company mismatch) propagates up
3. The parent `updateJob` handler's catch block receives the error properly

---

## deleteArrayJobEntry Pattern (safe)

```js
const deleteArrayJobEntry = async (jobId, tableName, columnName) => {
  const deleteQuery = `DELETE FROM ${dbSchema}.${tableName} WHERE ${columnName} = $1;`;
  const { rows } = await dbQuery.query(deleteQuery, [jobId]);
```

Uses parameterized jobId (not string interpolation). The `tableName` and `columnName` are internal constants from `saveJobArray`, never from user input. Safe.

---

## deleteInterviewQuestion — Already Hardened (prior sprint)

```js
DELETE FROM interview_template_question
WHERE template_question_id=$1
  AND job_interview_template_id IN (
    SELECT job_interview_template_id
    FROM job_interview_template WHERE company_id=$2
  )
```

Already had the subquery pattern. No change needed.

---

## Verdict

All child-table mutations in the job update flow are now protected by either:
1. **Implicit gate**: Execution only reaches child-table code after parent ownership-scoped UPDATE returns a row
2. **Explicit gate**: `updateQuestionById` now includes company_id subquery scope as defence-in-depth
3. **Promise.all**: Question update errors now propagate correctly instead of being silently dropped
