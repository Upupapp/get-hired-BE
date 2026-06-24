# GetHired Employer Journey — Tab and Sub-Tab Map V4

**Date:** 2026-06-24
**Scope:** All tab-like navigation groupings in the employer panel: sidebar sub-nav groups, the 4-step job create stepper, the inline applicant detail panel, and route-level tab equivalents. For each: route, component, active state logic, transition behavior, empty state, and mobile behavior.

---

## Overview

The employer panel has no formal Angular Material tabs (`<mat-tab-group>`). Tab-like navigation is implemented through three distinct patterns:

1. **Sidebar sub-navigation:** Expandable groups in the sidebar (`Jobs`, `Contacts`) that reveal sub-items. These function like horizontal tabs but are rendered as a vertical accordion within the sidebar.
2. **Job create stepper:** A 4-step linear progression component (`MatStepper` or equivalent) that acts as a multi-step tab form.
3. **Inline applicant detail panel:** A `showProfile` boolean flag that switches the job applicants view between the applicant table and an inline detail view. This is tab-like in function (two views of the same route) without being a tab component.
4. **Status filter on job list:** A filter control (All / Draft / Published) that functions like a tab group for filtering the job table.

---

## 1. Jobs Sub-Navigation Group

**Parent Sidebar Item:** Jobs (expandable)
**Pattern:** Vertical accordion sidebar sub-nav

### Sub-Tab 1: Job Posts

| Dimension | Detail |
|-----------|--------|
| **Label** | Job Posts |
| **Route** | `/recruiter/jobs/list` |
| **Component** | `JobListComponent` |
| **Active State Logic** | `RouterLinkActive` matches on `/recruiter/jobs/list`. Active when: exact match on list route, OR when on `/recruiter/jobs/create`, `/recruiter/jobs/edit?id=`, `/recruiter/jobs/applicants?id=` (parent "Jobs" group is active; sub-item active state depends on `routerLinkActiveOptions` configuration — not confirmed for child routes). |
| **Transition** | Route navigation: `@animate` (fade+scale, 600ms) on page content. Sidebar sub-item highlight transitions at 150ms. |
| **Empty State** | No confirmed empty state component. Table renders empty with no CTA to create a job. |
| **Mobile Behavior** | Sidebar hidden on mobile. No tab equivalent for mobile. Employer cannot navigate here on mobile without direct URL. |
| **API** | `GET /job/basiclist` |
| **Notes** | This is the primary entry point for all job management actions (create, edit, view, applicants, archive). |

### Sub-Tab 2: Expired Jobs

| Dimension | Detail |
|-----------|--------|
| **Label** | Expired Jobs |
| **Route** | `/recruiter/jobs/expired` |
| **Component** | `ExpiredJobsComponent` (inferred) |
| **Active State Logic** | `RouterLinkActive` exact match on `/recruiter/jobs/expired`. |
| **Transition** | Same as Job Posts. |
| **Empty State** | Not confirmed. Expected: "No expired jobs." |
| **Mobile Behavior** | Sidebar hidden on mobile. |
| **API** | `GET /job/expiredlist` |
| **Notes** | Separate from Job Posts. Jobs automatically move to expired state based on `jobStatusId: 3`. |

### Jobs Group Active State Cascade

When any job-related sub-route is active, the "Jobs" parent sidebar item should also be active (expanded). This requires:
- `[routerLinkActive]="['active']"` with `[routerLinkActiveOptions]="{exact: false}"` on the Jobs parent, matching against the `/recruiter/jobs` path prefix.
- The expand state of the Jobs accordion should persist while the employer is on any `/recruiter/jobs/**` route.

---

## 2. Contacts Sub-Navigation Group

**Parent Sidebar Item:** Contacts (expandable)
**Pattern:** Vertical accordion sidebar sub-nav

### Sub-Tab 1: Contact List

| Dimension | Detail |
|-----------|--------|
| **Label** | Contact List |
| **Route** | `/recruiter/contacts/list` |
| **Component** | `ContactListComponent` (inferred) |
| **Active State Logic** | `RouterLinkActive` exact match. |
| **Transition** | Standard route transition. |
| **Empty State** | Not confirmed. |
| **Mobile Behavior** | Sidebar hidden. |
| **API** | Not confirmed. |
| **Notes** | Distinct from job-specific applicant list. Contacts are a global candidate database, not job-scoped. |

### Sub-Tab 2: Contact Group

| Dimension | Detail |
|-----------|--------|
| **Label** | Contact Group |
| **Route** | `/recruiter/contacts/groups` |
| **Component** | `ContactGroupsComponent` (inferred) |
| **Active State Logic** | `RouterLinkActive` exact on `/recruiter/contacts/groups`. Also active (inferred) when on `/recruiter/contacts/group-list/:id`. |
| **Transition** | Standard route transition. |
| **Empty State** | Not confirmed. |
| **Mobile Behavior** | Sidebar hidden. |
| **API** | Not confirmed. |

### Sub-Tab 3: Candidates

| Dimension | Detail |
|-----------|--------|
| **Label** | Candidates |
| **Route** | `/recruiter/contacts/candidates` |
| **Component** | `CandidatesComponent` (inferred) |
| **Active State Logic** | `RouterLinkActive` exact on `/recruiter/contacts/candidates`. Also active (inferred) when on `/recruiter/contacts/candidate-list/:id`. |
| **Transition** | Standard route transition. |
| **Empty State** | Not confirmed. |
| **Mobile Behavior** | Sidebar hidden. |
| **API** | Not confirmed. |
| **Notes** | Label distinction vs. "Applicants" (job-specific) creates potential employer confusion. Candidates here are a global contact pool; applicants are people who applied to a specific job post. |

### Contacts Group Active State Cascade

Same pattern as Jobs: `[routerLinkActiveOptions]="{exact: false}"` on Contacts parent matching `/recruiter/contacts` prefix. Expand state persists while on any `/recruiter/contacts/**` route, including `candidate-list/:id` and `group-list/:id` sub-routes.

### Child Routes (Not in Sidebar)

| Route | Component | Parent |
|-------|-----------|--------|
| `/recruiter/contacts/candidate-list/:id` | `CandidateListComponent` (inferred) | Contacts > Candidates |
| `/recruiter/contacts/group-list/:id` | `GroupListComponent` (inferred) | Contacts > Contact Group |

These routes are reached from within the Candidates or Contact Group list pages (by clicking a candidate or group). They do not appear in the sidebar but belong to the Contacts nav group. Active state on the Contacts parent should persist when on these routes.

---

## 3. Company Sub-Navigation Group

**Current Sidebar State:** NOT an expandable group. Company navigation is split between two separate sidebar items:
- "Employer Branding" (label) -> `/recruiter/company/details` (company profile)
- "Settings" -> `/recruiter/company/settings`

These two items share the conceptual parent "Company" but are not grouped in the current sidebar.

**V4 Recommendation:** Group these as sub-items under a "Company" parent, as documented in `GETHIRED_EMPLOYER_NAVIGATION_ARCHITECTURE_V4.md`.

### Sub-Tab 1: Company Profile (current label: "Employer Branding")

| Dimension | Detail |
|-----------|--------|
| **Label** | Employer Branding (current) / Company Profile (recommended) |
| **Route** | `/recruiter/company/details` |
| **Component** | `employer-company.component.html` -> `<app-company-details>` |
| **Active State Logic** | `RouterLinkActive` exact on `/recruiter/company/details`. |
| **Transition** | Standard route transition. |
| **Empty State** | All form fields blank (first-time employer). |
| **Mobile Behavior** | Sidebar hidden. Form renders on mobile but is inaccessible without direct URL. |
| **API** | `GET /company/usercompany`, `POST /company/createinitial`, `PUT /company/update` |
| **Notes** | This is the destination of the company-not-setup dialog "Setup Company" CTA (currently broken — redirect commented out). |

### Sub-Tab 2: Settings

| Dimension | Detail |
|-----------|--------|
| **Label** | Settings |
| **Route** | `/recruiter/company/settings` |
| **Component** | `CompanySettingsComponent` (inferred) |
| **Active State Logic** | `RouterLinkActive` exact on `/recruiter/company/settings`. |
| **Transition** | Standard route transition. |
| **Empty State** | Not confirmed. |
| **Mobile Behavior** | Sidebar hidden. |
| **API** | Not confirmed. |

---

## 4. Job Create Stepper (4-Step Linear Progression)

**Route:** `/recruiter/jobs/create`
**Component:** `JobCreateComponent`
**Pattern:** 4-step linear stepper (Angular `MatStepper` or equivalent). Steps are not independently addressable by URL — all within the `/recruiter/jobs/create` route.

### Step 1: Job Details

| Dimension | Detail |
|-----------|--------|
| **Step Number** | 1 of 4 |
| **Label** | Job Details |
| **Fields** | `jobTitle` (required), `jobAddress`, `jobCity` (required), `jobCountry` (required), `jobDescription`, `jobDuties`, `jobCategoryId`, `workSetupId`, `jobBanner` (required — file upload), `badges[]`, `requirements[]`, `goodToHave[]`, `educationalBackground[]`, `certificationRequirements[]`, `skills[]`, `tags[]` |
| **Active State Logic** | Stepper active step index = 0. `aria-current="step"` on step 1 header. |
| **Transition** | `@animate` (fade+scale, 600ms) on step content enter. `HapticFeedbackService.selection()` on "Next" click. |
| **Empty State** | All fields blank. Required fields: `jobTitle`, `jobCity`, `jobCountry`, `jobBanner`. |
| **Validation** | Checked at publish time by `publishJobPost()`, not at step-advance time. `jobTitle`, `jobCity`, `jobCountry`, `jobBanner` must be filled to publish. |
| **Mobile Behavior** | Stepper renders on mobile but sidebar navigation is inaccessible. |
| **CTA** | "Next" -> advance to Step 2. "Cancel" -> navigate to job list (assumed). |
| **Notes** | `certificationRequirements` v1 is confirmed present in both frontend form and backend create controller. |

### Step 2: Rates and Roles

| Dimension | Detail |
|-----------|--------|
| **Step Number** | 2 of 4 |
| **Label** | Rates and Roles |
| **Fields** | `jobTypeId` (required to publish), `jobLevelId` (required to publish), `rate`, `salaryMinimum`, `salaryMaximum`, `salaryCurrency` |
| **Active State Logic** | Stepper active step index = 1. |
| **Transition** | `@animate` on step content enter/leave. |
| **Empty State** | Dropdowns unselected. Salary fields blank. |
| **Validation** | `jobTypeId` and `jobLevelId` checked at publish time by `publishJobPost()`. |
| **Mobile Behavior** | Renders on mobile. |
| **CTA** | "Next" -> Step 3. "Back" -> Step 1. |

### Step 3: Create Interview

| Dimension | Detail |
|-----------|--------|
| **Step Number** | 3 of 4 |
| **Label** | Create Interview |
| **Fields** | `interviewQuestions[]` (array — at least 1 REQUIRED to publish). `interviewTemplateId` (optional — template reference). |
| **Active State Logic** | Stepper active step index = 2. |
| **Transition** | `@animate` on step content enter/leave. |
| **Empty State** | Zero interview questions. No indicator that at least 1 is required before publish. |
| **Validation** | `interviewQuestions.length !== 0` checked at publish time by `publishJobPost()`. NOT checked at step-advance time. Employer can proceed to step 4 with zero questions. |
| **Mobile Behavior** | Renders on mobile. |
| **CTA** | "Add Question" (adds to `interviewQuestions[]`), "Next" -> Step 4, "Back" -> Step 2. |
| **V4 Issue** | No step-level indicator that questions are required. Employer only discovers the block when "Publish" is clicked on step 4 — at which point the snackbar appears in the wrong color class (`success-snackbar`). |
| **V4 Fix** | Add: "0 interview questions added. At least 1 is required to publish." count label. Update dynamically as questions are added. On "Next" with 0 questions: show an inline warning (not a block — employer can still proceed to step 4 and save as draft). |

### Step 4: Preview Job Post

| Dimension | Detail |
|-----------|--------|
| **Step Number** | 4 of 4 |
| **Label** | Preview Job Post |
| **Content** | Read-only preview of all entered job data. Employer reviews before saving or publishing. |
| **Active State Logic** | Stepper active step index = 3. |
| **Transition** | `@animate` on step content enter. |
| **Empty State** | N/A — always shows whatever was entered in steps 1-3. |
| **Validation** | `publishJobPost()` validates all required fields on "Publish" click. If any fail: error snackbar (wrong CSS class). If all pass: POST and navigate. |
| **Mobile Behavior** | Renders on mobile. |
| **CTA** | "Publish" -> `publishJobPost()`, "Save as Draft" -> `POST /job/create` with `jobStatusId: 1` + dialog + navigate to list, "Back" -> Step 3. |
| **Success (Draft)** | Dialog confirmation shown. Navigate to `/recruiter/jobs/list`. |
| **Success (Publish)** | Snackbar success + `HapticFeedbackService.jobPublished()` + navigate to `/recruiter/jobs/list`. |
| **Error (Publish Blocked)** | Snackbar "Job not ready to be Published" with `panelClass: ['success-snackbar']` — WRONG CLASS. Should be `['error-snackbar']` or `['warning-snackbar']`. |

### Stepper State Summary Table

| Step | Label | Required to Publish? | Validation Timing | V4 Issue? |
|------|-------|---------------------|-------------------|-----------|
| 1 | Job Details | `jobTitle`, `jobCity`, `jobCountry`, `jobBanner` | At publish (step 4) | None (fields are clear) |
| 2 | Rates and Roles | `jobTypeId`, `jobLevelId` | At publish (step 4) | None |
| 3 | Create Interview | `interviewQuestions.length > 0` | At publish (step 4) | YES — no per-step warning |
| 4 | Preview | Publish CTA trigger | At publish button click | YES — wrong error snackbar class |

---

## 5. Job List Status Filter (Tab-Like)

**Route:** `/recruiter/jobs/list`
**Component:** `JobListComponent`
**Pattern:** Filter tabs or select control above the job table.

| Dimension | Detail |
|-----------|--------|
| **Filter Options** | All, Draft, Published |
| **Filter Logic** | Client-side filter on `jobStatusId`: All = all, Draft = status 1, Published = status 2 |
| **Active State Logic** | Selected filter option has active/selected styling |
| **Transition** | Table rows filter with no confirmed animation |
| **Empty State (Draft filter)** | Zero draft jobs — no confirmed empty state |
| **Empty State (Published filter)** | Zero published jobs — no confirmed empty state |
| **Mobile Behavior** | Sidebar hidden. Filter control renders. |
| **A11y** | Filter options need `aria-pressed` (button group) or `role="tab"` + `aria-selected` (tab pattern) depending on implementation |
| **V4 Fix** | Add empty state per filter: "No draft jobs. Create a new job." / "No published jobs. Publish a draft." |

---

## 6. Applicant Detail Inline Panel (Tab-Like View Switch)

**Route:** `/recruiter/jobs/applicants?id=`
**Component:** `JobApplicantsComponent`
**Pattern:** `showProfile: boolean` flag switches between two views within the same route.

| Dimension | Detail |
|-----------|--------|
| **View 1 (showProfile = false)** | Applicant list table with `matchSignalLabel` column |
| **View 2 (showProfile = true)** | Inline applicant detail panel with avatar, snapshot card, application preview, message thread |
| **Trigger** | Click on applicant row in table -> `showProfile = true` |
| **Back to List** | Close button / back CTA in detail panel -> `showProfile = false` |
| **Active State Logic** | No tab active state — `*ngIf="showProfile"` or `*ngIf="!showProfile"` template conditionals |
| **Transition** | No confirmed transition animation on the showProfile flag change. V4 recommendation: `@animate` (fade+slide, 300ms) on detail panel enter. |
| **Empty State (no applicants)** | showProfile stays false. Table shows empty rows. No confirmed empty state. |
| **Loading State (detail)** | Snapshot card and message thread load async while panel is open |
| **Mobile Behavior** | Detail panel renders below or overlapping the table. No explicit mobile layout for this two-panel view. |
| **URL Shareability** | No URL change when detail panel opens. The applicant detail panel has no direct URL. The employer cannot share a link to a specific applicant's detail view. |
| **V4 Fix** | Add `@animate` fade+slide on detail panel open/close. Consider adding applicant ID to URL query param (`?id={jobId}&applicant={applicantId}`) for shareability — requires component refactor. |

### Applicant Detail Internal Sections

When `showProfile = true`, the detail panel has these visual sections (not implemented as tabs, but tab-like in layout):

| Section | Component | Content | Loaded by |
|---------|-----------|---------|-----------|
| Snapshot | Application snapshot card | `completeness%`, `matchLevel` | `GET /job/applicant/snapshot-summary?applicationId=` |
| Application | `<app-application-preview>` | Full application content | From applicant detail data |
| Messages | `<app-message-thread>` | Message thread with employer and applicant | `POST /messages/thread`, `GET /messages/thread/messages` (8s poll) |

---

## Summary Tab/Sub-Tab Registry

| # | Navigation Unit | Type | Route(s) | Component | V4 Issue? |
|---|-----------------|------|----------|-----------|-----------|
| 1 | Jobs: Job Posts | Sidebar sub-nav tab | `/recruiter/jobs/list` | `JobListComponent` | None |
| 2 | Jobs: Expired Jobs | Sidebar sub-nav tab | `/recruiter/jobs/expired` | `ExpiredJobsComponent` | Re-post action unconfirmed |
| 3 | Contacts: Contact List | Sidebar sub-nav tab | `/recruiter/contacts/list` | `ContactListComponent` | Internals undocumented |
| 4 | Contacts: Contact Group | Sidebar sub-nav tab | `/recruiter/contacts/groups` | `ContactGroupsComponent` | Internals undocumented |
| 5 | Contacts: Candidates | Sidebar sub-nav tab | `/recruiter/contacts/candidates` | `CandidatesComponent` | Label confusion vs. applicants |
| 6 | Company: Company Profile | Sidebar item (not grouped) | `/recruiter/company/details` | `app-company-details` | Label mismatch ("Employer Branding") |
| 7 | Company: Settings | Sidebar item (not grouped) | `/recruiter/company/settings` | `CompanySettingsComponent` | Should be grouped with Company Profile |
| 8 | Job Create: Step 1 | Stepper step | `/recruiter/jobs/create` | `JobCreateComponent` | None |
| 9 | Job Create: Step 2 | Stepper step | `/recruiter/jobs/create` | `JobCreateComponent` | None |
| 10 | Job Create: Step 3 | Stepper step | `/recruiter/jobs/create` | `JobCreateComponent` | NO interview question requirement indicator |
| 11 | Job Create: Step 4 | Stepper step | `/recruiter/jobs/create` | `JobCreateComponent` | Wrong error snackbar class on publish block |
| 12 | Job List: Status Filter | Filter tab group | `/recruiter/jobs/list` | `JobListComponent` | No per-filter empty states |
| 13 | Applicant Detail Panel | showProfile view switch | `/recruiter/jobs/applicants?id=` | `JobApplicantsComponent` | No transition animation; no URL for deep-link |
| 14 | Candidate List (child) | Sub-route under Contacts | `/recruiter/contacts/candidate-list/:id` | `CandidateListComponent` | Internals undocumented |
| 15 | Group List (child) | Sub-route under Contacts | `/recruiter/contacts/group-list/:id` | `GroupListComponent` | Internals undocumented |

---

*End of Document 10*
