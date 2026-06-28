# GETHIRED_JOB_READINESS_INTERVIEW_VIDEO_PRESERVATION_LOG_V1

## B04 Rule
"Interview/video questions are OPTIONAL for publishing. This rule MUST be preserved."

## Evidence of Preservation

### 1. JobReadinessService.evaluate()
`interviewQuestions` is checked only in `pushRec()` (recommended bucket), NOT in `pushRequired()`.
The blocking items array NEVER contains an interview/video check.
`canPublish` computation depends only on required checks — interview is not one of them.

### 2. Optional items list
`optionalItems` includes "Video questions optional" as a static entry.

### 3. job-create.component.ts (original code preserved)
The commented-out interview validation block (lines 247-254) remains commented out.
`interviewValid` is set by `jobInfoValid` (step 2), not by interview step itself.
The interview step is navigable but does not gate the preview step or publish.

### 4. create-interview.component.ts
NOT modified. Interview question create/edit flow unchanged.

### 5. preview-job-post-step.component.html (existing B04 markers)
The existing B04 badges and empty states are preserved:
- `<span class="preview-optional-badge">Optional for publishing</span>` — unchanged
- `#noQuestions` template: "You can publish now and add questions later." — unchanged

### 6. Application video answer flow
`src/app/application/application-process/steps/interview-questions/` — NOT modified.
Applicant video-answer flow fully preserved.

### 7. B04 chip in readiness chips
When interview questions are present → "Interview questions" appears in completedItems (green chip, confirmation only).
When absent → "Interview questions" appears in recommendationItems (amber chip, optional suggestion).
NEVER appears in blockingItems.

## Self-test assertion
If any future change accidentally adds interviewQuestions to the `pushRequired()` call,
it would be caught because `canPublish` would suddenly become false even when all other
fields are filled — a very visible regression in the builder and preview.
