# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — FIX LOG V1

## Date: 2026-06-25

---

## FIXES APPLIED THIS SESSION

### FIX 1: Optional badge + hint copy in Step 3 (create-interview.component.html)
- **Problem**: No indication that interview questions are optional. Employer might think they are required to publish.
- **Fix**: Added "Optional for publishing" badge (blue pill) and hint text beneath the section heading.
- **Files**: `create-interview.component.html`, `create-interview.component.scss`

### FIX 2: Empty state in Step 3 when no questions added
- **Problem**: When employer has zero questions, the card below the add-question form is blank — confusing.
- **Fix**: Added `interview-empty-state` card with icon + "No interview questions added yet. You can publish now and add questions later."
- **Condition**: `*ngIf="interviewQuestions && questionsContainer.length === 0"`
- **Files**: `create-interview.component.html`, `create-interview.component.scss`

### FIX 3: Optional badge + empty state in Step 4 Preview (preview-job-post-step.component.html)
- **Problem**: Preview's interview questions section showed nothing when empty — employer saw a blank area with just a heading.
- **Fix**: Added "Optional for publishing" badge + `ng-template #noQuestions` with guidance text.
- **Files**: `preview-job-post-step.component.html`, `preview-job-post-step.component.scss`

### FIX 4: Removed dead `isInterviewRequired` span from preview
- **Problem**: Preview had `<span [ngClass]="preview.isInterviewRequired ? 'd-none' : 'float-end'">{{ preview.isInterviewRequired ? 'Required': 'Optional'}}</span>` — `isInterviewRequired` is hardcoded `false` in the component, so this always showed unstyled "Optional" text floated right. Replaced by the proper badge.
- **Files**: `preview-job-post-step.component.html`

### FIX 5: Micro-scale press effect on publish/next buttons
- **Problem**: No tactile visual feedback on button press.
- **Fix**: Added `.btn-add-service:active { transform: scale(0.97) }` (reduced-motion-safe).
- **Files**: `job-create.component.scss`

### FIX 6: Micro-scale press effect on record/delete buttons in Step 3
- **Problem**: No press feedback on question action buttons.
- **Fix**: Added `.btn-record:active { transform: scale(0.97) }` (reduced-motion-safe).
- **Files**: `create-interview.component.scss`

---

## ISSUES FOUND BUT NOT FIXED (HARD EXCLUSION LIST)

None. All issues found were in scope and have been fixed.

---

## PRE-EXISTING STATE: ALREADY CORRECT (NO FIX NEEDED)

- `publishJobPost()` already excludes interview questions from `isReadyToPublish`
- `interviewValid` already wired to jobInfo, not interview form
- Step 3 stepper title already reads "Create Interview (Optional)"
- BE `createJobs` / `updateJob` / `updateStatusOfJob` never required questions
- Applicant flow already disables Interview step when questions array is empty
