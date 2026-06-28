# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — BACKEND FIX LOG V1

## Date: 2026-06-25

---

## STATUS: NO BACKEND CHANGES MADE OR NEEDED

### Evidence: `jobsController.js` — `createJobs`

```javascript
if (interviewQuestions && interviewQuestions.length != 0) {
  const template = await createInterviewTemplateQuestions(jobId, "default", companyId, uid);
  const rawQuestions = Promise.all(
    await interviewQuestions.map(async (question) =>
      await createQuestion(question, template.jobInterviewTemplateId)
    )
  );
  rawQuestions.then((ques) => (questions = ques));
}
```
Questions block is guarded by `&& interviewQuestions.length != 0`. Empty array or missing field → skipped cleanly. Job saves with `jobStatusId = 2` (published) regardless.

### Evidence: `jobsController.js` — `updateJob`

```javascript
if (interviewQuestions) {
  await interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId);
}
```
Questions update only runs when `interviewQuestions` is provided. An empty array causes `interviewQuestionsUpdate` to run with nothing to iterate. No error.

### Evidence: `updateJob` and `createJobs` — publish status
`jobStatusId` is a plain field passed through to the INSERT/UPDATE SQL:
```sql
UPDATE ... SET job_status_id = $17 WHERE job_id=$19 AND company_id=$20
```
No validation checks whether questions exist before accepting status 2. Any status is accepted.

### Evidence: `updateStatusOfJob`
Used when employer toggles job status from list view. Also takes `statusId` directly with no question count check.

---

## SECURITY POSTURE: UNCHANGED

All ownership checks preserved:
- `createJobs`: `getUserCompany(req.user.uid)` — never uses caller-supplied `companyId`
- `updateJob`: `getUserCompany` + `company_id=$20` in UPDATE WHERE
- `updateStatusOfJob`: `getUserCompany` + `company_id=$3` in UPDATE WHERE
- `deleteJob`: `getUserCompany` + `company_id=$2` in DELETE WHERE
- `getAllApplicantOfJob`: company ownership check before returning applicants
- `deleteInterviewQuestion`: ownership check via subquery through `job_interview_template`

No security regression. No change introduced.
