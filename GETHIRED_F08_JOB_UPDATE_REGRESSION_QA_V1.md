# GETHIRED F-08 — REGRESSION QA
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## What Changed in This Sprint

### Backend
1. `services/interview.service.js` — `updateQuestionById()`: signature changed from `(interviewQuestion)` to `(interviewQuestion, companyId = null)`. Default is `null` — all existing callers that don't pass `companyId` continue to work identically.
2. `services/job.service.js` — `interviewQuestionsUpdate()`: signature changed from `(jobId, interviewQuestions, interviewTemplateId)` to `(jobId, interviewQuestions, interviewTemplateId, companyId = null)`. Default is `null`. Changed `.map(async)` to `await Promise.all(...)`.
3. `controllers/jobsController.js` — `updateJob()`: added `callerCompany.companyId` as 4th arg to `interviewQuestionsUpdate`.

### Frontend
4. `job-create.component.ts` — Added `savingDraft`, `saveSuccessPulse`, `saveErrorMsg` properties + subscriptions
5. `job-create.component.html` — Draft button loading state, error panel, success pulse
6. `job-create.component.scss` — New CSS classes (additive only)

---

## Regression Risk Assessment by Area

### Job Create (NEW job, no jobId)
- `createJobs` controller: UNTOUCHED
- FE `formatJob(1/2)` → `saveJob()` for new job goes through POST path
- **Status: No regression possible** — no changes to create path

### Job Update (EXISTING job, with jobId)
- `updateJob` controller: Only change is adding `callerCompany.companyId` to the existing `interviewQuestionsUpdate` call
- Authorized owner updating own job: behavior identical — only child-table question updates now have additional WHERE clause that succeeds for own-company questions
- **Status: No behavioral change for legitimate owners**

### Job Publish (updatejobs with status=2)
- `publishJobPost()` in FE: No changes to publish logic itself
- New: `saveErrorMsg = null` cleared before attempt — no impact on success path
- B04/B05/B13: Explicitly preserved, verified unchanged
- **Status: No regression**

### Job Status Change (changestatus route)
- `updateStatusOfJob` / `updateJobStatus`: UNTOUCHED
- **Status: No regression**

### Delete Interview Question
- `deleteInterviewQuestion` controller: UNTOUCHED
- **Status: No regression**

### Interview Questions in Update Flow
- `interviewQuestionsUpdate` now uses `await Promise.all` instead of fire-and-forget `.map`
- For existing questions (`questionId` present): now awaited, and company-scoped. For legitimate owners, all their questions pass the `company_id` subquery and are updated normally.
- For new questions (`!question.questionId`): path unchanged — creates template if needed, inserts question
- **Status: No regression for legitimate owners. Potential for a "Failed to update question" error if question's `job_interview_template` has null `company_id` — see note below.**

### Interview Template company_id null scenario
- `createInterviewTemplateQuestions` called from `createJobs` passes `companyId` and `uid` explicitly
- However, if a template was created before this field was populated (historical data), `company_id` could be null in the DB
- The subquery `WHERE company_id=$7` on a null company_id column would return 0 rows
- This would cause `updateQuestionById` to throw "Failed to update question" for legacy null-company-id templates
- **Mitigation:** The `companyId = null` default + the `if (companyId)` branch means the company-scoped path is ONLY taken when `companyId` is provided. `interviewQuestionsUpdate` receives `callerCompany.companyId` (always a valid string for authenticated employers) — so the scoped path is always taken. If a historical template has `company_id = null`, this would fail. **This is a known risk — logged to backlog.**

### Public Job Detail (GET /job/details)
- UNTOUCHED
- **Status: No regression**

### Applicant Application Flow
- UNTOUCHED
- **Status: No regression**

### MATCH Scoring (JobCompatibilityService)
- UNTOUCHED — per spec. No changes anywhere near this.
- **Status: No regression**

### Payment/Subscription
- UNTOUCHED
- **Status: No regression**

---

## Preserved Features Checklist

| Feature | Preserved? |
|---------|-----------|
| B04: Interview/video questions optional for publish | YES |
| B05: Post-publish → /recruiter/jobs/dashboard?id= | YES |
| B09: Company profile subtabs | UNTOUCHED |
| B13: JobReadinessService, readiness bar | UNCHANGED |
| JobCompatibilityService | UNTOUCHED |
| Video answer recording/submission | UNTOUCHED |
| Employer review of video answers | UNTOUCHED |
| Subscription behavior | UNTOUCHED |
| Draft save flow (create new draft) | YES |
| Job list / expired list | UNTOUCHED |
| Public job board | UNTOUCHED |
