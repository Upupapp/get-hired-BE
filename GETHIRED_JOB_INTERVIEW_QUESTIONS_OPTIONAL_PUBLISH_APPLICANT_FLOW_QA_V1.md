# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — APPLICANT FLOW QA V1

## Date: 2026-06-25

---

## QA CHECKLIST: APPLICANT APPLICATION FLOW

### Scenario A: Job published WITH interview questions

| Check | Result | Evidence |
|---|---|---|
| Applicant sees Step 3 (Interview) in stepper | PASS | `stepperItems[2].disabled = !user \|\| job.interviewQuestions.length == 0` — length > 0 → not disabled |
| Questions appear in `app-interview-questions` | PASS | `[interviews]="job.interviewQuestions"` — passed through unchanged |
| Video recording via `app-record-interview` | PASS | Component and all child components untouched |
| Applicant can record / upload answer per question | PASS | `record-interview.component` not modified |
| Answers appear in "Answers" tab | PASS | `interviewAnswers.controls` binding unchanged |
| Answers submitted with application | PASS | `interviewAnswers` FormArray included in `submitApplication()` — unchanged |

### Scenario B: Job published WITHOUT interview questions

| Check | Result | Evidence |
|---|---|---|
| Applicant does NOT see blank Step 3 | PASS | `stepperItems[2].disabled = !user \|\| job.interviewQuestions.length == 0` — length = 0 → step disabled; stepper skips it |
| Applicant can still reach Step 4 (Summary) | PASS | Step 4 is not gated on interview step completion |
| Applicant can submit application | PASS | `submitApplication()` sends `interviewAnswers: []` — backend accepts empty array |
| No blank question slots shown | PASS | `app-interview-questions` receives empty array — renders nothing; and step is disabled so applicant never reaches it |
| Application-preview (Step 4) with no questions | PASS | `app-application-preview [interviews]="job.interviewQuestions"` — receives empty array, preview component handles gracefully |

### Scenario C: Job starts with questions, employer removes all questions, republishes

| Check | Result | Evidence |
|---|---|---|
| Employer can delete all questions via "Delete" in Step 3 | PASS | `removeItem()` calls `deleteJobInterview(questionId, jobId)` — unchanged |
| After all deleted, Step 3 shows empty state | PASS | New `interview-empty-state` card renders when `questionsContainer.length === 0` |
| Employer can still advance to Step 4 | PASS | `interviewValid` tied to jobInfo, not question count |
| Preview shows no-questions empty state | PASS | `#noQuestions` template renders |
| Republish succeeds | PASS | `publishJobPost()` does not check question count |

### Scenario D: Employer answer review

| Check | Result | Evidence |
|---|---|---|
| Employer reviews submitted video answers | PASS | `candidate-list.component`, `job-applicants.component` — not touched |
| `applicationOfApplicant` returns interview questions + answers | PASS | `job.service.js` unchanged |
| Cross-company access blocked | PASS | `getJobCompanyId` + `getUserCompany` ownership check in `getJobApplicantDetails` — unchanged |

---

## VERDICT

All applicant flow scenarios PASS. No regressions introduced. The only behavioral change to applicant flow is cosmetic: when a job has no questions, the stepper's Interview step was already disabled before this session (as verified in existing code). This session adds no new behavior to applicant flow.
