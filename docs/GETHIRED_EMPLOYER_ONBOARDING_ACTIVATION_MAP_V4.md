# GetHired Employer Onboarding and Activation Map V4

**Document:** GETHIRED_EMPLOYER_ONBOARDING_ACTIVATION_MAP_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Activation definition, checklist items, detection methods, CTAs, success/error states, and safe improvement recommendations for the employer onboarding experience.

---

## Table of Contents

1. [Activation Definition](#1-activation-definition)
2. [Activation Checklist](#2-activation-checklist)
3. [Checklist Item Detail](#3-checklist-item-detail)
4. [Detection Implementation](#4-detection-implementation)
5. [Post-Publish Gap](#5-post-publish-gap)
6. [Safe Improvements](#6-safe-improvements)

---

## 1. Activation Definition

**Activation goal:** An employer is considered activated when they have published a complete job posting and viewed their applicant list for that job.

This represents the moment the employer has received value from the platform: their job is visible to talent and they are engaged with the recruitment workflow.

**Activation event sequence:**

1. Account created (email + password)
2. Email verified
3. Company profile complete (name, logo, description, city)
4. First job draft created
5. All publish-required fields filled
6. Job published (jobStatusId=2)
7. Applicant list viewed for the published job

No persistent activation event is fired in the current codebase. Activation is inferred from the presence of published jobs and viewed applicant states at dashboard load time.

---

## 2. Activation Checklist

The following items represent the complete activation path. Items marked **Required** must be completed before a job can be published. Items marked **Recommended** improve job quality but do not block publishing.

| # | Checklist Item | Status Gate | Required / Recommended |
|---|---------------|-------------|------------------------|
| 1 | Account created | Signup complete | Required |
| 2 | Email verified | Session active after verify | Required |
| 3 | Company name set | `user.companyId` present in localStorage | Required (implicit) |
| 4 | Company logo uploaded | `companyLogoUrl` present in dashboard data | Recommended (flagged by dashboard) |
| 5 | Company description filled | `companyDetails` present in dashboard data | Recommended (flagged by dashboard) |
| 6 | Company city set | `companyCity` present in dashboard data | Recommended (flagged by dashboard) |
| 7 | First job created (draft) | `jobStatusId=1` in job list | Required (step toward publish) |
| 8 | Job title set | `jobTitle` in `initialData` form group | Required to advance to Step 2 |
| 9 | Job city set | `jobCity` in `initialData` form group | Required to advance to Step 2 |
| 10 | Job country set | `jobCountry` in `initialData` form group | Required to advance to Step 2 |
| 11 | Job type, level, work setup set | `jobTypeId`, `jobLevelId`, `workSetupId` in Step 1 | Required to publish |
| 12 | Job description written | `jobDescription` in Step 1 | Required to publish |
| 13 | Job banner uploaded | `bannerFile` / `jobBanner` in Step 1 | Required to publish |
| 14 | At least one interview question added | `interviewQuestions.length > 0` in Step 3 | Required to publish (hard gate) |
| 15 | Job published | `jobStatusId=2` | Required for activation |
| 16 | Applicant list viewed | Navigation to `/recruiter/jobs/applicants?id=` | Required for full activation |

---

## 3. Checklist Item Detail

### Item 3: Company name / companyId

**Detection method:** `localStorage` user object -- `companyId` field.
**CTA:** None explicit. If `companyId` is null, `CompanyNotSetupComponent` dialog appears.
**Route/Component:** Dialog -> `redirectToSetup()` -> (BUG: navigate commented out).
**Completion criteria:** `companyId` is non-null and non-empty in user localStorage.
**Fallback:** `CompanyNotSetupComponent` dialog. Currently broken: dialog closes but employer is stranded with no navigation to company setup.
**Success state:** `companyId` present, employer can proceed to job create.
**Error state:** null `companyId` causes API errors in job create (companyId sent as null).

---

### Items 4-6: Company logo, description, city

**Detection method:** `companyProfileMissingFields()` in `company-dashboard.component.ts`.

This method checks the dashboard data object for:
- `companyLogoUrl` (logo)
- `companyDetails` (description)
- `companyCity` (city)

Any of these that are falsy are included in the returned `missingFields` array.

**CTA:** Action center card "Complete your company profile" appears when `missingFields.length > 0`.
**Route/Component:** `/recruiter/company/details` -> `EmployerCompanyComponent` -> `<app-company-details>`.
**Completion criteria:** All three fields are present in dashboard API response.
**Fallback:** No fallback beyond the action center card. No inline editing on the dashboard.
**Success state:** Action center "Complete your company profile" card disappears.
**Error state:** API error loading dashboard data -> pipelineError state, retry available.
**Motion/Effect:** Action center card uses `.emp-dash-action-card--urgent` pulsing style for highest-priority items. The company profile card is not styled as urgent unless combined with `needsReviewCount > 0`.

---

### Items 7-13: Job creation steps

**Detection method:** `JobFacade` (NgRx store) tracks job form state. `initialFormValid` computed from `jobTitle`, `jobCity`, `jobCountry` presence.

**CTA:** "Create a job" from dashboard action center card ("Manage your jobs" always visible) or sidebar Jobs menu.
**Route/Component:** `/recruiter/jobs/create` -> `EmployerJobcreateComponent` -> `<app-job-create>`.
**Completion criteria by step:**
- Step 1 complete: `initialFormValid = true` (title, city, country)
- Step 2 complete: `jobInfoValid = true` (gates Steps 3 and 4)
- Step 3 complete: `interviewQuestions.length > 0`
- Step 4 complete: all publish-required fields present

**Fallback:** Step navigation blocked if prior step validation fails. Snackbar lists missing fields on publish attempt (with wrong CSS class bug).
**Success state:** Job saved as draft (jobStatusId=1) or published (jobStatusId=2).
**Error state:** Validation snackbar (wrong color), subscription gate `SubscriptionAlertComponent` if limit reached.

---

### Item 14: Interview questions required

**Detection method:** `interviewQuestions` FormArray in `<app-job-create>` Step 3. Publish gated on `interviewQuestions.length > 0`.
**CTA:** Step 3 UI prompts employer to add questions. Template picker available via `interviewTemplateId`.
**Completion criteria:** At least one question object in FormArray.
**Fallback:** Publish button blocked; employer must add a question. No way to bypass this gate.
**Note:** This is a hard product constraint, not a bug. However, it may create friction for employers who want to assess candidates via other means.

---

### Item 15: Job published

**Detection method:** `jobStatusId=2` in job record. `JobFacade` state updated after successful API response.
**CTA:** "Publish" button in Step 4.
**Route:** Backend: `POST /job/create` or `PUT /job/updatejobs`. Frontend state: `JobFacade`.
**Completion criteria:** Backend returns success, `jobStatusId=2` in response.
**Fallback:** API error -> error state in form, no auto-retry.
**Success state:** Snackbar (success), navigate to `/recruiter/jobs/list`.
**Error state:** API failure shows error state. Subscription limit shows `SubscriptionAlertComponent`.
**Motion/Effect:** `HapticFeedbackService.jobPublished()` should fire on publish success (confirm in component).

---

### Item 16: Applicant list viewed

**Detection method:** None. No tracking event for "applicant list first viewed" confirmed in the codebase.
**CTA:** Dashboard "Review new applicants" (when `needsReviewCount > 0`) or job list row action "View Applicants".
**Route/Component:** `/recruiter/jobs/applicants?id={jobId}` -> `EmployerApplicantsComponent` -> `<app-job-applicants>`.
**Completion criteria:** Employer navigates to and renders the applicant list for their published job.
**Fallback:** No applicants yet -> `<app-empty-section>` with "No applicants yet".
**Success state:** Employer sees applicant list and can begin review.

---

## 4. Detection Implementation

### companyProfileMissingFields()

Located in `company-dashboard.component.ts`. Called during dashboard initialization.

The method returns an array of field names that are falsy in the dashboard data. The action center renders one CTA card for company profile completion when this array is non-empty.

**Current limitations:**

- Detection is runtime-only. There is no persistent checklist stored per employer.
- The check runs against the dashboard API response. If the API is slow or errors, the missing fields detection fails silently (pipeline error state shown instead).
- The method does not check all possible company fields -- only logo, description, and city.

### localStorage companyId check

Job create reads `companyId` from the stored user object in localStorage. This is the only gate between "account created" and "can create a job". If the company was created successfully but the user object in localStorage is stale, this check will fail even though the company exists in the database.

---

## 5. Post-Publish Gap

**Current behavior:** After a job is successfully published, the employer is navigated to `/recruiter/jobs/list`.

**Gap:** The job list shows all jobs. The employer has no immediate path to:
- A job-level dashboard for the job they just published
- A share link for the job
- A preview of the public-facing job post
- A prompt to share on LinkedIn or other channels

**Expected behavior (safe improvement, not yet implemented):** After publish, navigate to the job view page (`/recruiter/jobs/view?id={jobId}`) with a success state that shows share options and a link to view the applicant list.

---

## 6. Safe Improvements

The following improvements address confirmed gaps without introducing new features or changing business logic.

### 6.1 Fix company-not-setup redirect (Bug fix, high priority)

**File:** The component handling `CompanyNotSetupComponent` dialog.
**Change:** Uncomment and implement the `navigate` call inside `redirectToSetup()` to route to `/recruiter/company/details`.
**Risk:** Low. The navigate call was intentionally present and was commented out, likely during a refactor. Restoring it closes a confirmed stranded-employer scenario.

### 6.2 Improve action center messaging

**Current:** "Complete your company profile" shows when any of logo/description/city is missing.
**Improvement:** Show the specific missing field(s) in the card subtitle so the employer knows exactly what to fix. Example: "Missing: company logo, city."
**Risk:** Low. UI copy change only.

### 6.3 Add "Required to publish" label to Step 3

**Current:** Step 3 has no label indicating interview questions are required to publish.
**Improvement:** Add a note near the "Add questions" area: "At least one interview question is required to publish this job."
**Risk:** Low. Copy addition only.

### 6.4 Fix publish-blocked snackbar CSS class (Bug fix, medium priority)

**File:** `job-create.component.ts` `publishJobPost()` method.
**Change:** Replace `success-snackbar` with the correct error/warning snackbar class on the publish-blocked snackbar call.
**Risk:** Low. CSS class name change only; no logic change.

### 6.5 Persist onboarding state (Backlog, medium effort)

**Current:** No persistent onboarding checklist exists.
**Improvement:** Add a dismissible onboarding checklist component to the dashboard that persists completion state (e.g., in localStorage or via a backend endpoint). Each item links to the relevant route.
**Risk:** Medium. Requires UI work and optionally a backend endpoint.
**Note:** Do not add AI-generated recommendations or fake quality scores. Checklist items should map 1:1 to real detected state.
