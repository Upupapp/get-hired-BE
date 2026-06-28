# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — CURRENT STATE AUDIT V1

## Audit Date: 2026-06-25
## Command: GETHIRED_JOB_BUILDER_INTERVIEW_QUESTIONS_OPTIONAL_PUBLISH_B04_WORLD_CLASS_TECHY_V1

---

## 1. WHERE THE HARD GATE EXISTED (B04 DISCOVERY)

### Frontend — `publishJobPost()` in `job-create.component.ts`
**Status: Gate was already partially removed in a prior pass (comment: "B04 V5").**

The `isReadyToPublish` check (lines 366–375) does NOT include interview questions:

```typescript
this.isReadyToPublish = !!(
  job.jobTypeId &&
  job.jobLevelId &&
  job.jobCity != null && job.jobCity !== '' &&
  job.jobCountry != null && job.jobCountry !== '' &&
  job.jobDescription != null && job.jobDescription !== '' &&
  job.workSetupId &&
  (job.bannerFile[0] || job.jobBanner != "") &&
  job.companyId
)
```
Interview questions: NOT present. Gate was removed before this session.

### Frontend — `interviewValid` stepper gate (residual concern)
**Status: Correctly wired to `jobInfo` validity, not interview questions.**

Lines 234–243: `interviewValid` is set from `jobInfo.statusChanges` (the Rates & Roles form), not from the interview FormArray. The interview form subscription is commented out with label "Made Interview Optional". This means:
- "Next: Preview Job Post" button (`[disabled]="!interviewValid"`) is unlocked as soon as jobInfo is valid, regardless of interview questions count.
- No blocker remains at the stepper navigation level.

### Frontend — `create-interview.component.html`
**Status pre-fix: No "optional" label, no empty state.** Employer could add questions but there was no indication questions were optional, and no empty-state guidance when zero questions existed.

### Frontend — `preview-job-post-step.component.html`
**Status pre-fix: No empty state.** The `*ngFor` over `preview.interviewQuestions` simply showed nothing when questions array was empty — no label, no guidance for the employer in preview.

### Backend — `jobsController.js` `createJobs` / `updateJob`
**Status: No publish gate for interview questions ever existed.**

```javascript
if (interviewQuestions && interviewQuestions.length != 0) {
  // create template + questions
}
```
Questions are saved only when provided. No validation requiring questions before accepting `jobStatusId=2` (published). Backend requires no change.

---

## 2. HOW INTERVIEW/VIDEO QUESTIONS ARE STORED

- Field name in FE payload: `interviewQuestions` (array of objects)
- Each question: `{ question, answerDuration, retakes, sequence, questionId? }`
- BE tables: `job_interview_template` (template header) + `interview_template_question` (rows)
- Template name: always "default"
- Questions fetched via `getJobInterviewQuestions(jobId, "default")` in `mappedJob`
- Applicant answers: `interview_answers` table (`question_id`, `answer_url`, `applicant_id`, `job_id`)

---

## 3. APPLICANT FLOW

File: `application-process.component.ts` line 104:
```typescript
this.stepperItems[2].disabled = !user || this.job && this.job.interviewQuestions.length == 0;
```
Interview step is **disabled** for applicants when no questions exist. This is correct: the step is meaningless if no questions have been configured. Applicants skip directly to Preview/Submit. No change needed.

---

## 4. EMPLOYER REVIEW

`job-applicants.component.html` and `candidate-list.component.html` both pass `interviewQuestions` to `app-application-preview`. Works regardless of question count. No change needed.

---

## 5. SUMMARY: WHAT WAS BLOCKING AND WHAT THIS SESSION FIXES

| Location | Was Blocking? | Action |
|---|---|---|
| FE `publishJobPost()` | No (already removed in prior B04 V5 pass) | Add UX polish, documentation |
| FE stepper `interviewValid` | No (already wired to jobInfo) | Documented |
| FE interview step HTML | No gate, but no optional label/empty-state | FIXED: added optional badge + empty state |
| FE preview step HTML | No gate, but no empty-state | FIXED: added optional badge + empty state |
| BE createJobs | Never blocked | Documented, no change |
| BE updateJob | Never blocked | Documented, no change |
