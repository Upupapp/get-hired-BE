# GetHired Employer Job Posting Flow Map V4

**Document:** GETHIRED_EMPLOYER_JOB_POSTING_FLOW_MAP_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Complete job create, edit, publish, draft, and delete flows. Covers stepper logic, form validation gates, state management, subscription gating, and known gaps.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Job Create Flow](#2-job-create-flow)
3. [Step 1: Job Details](#3-step-1-job-details)
4. [Step 2: Rates and Roles](#4-step-2-rates-and-roles)
5. [Step 3: Create Interview](#5-step-3-create-interview)
6. [Step 4: Preview](#6-step-4-preview)
7. [Save Draft Flow](#7-save-draft-flow)
8. [Publish Flow](#8-publish-flow)
9. [Edit Flow](#9-edit-flow)
10. [Delete / Archive Flow](#10-delete--archive-flow)
11. [Status Change Flow](#11-status-change-flow)
12. [Subscription Gate](#12-subscription-gate)
13. [State Management](#13-state-management)
14. [Backend Endpoints](#14-backend-endpoints)
15. [Known Gaps](#15-known-gaps)

---

## 1. Overview

The job posting flow is built around a 4-step stepper implemented in `EmployerJobcreateComponent` -> `<app-job-create>`.

**Entry points:**
- `/recruiter/jobs/create` (new job)
- `/recruiter/jobs/edit?id={jobId}` (edit existing job)

**Exit points:**
- Save as Draft -> navigate to `/recruiter/jobs/list`
- Publish -> navigate to `/recruiter/jobs/list`
- Cancel -> `jobFacade.resetFormState()` + navigate back

**State management:** NgRx via `JobFacade`. Form state is held in the facade and synced to the 4-step form.

---

## 2. Job Create Flow

```
/recruiter/jobs/create
    |
    v
EmployerJobcreateComponent -> <app-job-create>
    |
    +-- Load lookup data (job types, levels, categories, work setups, etc.)
    |
    +-- Subscription check: if job post limit reached -> SubscriptionAlertComponent, block flow
    |
    +-- Step 1: Job Details
    |       |
    |       +-- initialFormValid? (jobTitle + jobCity + jobCountry all present)
    |       +-- YES -> Step 2 unlocked
    |       +-- NO  -> Step 2 blocked
    |
    +-- Step 2: Rates and Roles
    |       |
    |       +-- jobInfoValid? (Step 1 valid + Step 2 complete)
    |       +-- YES -> Steps 3 and 4 unlocked
    |       +-- NO  -> Steps 3 and 4 blocked
    |
    +-- Step 3: Create Interview
    |       |
    |       +-- interviewQuestions.length > 0? (required to publish)
    |       +-- YES -> Publish enabled
    |       +-- NO  -> Publish blocked (Save Draft still available)
    |
    +-- Step 4: Preview
            |
            +-- "Save Draft" -> jobStatusId=1
            +-- "Publish"    -> publishJobPost() -> validates all required fields -> jobStatusId=2
            +-- "Cancel"     -> resetFormState() + navigate back
```

---

## 3. Step 1: Job Details

**Form group:** `initialData` in `<app-job-create>`

| Field | Type | Validation | Required For |
|-------|------|------------|-------------|
| `jobTitle` | string | required | Step 2 unlock |
| `jobCity` | string | required | Step 2 unlock |
| `jobCountry` | string | required | Step 2 unlock |
| `jobTypeId` | reference ID | optional in draft | Required to publish |
| `jobLevelId` | reference ID | optional in draft | Required to publish |
| `workSetupId` | reference ID | optional in draft | Required to publish |
| `jobAddress` | string | optional | Recommended |
| `jobDescription` | string | optional in draft | Required to publish |
| `jobDuties` | string | optional | Recommended |
| `jobCategoryId` | reference ID | optional | Recommended |
| `jobBanner` / `bannerFile` | file/URL | optional in draft | Required to publish |
| `badges[]` | array | optional | Recommended |
| `requirements[]` | array | optional | Recommended |
| `goodToHave[]` | array | optional | Recommended |
| `educationalBackground[]` | array | optional | Recommended |
| `certificationRequirements[]` | FormArray | optional | Recommended (v1 present) |

**Validation gate:** `initialFormValid = jobTitle && jobCity && jobCountry`

**Certification requirements FormArray (v1):**

Each entry in `certificationRequirements[]`:
| Field | Type | Default | Required |
|-------|------|---------|----------|
| `name` | string | -- | Yes (within entry) |
| `type` | string | `'certification'` | No |
| `importance` | string | `'required'` | No |
| `issuingAuthority` | string | -- | No |
| `expiryRequired` | boolean | -- | No |
| `verificationRequired` | boolean | -- | No |

Employers can add multiple certification requirements. These are stored and displayed in the job view. MATCH scoring against certification requirements is NOT implemented and must not be wired.

---

## 4. Step 2: Rates and Roles

**Form group:** Part of the main job form

| Field | Type | Required |
|-------|------|----------|
| `industryId` | reference ID | Recommended |
| `jobRoleId` | reference ID | Recommended |
| `skills[]` | array of skill objects | Recommended |
| `tags[]` | array of strings | Recommended |
| `rate` | string/enum | Recommended |
| `salaryMinimum` | number | Recommended |
| `salaryMaximum` | number | Recommended |
| `salaryCurrency` | string | Recommended |

**Validation gate:** `jobInfoValid = initialFormValid && (Step 2 fields filled to satisfaction)`

When `jobInfoValid` is true, Steps 3 and 4 become accessible in the stepper.

---

## 5. Step 3: Create Interview

**Form group:** `interviewQuestions` FormArray

Each interview question entry:
| Field | Type | Notes |
|-------|------|-------|
| `questionId` | ID | Set on save |
| `question` | string | The prompt shown to applicants |
| `answerDuration` | number | Max video response duration in seconds |
| `retakes` | number | How many retakes allowed |
| `sequence` | number | Display order |

**Template picker:** `interviewTemplateId` allows loading a pre-built set of questions.

**Publish gate:** `interviewQuestions.length > 0` is required to publish. This is a hard gate; there is no way to publish without at least one interview question.

**Save Draft:** Does not require interview questions. A draft job with zero interview questions is valid.

---

## 6. Step 4: Preview

Step 4 shows a full preview of the job post as it will appear publicly.

**Available actions:**

| Action | Method | Result |
|--------|--------|--------|
| Save Draft | `saveJobAsDraft()` | `jobStatusId=1`, dialog, navigate to `/recruiter/jobs/list` |
| Publish | `publishJobPost()` | Validates all required fields, `jobStatusId=2`, snackbar, navigate to `/recruiter/jobs/list` |
| Cancel | `jobFacade.resetFormState()` | State cleared, navigate back |

---

## 7. Save Draft Flow

1. Employer clicks "Save Draft" (available at any step after Step 1 is valid, confirmed in Step 4).
2. `saveJobAsDraft()` called.
3. Job saved via `POST /job/create` (new) or `PUT /job/updatejobs` (edit) with `jobStatusId=1`.
4. Confirmation dialog shown.
5. Navigate to `/recruiter/jobs/list`.
6. Draft appears in job list with "Draft" status.

**Note:** There is no auto-save. If the employer navigates away without clicking "Save Draft", all form data is lost. There is no unsaved-changes warning or navigation guard.

---

## 8. Publish Flow

1. Employer clicks "Publish" in Step 4.
2. `publishJobPost()` evaluates required fields:
   - `jobTitle`, `jobCity`, `jobCountry` (from Step 1 gate)
   - `jobTypeId`, `jobLevelId`, `workSetupId`, `jobDescription`, `bannerFile`/`jobBanner`
   - `interviewQuestions.length > 0`
3. If any required field is missing:
   - Snackbar shown: "Missing: [field list]"
   - **BUG:** Snackbar uses `success-snackbar` CSS class -- wrong color for an error state. Should use error/warning class.
   - Flow stops. Employer must fix missing fields.
4. If all required fields are present:
   - API call: `POST /job/create` or `PUT /job/updatejobs` with `jobStatusId=2`.
   - On success: snackbar (success), navigate to `/recruiter/jobs/list`.
   - On API error: error state shown in form. No auto-retry.
5. Subscription gate: if employer's job post count is at their subscription limit, `SubscriptionAlertComponent` is shown before the API call. The employer must upgrade to publish.

---

## 9. Edit Flow

**Entry:** `/recruiter/jobs/edit?id={jobId}`

**Component:** Same `EmployerJobcreateComponent` as create, but loaded with existing job data.

**Load sequence:**

1. Component reads `id` from query params.
2. `jobFacade.getJobById(id)` dispatches load action.
3. NgRx effect fetches job from backend.
4. Form is pre-populated with existing job data.
5. 4-step stepper displayed with existing values.

**Validation:** Same as create. Existing required fields are pre-filled and count toward gate validation.

**Save after edit:**
- "Save Draft" -> `PUT /job/updatejobs` with `jobStatusId=1`
- "Publish" -> `PUT /job/updatejobs` with `jobStatusId=2`

**Note:** Editing a published job (`jobStatusId=2`) and saving as draft will unpublish it. The employer should be warned, but no such warning is confirmed in the codebase.

---

## 10. Delete / Archive Flow

Jobs are not hard-deleted. They are archived by setting `jobStatusId=4`.

**Trigger:** Job list (`JobListComponent`) row action -> delete/archive action.

**Confirmation:** `ConfirmationDialogComponent` shown. Employer must confirm.

**API call:** `PUT /job/changestatus` with `{ jobId, status: 4 }` (or equivalent).

**Result:** Job removed from active job list. Does not appear in `/recruiter/jobs/list` default view.

**Note:** Status 4 appears to be the archive/deleted status. Applicants on archived jobs are still accessible via the applicants route if the employer has the `jobId`.

---

## 11. Status Change Flow

Job statuses used in the posting flow:

| statusId | Label | Description |
|----------|-------|-------------|
| 1 | Draft | Saved but not published |
| 2 | Published / Active | Visible to applicants |
| 3 | Expired | Past expiry date |
| 4 | Archived | Employer-deleted / soft-deleted |

**Status change endpoint:** `PUT /job/changestatus`

**Payload:** `{ jobId, status }` (exact field names to confirm against controller).

---

## 12. Subscription Gate

**Trigger:** Employer attempts to publish a job but has reached their subscription job post limit.

**Component:** `SubscriptionAlertComponent`

**Behavior:**
1. Gate is checked before API call.
2. `SubscriptionAlertComponent` is shown (modal or inline alert).
3. Employer directed to `/recruiter/subscription` to upgrade.
4. Publish is blocked until subscription is upgraded.

---

## 13. State Management

**Facade:** `JobFacade` (NgRx)

**Key actions dispatched:**
- Load job by ID (for edit flow)
- Save job (create / update)
- Reset form state (on cancel)
- Change job status

**Key selectors:**
- `initialFormValid` -- gates Step 2
- `jobInfoValid` -- gates Steps 3 and 4
- Current job data (for edit pre-population)
- Loading and error states

**Note:** NgRx state is cleared by `jobFacade.resetFormState()` on cancel. Navigating away without cancel does NOT clear state, which could cause stale data in subsequent visits to the create page within the same session. No confirmation of session-level state persistence was found.

---

## 14. Backend Endpoints

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Create job | POST | `/job/create` | Handles `certificationRequirements` via `saveJobArray` |
| Update job | PUT | `/job/updatejobs` | Same controller pattern as create |
| Change status | PUT | `/job/changestatus` | Used for publish, expire, archive |
| Get job by ID | GET | (via JobFacade) | Used in edit flow |

**Backend handling of certificationRequirements:**
The `createJobs` controller receives the `certificationRequirements` array and calls `saveJobArray` to persist it. The exact table and column structure should be confirmed in the backend controller before making any changes.

---

## 15. Known Gaps

| # | Gap | Priority | Type |
|---|-----|----------|------|
| 1 | Publish-blocked snackbar uses `success-snackbar` class (wrong color) | High | Bug |
| 2 | No auto-save for job form | Medium | Missing feature |
| 3 | No unsaved-changes warning when navigating away | Medium | Missing feature |
| 4 | After publish, employer lands on job list not job-level page | Medium | UX gap |
| 5 | `inviteApplicant()` is an empty TODO | Low | Unimplemented |
| 6 | No draft auto-save interval | Medium | Missing feature |
| 7 | Editing a published job to draft: no warning that it will be unpublished | Medium | Missing |
| 8 | No per-step progress indicator showing completion percentage | Low | Enhancement |
| 9 | No sticky save/publish action bar (only available in Step 4) | Low | Enhancement |
