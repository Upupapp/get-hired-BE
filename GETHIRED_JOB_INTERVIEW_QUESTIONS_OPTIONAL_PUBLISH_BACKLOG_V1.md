# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — BACKLOG V1

## Date: 2026-06-25

---

## DEFERRED / OUT OF SCOPE

### B01 — Interview question template library
The system has `interviewTemplateId` in the job form and `createInterviewTemplateQuestions`. A template selector UI (e.g. "Start from a template") is not implemented. Employers currently add questions manually only.

**Priority**: Medium. Would improve employer adoption of interview questions.

### B02 — Applicant interview step flow polish for empty questions
When a job has no questions, the applicant's Step 3 stepper button is `disabled`. The stepper does not visually skip the step or show why it's unavailable. A "No interview questions for this job" notice in the stepper would improve UX.

**Priority**: Low. Step is disabled so applicants never reach a dead end.

### B03 — Employer notification when adding questions to a published job
When an employer adds interview questions to an already-published job, applicants who applied before questions were added will not have answered them. No notification or flag exists.

**Priority**: Medium. Edge case but potentially confusing for employers reviewing applicants.

### B04 (THIS SESSION) — COMPLETE

### B05 — "Skip interview" flow for applicant
When Step 3 is disabled for applicant (no questions), the InterviewNotification dialog still opens when `changeStep(3)` is called. The dialog has a "Skip" button — this works correctly, but the dialog should not open at all when the job has no questions.

**File**: `application-process.component.ts` line 194 — `if (step === 3) { this.openInterviewNotification() }` runs even when step 3 is disabled.

**Priority**: Low. Applicant can always skip.

### B06 — Validation summary panel in preview
The preview step could show a "Ready to publish" checklist with required fields checked and interview questions labeled "Optional (not added)". Currently there is only the matchability card.

**Priority**: Low. Current snackbar on failed publish attempt covers the case.
