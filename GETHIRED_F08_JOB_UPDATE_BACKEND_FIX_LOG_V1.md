# GETHIRED F-08 — BACKEND OWNERSHIP FIX LOG
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Fix 1: updateJob — Primary BOLA Closure (Previously Applied)

**File:** `controllers/jobsController.js` — `updateJob()` function  
**Status:** ALREADY IN PLACE from prior session; verified correct this sprint

### What was changed (prior session, preserved):
- Added `getUserCompany(req.user.uid)` call at top of handler
- Rejected if result is `[]` (no company) or falsy
- Added `AND company_id=$20` to UPDATE WHERE clause using server-derived `callerCompany.companyId`
- Added zero-row check: if `rows.length === 0` → 403
- `companyId` never read from `req.body`

### Before:
```js
const updateJob = async (req, res) => {
  // No ownership check. WHERE job_id=$19 only.
  // Anyone could update any job by guessing jobId.
}
```

### After:
```js
const callerCompany = await getUserCompany(req.user.uid);
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to update this job." });
}
// ...
WHERE job_id=$19 AND company_id=$20 returning *;
// ...
if (!rows || rows.length === 0) {
  return res.status(403).json({ message: "You don't have permission to update this job." });
}
```

**Risk level:** Previously CRITICAL — now CLOSED  
**Verification:** Ownership enforced at DB level, zero-row check catches mismatches

---

## Fix 2: interviewQuestionsUpdate — companyId Threading (This Sprint)

**File:** `services/job.service.js` — `interviewQuestionsUpdate()`  
**Status:** IMPLEMENTED this sprint

### Before:
```js
const interviewQuestionsUpdate = async (jobId, interviewQuestions, interviewTemplateId) => {
  interviewQuestions.map(async (question) => {
    if (question.questionId) {
      await updateQuestionById(question);  // No company_id passed
    }
  });
};
```

### After:
```js
const interviewQuestionsUpdate = async (jobId, interviewQuestions, interviewTemplateId, companyId = null) => {
  await Promise.all(interviewQuestions.map(async (question) => {
    if (question.questionId) {
      await updateQuestionById(question, companyId);  // company_id threaded through
    }
  }));
};
```

**Additionally fixed:** Changed `.map(async ...)` without `Promise.all` to `await Promise.all(...)` — previously question updates were fire-and-forget, errors would be silently swallowed.

**Risk level:** Medium (defence-in-depth) — Low regression risk  

---

## Fix 3: updateQuestionById — Company Scope Subquery (This Sprint)

**File:** `services/interview.service.js` — `updateQuestionById()`  
**Status:** IMPLEMENTED this sprint

### Before:
```js
const updateQuestionById = async interviewQuestion => {
  const updateQuery = `UPDATE ... interview_template_question
    SET ... WHERE template_question_id=$6 returning *;`
  // No company_id scope on the question update
}
```

### After:
```js
const updateQuestionById = async (interviewQuestion, companyId = null) => {
  if (companyId) {
    // Defence-in-depth: scope via join through job_interview_template.company_id
    updateQuery = `UPDATE ... interview_template_question itq
      SET ...
      WHERE itq.template_question_id=$6
        AND itq.job_interview_template_id IN (
          SELECT job_interview_template_id FROM ...job_interview_template
          WHERE company_id=$7
        )
      returning *;`
  } else {
    // Legacy fallback when no companyId available
    updateQuery = `UPDATE ... WHERE template_question_id=$6 returning *;`
  }
}
```

**Risk level:** Low — additive scoping, legacy fallback preserved  
**Verification:** When companyId is provided, a cross-company question update attempt returns 0 rows (throws "Failed to update question") rather than silently succeeding

---

## Fix 4: interviewQuestionsUpdate Caller — Pass companyId (This Sprint)

**File:** `controllers/jobsController.js` — `updateJob()` inner call  
**Status:** IMPLEMENTED this sprint

### Before:
```js
await interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId);
```

### After:
```js
await interviewQuestionsUpdate(
  jobId, interviewQuestions, interviewTemplateId,
  callerCompany.companyId  // F-08 child-table hardening
);
```

**Risk level:** None — passes existing variable, no new reads

---

## Summary of DB Call Pattern After Fixes

For a legitimate owner updating their job:
1. `getUserCompany(uid)` → companyId from JWT (1 query)
2. `UPDATE jobs SET ... WHERE job_id=$1 AND company_id=$2 returning *` (1 query — ownership + mutation in one)
3. If rows > 0: `saveJobArray(jobId, arrays)` — child tables scoped by jobId (confirmed owned)
4. If interviewQuestions: `interviewQuestionsUpdate(jobId, questions, templateId, companyId)` — each updateQuestionById includes company_id subquery scope

For a cross-company attack attempt:
1. `getUserCompany(uid)` → returns attacker's companyId
2. `UPDATE ... WHERE job_id=$victim AND company_id=$attacker` → 0 rows
3. Returns 403 — no data modified, no leak
