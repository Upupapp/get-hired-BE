# GetHired Employer First-Time and Returning User Flows V4

**Document:** GETHIRED_EMPLOYER_FIRST_TIME_RETURNING_USER_FLOWS_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Employer journey from discovery through active hiring, covering first-time onboarding and five returning-user scenarios.

---

## Table of Contents

1. [First-Time Employer Flow](#1-first-time-employer-flow)
2. [Returning Employer Flows](#2-returning-employer-flows)
   - 2.1 Has Applicants Waiting
   - 2.2 Has Drafts
   - 2.3 Published Job but No Applicants
   - 2.4 Returning After Break
   - 2.5 Expired Jobs
3. [Flow Reference Table](#3-flow-reference-table)

---

## 1. First-Time Employer Flow

### Starting State

The employer has never created a GetHired account. They arrive via organic search, referral, or direct URL at the public marketing page.

### Phase 1: Discovery

| Step | Label | Component | Route | CTA | Notes |
|------|-------|-----------|-------|-----|-------|
| L1 | Land on employer marketing page | `EmployerPortalComponent` | `/employers` | "Start hiring" | Public, no auth required. Page presents pain points, benefits, USP pillars with brand SVG icons, how-it-works steps, FAQ, and a trust strip with 500k talent proof badge. Analytics events fired: `trackTrustStripViewed`, `trackUspSectionViewed`, `trackHowItWorksSectionViewed`. |
| L2 | Read content, scroll page | `EmployerPortalComponent` | `/employers` | FAQ accordion opens | `trackPortalFaqOpened` fires on FAQ interaction. Haptic `selection()` fires on primary CTA interaction. |
| L3 | Click "Start hiring" | `EmployerPortalComponent` | `/employers` -> `/signup?role=2` | "Start hiring" button | Navigates to signup with `role=2` pre-populated. `UnauthGuard` protects this route; an already-authenticated employer is redirected away. |

### Phase 2: Account Creation

| Step | Label | Component | Route | CTA | Notes |
|------|-------|-----------|-------|-----|-------|
| L4 | Complete signup form | `SignupComponent` | `/signup?role=2` | "Create account" | `role=2` pre-populated from query param. Standard email + password fields. |
| L5 | Email verification | Platform verify flow | `/verify` | "Verify email" | `UnauthGuard` allows the verify route in the unauthenticated state. Employer cannot access `/recruiter/*` until verified. |
| L6 | Sign in after verification | `SigninComponent` | `/signin` | "Sign in" | On success, `AuthGuard` reads `role=2` from stored user, routes to `/recruiter/dashboard`. |

**Success state:** Employer is authenticated with `role=2` and lands on `/recruiter/dashboard`.
**Fallback:** Verification email not received -> resend flow (platform-level, not employer-specific).

### Phase 3: Company Profile Completion

| Step | Label | Component | Route | CTA | Notes |
|------|-------|-----------|-------|-----|-------|
| L7 | Land on dashboard, profile incomplete | `EmployerDashboardComponent` -> `<app-company-dashboard>` | `/recruiter/dashboard` | "Complete your company profile" | Dashboard detects missing fields via `companyProfileMissingFields()` which checks `companyLogoUrl`, `companyDetails`, `companyCity`. Action center card appears for each missing category. No persistent checklist UI exists; detection is runtime-only. |
| L8 | Click "Complete your company profile" | `<app-company-dashboard>` | `/recruiter/dashboard` -> `/recruiter/company/details` | "Complete your company profile" action card | Routes to `EmployerCompanyComponent` -> `<app-company-details>`. |

**Success state:** Company logo, description, and city are filled. Dashboard action center no longer shows profile card.
**Fallback (known bug):** If the `CompanyNotSetupComponent` dialog appears (no `companyId` in localStorage user), the "Setup Company" button calls `redirectToSetup()` which closes the dialog but does NOT navigate. The `navigate` call is commented out. Employer is stranded. This is a confirmed bug requiring fix.

### Phase 4: Create First Job

| Step | Label | Component | Route | CTA | Notes |
|------|-------|-----------|-------|-----|-------|
| L9 | Click "Create a job" | Dashboard action center or sidebar | `/recruiter/jobs/create` | "Create a job" | Routes to `EmployerJobcreateComponent` -> `<app-job-create>`. 4-step stepper begins. |
| L10 | Complete Step 1: Job Details | `<app-job-create>` Step 1 | `/recruiter/jobs/create` | "Next" | Required: `jobTitle`, `jobCity`, `jobCountry`. Optional recommended: `jobTypeId`, `jobLevelId`, `jobAddress`, `jobDescription`, `jobDuties`, `jobCategoryId`, `workSetupId`, `badges[]`, `requirements[]`, `goodToHave[]`, `educationalBackground[]`. Certification requirements (`certificationRequirements[]`) can be added here (v1). `initialFormValid` gates progression to Step 2. |
| L11 | Complete Step 2: Rates and Roles | `<app-job-create>` Step 2 | `/recruiter/jobs/create` | "Next" | Fields: `industryId`, `jobRoleId`, `skills[]`, `tags[]`, `rate`, `salaryMinimum`, `salaryMaximum`, `salaryCurrency`. `jobInfoValid` gates progression to Steps 3 and 4. |
| L12 | Complete Step 3: Create Interview | `<app-job-create>` Step 3 | `/recruiter/jobs/create` | "Next" | `interviewQuestions[]` FormArray required to publish. Each question: `questionId`, `question`, `answerDuration`, `retakes`, `sequence`. Template picker via `interviewTemplateId`. Without at least one interview question the publish button will be blocked. |
| L13 | Review Step 4: Preview | `<app-job-create>` Step 4 | `/recruiter/jobs/create` | "Save Draft" or "Publish" | Shows full preview of job post. |
| L14 | Save as Draft | `<app-job-create>` | `/recruiter/jobs/create` | "Save Draft" | Saves with `jobStatusId=1`. Shows confirmation dialog. Navigates to `/recruiter/jobs/list`. |
| L15 | Publish job | `<app-job-create>` | `/recruiter/jobs/create` | "Publish" | `publishJobPost()` validates all required-to-publish fields. On success: `jobStatusId=2`, snackbar shown, navigates to `/recruiter/jobs/list`. Known issue: on publish-blocked error, snackbar uses `success-snackbar` CSS class instead of an error class (wrong color). |

**Success state:** Job is published and visible in `/recruiter/jobs/list` with status "Published". Employer is also subscribed gate-checked: if job post limit is reached, `SubscriptionAlertComponent` is shown instead.
**Fallback:** Missing required fields -> snackbar lists missing fields (wrong color bug). Missing interview questions -> hard block on publish.

### Phase 5: View Applicants

| Step | Label | Component | Route | CTA | Notes |
|------|-------|-----------|-------|-----|-------|
| L16 | Navigate to applicants | `JobListComponent` row action, or dashboard "Review new applicants" | `/recruiter/jobs/applicants?id={jobId}` | "View Applicants" | `EmployerApplicantsComponent` -> `<app-job-applicants>`. Reads `jobId` from query params. |
| L17 | Review applicant table | `<app-job-applicants>` | `/recruiter/jobs/applicants?id={jobId}` | Row action menu | Table columns: `applicantProfileId`, `fullName`, `dateApplied`, `address`, `salary`, `cv_link`, `jobApplicationStatusName`, `matchSignalLabel`, action menu. |
| L18 | Open applicant detail panel | `ApplicantActionModalComponent` | Same route | "Profile" action | `showProfile=true` triggers detail panel with avatar, snapshot card, `app-application-preview`, `app-message-thread`. |

**Success state:** Employer reviews applicant profile, match level, and can send messages inline.

---

## 2. Returning Employer Flows

### 2.1 Has Applicants Waiting

**Starting state:** Employer has at least one published job with unreviewed applicants (statusId=1 or statusId=3). `needsReviewCount > 0`.

| Step | Component | Route | CTA | Success State | Fallback |
|------|-----------|-------|-----|---------------|----------|
| L1: Sign in | `SigninComponent` | `/signin` | "Sign in" | Routed to `/recruiter/dashboard` | Bad credentials: error shown inline |
| L2: Dashboard shows urgent card | `<app-company-dashboard>` | `/recruiter/dashboard` | Pulsing urgent action card visible | Card shows real `needsReviewCount` | Loading skeleton while pipeline data fetches |
| L3: Click "Review new applicants" | `<app-company-dashboard>` | `/recruiter/dashboard` -> `/recruiter/jobs/applicants?id={jobId}` | CTA on urgent card | Navigates to applicant list for the specific job | `pipelineError` state with retry if pipeline API fails |
| L4: Review applicant | `<app-job-applicants>` | `/recruiter/jobs/applicants?id={jobId}` | Row action menu | Detail panel opens | No applicants in list -> empty section component |
| L5: Change applicant status | `ApplicantActionModalComponent` | Same route | Status change in modal | Status updated, table reflects new status | API error shown in modal |
| L6: Send message | `app-message-thread` in detail panel | Same route | "Send" button | Message sent, thread updates (8s poll) | Failed send: error shown, typed text NOT preserved (newBody reset on success only) |

**Trigger:** Dashboard shows pulsing urgent card with count.
**Success state:** Employer has reviewed all applicants, moved them through pipeline stages, sent messages.

---

### 2.2 Has Drafts

**Starting state:** Employer created a job and saved as draft (`jobStatusId=1`). They return to complete and publish it.

| Step | Component | Route | CTA | Success State | Fallback |
|------|-----------|-------|-----|---------------|----------|
| L1: Sign in | `SigninComponent` | `/signin` | "Sign in" | `/recruiter/dashboard` | Auth error |
| L2: Navigate to Jobs | Sidebar | `/recruiter/jobs/list` | "Job Posts" in sidebar | Job list loads with "Draft" status filter | Empty state if no jobs |
| L3: Filter to Drafts | `JobListComponent` | `/recruiter/jobs/list` | Status filter: "Draft" | Draft jobs visible in table | No drafts -> empty table |
| L4: Open draft for editing | `JobListComponent` row action | `/recruiter/jobs/edit?id={jobId}` | Edit action | `EmployerJobcreateComponent` loads with existing job data via `jobFacade.getJobById()` | Job not found: error state |
| L5: Complete missing fields | `<app-job-create>` | `/recruiter/jobs/edit?id={jobId}` | Step navigation | Steps complete | Validation errors on required fields |
| L6: Publish | `<app-job-create>` Step 4 | Same | "Publish" | `jobStatusId=2`, navigate to `/recruiter/jobs/list` | Missing interview questions: hard block |

**Trigger:** Employer notices draft in job list, or remembers saving a draft.
**Success state:** Draft promoted to published job.
**Gap:** No draft auto-save. No unsaved-form-data warning on navigation away.

---

### 2.3 Published Job but No Applicants

**Starting state:** Employer has a published job but zero applicants. Dashboard shows published job and empty pipeline.

| Step | Component | Route | CTA | Success State | Fallback |
|------|-----------|-------|-----|---------------|----------|
| L1: Sign in | `SigninComponent` | `/signin` | "Sign in" | `/recruiter/dashboard` | Auth error |
| L2: Dashboard shows zero-applicant state | `<app-company-dashboard>` | `/recruiter/dashboard` | "Manage your jobs" action card always visible | Views job list | `<app-empty-section>` with "No applicants yet" in pipeline |
| L3: Navigate to job view | `EmployerJobviewComponent` | `/recruiter/jobs/view?id={jobId}` | View action from job list | Job detail displayed | Job not found: error |
| L4: Check job completeness | `<app-job-view>` | `/recruiter/jobs/view?id={jobId}` | Review all fields | Employer verifies fields are compelling | No quality score shown |
| L5: Edit job to improve it | `EmployerJobcreateComponent` | `/recruiter/jobs/edit?id={jobId}` | "Edit" action | Edit form loads | Load error |
| L6: Update and republish | `<app-job-create>` Step 4 | Same | "Publish" | Updated job saved | Validation errors |

**Trigger:** Dashboard shows published job with empty pipeline. Employer proactively investigates.
**Success state:** Job is updated with stronger content; employer awaits new applicants.
**Gap:** No quality score or readiness indicator in job view or job list to guide improvements.

---

### 2.4 Returning After Break

**Starting state:** Employer has not logged in for several weeks. Session may be expired. They have existing jobs and applicants.

| Step | Component | Route | CTA | Success State | Fallback |
|------|-----------|-------|-----|---------------|----------|
| L1: Attempt to access /recruiter | `AuthGuard` | `/recruiter/dashboard` | Direct URL | Redirected to `/signin` with snackbar "You are not Authorized" | -- |
| L2: Sign in | `SigninComponent` | `/signin` | "Sign in" | Session restored, routed to `/recruiter/dashboard` | Forgotten password: platform-level reset |
| L3: Review dashboard | `<app-company-dashboard>` | `/recruiter/dashboard` | Dashboard CTAs | Overview of active jobs, new applicants, pipeline state visible | API fetch errors: error states with retry |
| L4: Check for new applicants | `<app-company-dashboard>` | `/recruiter/dashboard` | "Review new applicants" if `needsReviewCount > 0` | Applicant list for job | Empty: no new applicants since last visit |
| L5: Check job statuses | `JobListComponent` | `/recruiter/jobs/list` | "Job Posts" sidebar link | See all job statuses (Active, Draft, Expired) | -- |
| L6: Renew expired jobs | `EmployerJobexpiredComponent` | `/recruiter/jobs/expired` | Action in expired jobs view | Job renewed or archived | Subscription limit reached |

**Trigger:** Employer decides to resume hiring activity after an absence.
**Success state:** Employer is caught up on pipeline status and has actioned pending items.
**Fallback for expired session:** `state != 'true'` in localStorage -> `AuthGuard` shows snackbar + redirects to `/signin`.

---

### 2.5 Expired Jobs

**Starting state:** One or more jobs have `jobStatusId=3` (Expired). Employer returns to renew or archive them.

| Step | Component | Route | CTA | Success State | Fallback |
|------|-----------|-------|-----|---------------|----------|
| L1: Sign in | `SigninComponent` | `/signin` | "Sign in" | `/recruiter/dashboard` | Auth error |
| L2: Navigate to Expired Jobs | Sidebar -> Jobs -> Expired Jobs | `/recruiter/jobs/expired` | "Expired Jobs" sub-menu | `EmployerJobexpiredComponent` loads list | No expired jobs: empty state |
| L3: Review expired list | `EmployerJobexpiredComponent` | `/recruiter/jobs/expired` | Row actions | Expired jobs shown with expiry date | API error |
| L4: Renew job or archive | `EmployerJobexpiredComponent` row action | Same | "Renew" or "Archive" | Status updated via `/job/changestatus`, list refreshes | Subscription gate if renewal would exceed limit |
| L5: View applicants from expired job | Row action | `/recruiter/jobs/applicants?id={jobId}` | "View Applicants" | Applicant list for expired job visible | -- |

**Trigger:** Jobs reach their expiry date automatically or employer notices in sidebar.
**Success state:** Expired jobs are either renewed (restored to active) or archived (status=4).

---

## 3. Flow Reference Table

| Flow | Trigger | Key Component | Key Route | Primary CTA | Success Outcome |
|------|---------|---------------|-----------|-------------|-----------------|
| First-time: Discovery | Organic/direct | `EmployerPortalComponent` | `/employers` | "Start hiring" | Signup started |
| First-time: Signup | CTA click | `SignupComponent` | `/signup?role=2` | "Create account" | Account created |
| First-time: Onboarding | Post-login | `<app-company-dashboard>` | `/recruiter/dashboard` | "Complete company profile" | Profile complete |
| First-time: Create job | Action center | `<app-job-create>` | `/recruiter/jobs/create` | "Publish" | First job live |
| Returning: Applicants waiting | `needsReviewCount > 0` | `<app-job-applicants>` | `/recruiter/jobs/applicants?id=` | "Review new applicants" | Applicants actioned |
| Returning: Has drafts | Draft in job list | `<app-job-create>` | `/recruiter/jobs/edit?id=` | "Publish" | Draft published |
| Returning: No applicants | Empty pipeline | `<app-job-create>` | `/recruiter/jobs/edit?id=` | "Edit job" | Job improved |
| Returning: After break | Expired session | `AuthGuard` -> `SigninComponent` | `/signin` | "Sign in" | Session restored |
| Returning: Expired jobs | Job expiry | `EmployerJobexpiredComponent` | `/recruiter/jobs/expired` | "Renew" | Job renewed |

---

## Known Gaps Affecting These Flows

1. **Company not setup redirect (Bug):** `CompanyNotSetupComponent` "Setup Company" button does not navigate. Employer is stranded after closing the dialog.
2. **No persistent onboarding checklist:** Profile completion state is detected at runtime only. There is no persistent checklist or progress bar across sessions.
3. **Post-publish destination (Gap):** After publishing a job, the employer is sent to `/recruiter/jobs/list` rather than a job-level dashboard or confirmation page.
4. **No draft auto-save (Gap):** Navigating away from job create without saving silently discards all work. No unsaved-changes warning exists.
5. **Message text not preserved on error (Bug):** In the applicant detail message thread, `newBody` is reset after a successful send but also after an error, discarding typed text.
6. **Interview hard gate (Constraint):** Publishing a job requires at least one interview question. Employers who want to post without video questions cannot publish.
