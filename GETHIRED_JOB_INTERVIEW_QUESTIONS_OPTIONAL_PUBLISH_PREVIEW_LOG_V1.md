# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — PREVIEW LOG V1

## Date: 2026-06-25

---

## PREVIEW STEP (STEP 4) — INTERVIEW QUESTIONS SECTION

### Before B04
- Section header: "Interview Questions (Candidate view)" with "Optional" text toggled by `preview.isInterviewRequired` (always false → always showed "Optional" text as a float-end span — but it was styled `.d-none` when `isInterviewRequired` was true, so when it's false the span was visible but plain unstyled).
- Body: `*ngFor` over `preview.interviewQuestions` — produced no output when array was empty. No message to employer.
- Employer sees: blank section below the heading. Confusing — unclear if this is correct.

### After B04
- Section header: "Interview Questions (Candidate view)" + "Optional for publishing" badge (styled blue pill, always visible)
- Body: `*ngIf` guards the `*ngFor`. When `preview.interviewQuestions.length === 0`, `ng-template #noQuestions` renders:
  - "No interview questions added yet."
  - "You can publish now and add questions later. Applicants can still apply to this job."
- Old `span[isInterviewRequired]` removed (was functionally dead — `isInterviewRequired` is hardcoded `false` in `preview-job-post-step.component.ts` line 58).

### Animation
- Preview card section wrapped in `[@animate]` with 200ms delay for consistent reveal.
- Empty-state block has its own `[@animate]` with 250ms delay.
- Both reduced-motion-safe (animation library respects `prefers-reduced-motion` via `mainAnimations`).

### Employer UX flow with B04
1. Employer creates a job without adding any questions.
2. Proceeds to Step 4 (Preview).
3. Sees the interview section showing "No interview questions added yet. You can publish now and add questions later."
4. Clicks "Publish Job Post" → job publishes normally.
5. If employer later edits the job and returns to Step 3, the add-question form is still present with the same UX.
