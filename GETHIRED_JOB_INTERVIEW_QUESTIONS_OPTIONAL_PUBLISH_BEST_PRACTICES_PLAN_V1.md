# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — BEST PRACTICES PLAN V1

## Date: 2026-06-25

---

## APPROACH

The standard best practice for optional sections in multi-step job builders is:
1. Remove the section from required validation
2. Clearly label the section as optional with a persistent badge
3. Provide an empty-state with actionable guidance ("you can publish now and add later")
4. Show the optional status in the preview step so the employer knows what the applicant will see
5. Preserve all add/edit/delete functionality in the section

## IMPLEMENTATION CHOSEN

### Step 3 — Interview Questions card
- Added "Optional for publishing" badge (blue pill, reduced-motion-safe entry transition)
- Added hint copy beneath the heading explaining purpose and privacy
- Added empty-state card (dashed border, centered copy) when `questionsContainer.length === 0`
- All question add/edit/delete controls remain untouched

### Step 4 — Preview
- Added "Optional for publishing" badge alongside the Interview Questions label
- Added empty-state block (`ng-template #noQuestions`) when `preview.interviewQuestions` is empty
- Used Angular `*ngIf / ng-template` pattern (no structural changes to question rendering)

### Publish button
- Added micro-scale `:active` press effect (`:active { transform: scale(0.97) }`) in `job-create.component.scss`, reduced-motion-safe

### No changes to:
- `publishJobPost()` validation logic (interview questions already absent from gate)
- `interviewValid` wiring (already driven by `jobInfo` status)
- Any BE controller or service
- Applicant application flow
- Employer answer review

## COPY STANDARDS APPLIED

Used only approved copy from the command brief:
- "Optional for publishing"
- "Add interview questions to guide applicant responses."
- "Applicants may answer these questions by video as part of their application."
- "Video answers are reviewed by employers and are not automatically scored."
- "You can publish now and add questions later."

Zero forbidden phrases: no "AI evaluates", "auto-screen", "automatically rank", "voice/accent/emotion/personality", "missing questions lower match score".
