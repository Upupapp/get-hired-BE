# GetHired Employer Journey — Route Safety Matrix V4

**Date:** 2026-06-24
**Scope:** All employer-facing routes. Each route is documented across 20 dimensions covering guard behavior, state handling, CTA labels, mobile behavior, and fix status.

---

## How to Read This Matrix

Each route gets a full row across all columns. Where behavior is confirmed from codebase facts, it is stated directly. Where behavior is inferred or unconfirmed, the cell is marked "(inferred)" or "(not confirmed)".

**Broken Risk levels:**
- CRITICAL: Route currently renders but a user action produces a silent failure or dead end.
- HIGH: Key functionality is missing or a bug causes incorrect behavior.
- MEDIUM: Suboptimal UX or incomplete state handling.
- LOW: Minor or cosmetic issue.
- NONE: Route appears fully functional.

---

## Route Safety Matrix

### Route: `/recruiter/dashboard`

| Dimension | Detail |
|-----------|--------|
| **Component** | `EmployerDashboardComponent` -> `<app-company-dashboard>` (`company-dashboard.component`) |
| **Module** | `EmployerPanelModule` (lazy-loaded) |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer (role `'2'`) only |
| **Guest Behavior** | `AuthGuard` redirects to `/signin` |
| **Expired Session** | localStorage has `state:'true'` but API calls return 401. No confirmed 401 interceptor. Employer sees API error states without re-login prompt. |
| **Wrong Role** | `AuthGuard` redirects role `'1'` to `/admin`, role `'3'` to `/user` |
| **Missing Company** | `CompanyNotSetupComponent` dialog shown. "Setup Company" CTA is broken (closes dialog, does NOT navigate). |
| **Missing Job** | No confirmed empty state for zero `activeJobs` KPI. Pipeline chart shows empty bars (assumed). |
| **API Calls** | `GET /company/usercompany`, `GET /company/dashboard`, `GET /company/dashboard/pipeline-overview` |
| **Loading State** | Skeleton loaders: `emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton` |
| **Empty State** | Not confirmed for zero jobs / zero applicants / zero pipeline stages |
| **Error State** | `pipelineError` flag + retry CTA (pipeline only). KPI error state not confirmed. |
| **Fallback Route** | `/signin` (guard failure) |
| **CTA Labels** | "Review X Applicants" (conditional), "Manage Jobs" (always), "Complete Company Profile" (conditional) |
| **Broken Risk** | CRITICAL — company-not-setup redirect broken; pipeline drill-down navigates to wrong route |
| **Mobile Behavior** | Sidebar hidden (`d-none d-md-block`). Dashboard content may render but is navigable only if the employer navigates directly by URL. No mobile nav. |
| **Frontend Effects** | `@animate` (fade+scale, 600ms). Gradient mesh hero. Glass card styles. `HapticFeedbackService` on CTAs. |
| **Safe Fix** | Fix `CompanyNotSetupComponent` redirect. Replace `goToJobsList()` with stage-filtered navigation. Add empty states for KPI cards. |
| **Status** | Partially functional. Two blocking bugs. |

---

### Route: `/recruiter/jobs/list`

| Dimension | Detail |
|-----------|--------|
| **Component** | `JobListComponent` |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API calls return 401; no confirmed interceptor |
| **Wrong Role** | Redirect to correct panel |
| **Missing Company** | Job list API may return empty or error if no company. No confirmed handling. |
| **Missing Job** | Empty table. No confirmed empty state CTA to create first job. |
| **API Calls** | `GET /job/basiclist` |
| **Loading State** | Not confirmed |
| **Empty State** | Not confirmed. Expected: "No jobs yet. Create your first job post." CTA to `/recruiter/jobs/create` |
| **Error State** | Not confirmed |
| **Fallback Route** | `/signin` (guard failure) |
| **CTA Labels** | "Create Job" (subscription gate check), status filter (All / Draft / Published), row action (via `TableControlModalComponent`) |
| **Broken Risk** | MEDIUM — no confirmed empty state; subscription gate component localization not confirmed |
| **Mobile Behavior** | No mobile nav. Table may be horizontally scrollable but no confirmed mobile-responsive layout. |
| **Frontend Effects** | Table rows. `TableControlModalComponent` dialog on row action. |
| **Safe Fix** | Add empty state with "Create your first job" CTA. Verify `SubscriptionAlertComponent` copy. |
| **Status** | Functional. Minor UX gaps. |

---

### Route: `/recruiter/jobs/expired`

| Dimension | Detail |
|-----------|--------|
| **Component** | `ExpiredJobsComponent` (name inferred from route) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401, no interceptor confirmed |
| **Wrong Role** | Redirect to correct panel |
| **Missing Company** | API may return empty |
| **Missing Job** | Empty expired list — no confirmed empty state |
| **API Calls** | `GET /job/expiredlist` |
| **Loading State** | Not confirmed |
| **Empty State** | Not confirmed |
| **Error State** | Not confirmed |
| **Fallback Route** | `/signin` |
| **CTA Labels** | Re-post / Archive actions (assumed via action modal, not confirmed) |
| **Broken Risk** | MEDIUM — re-post flow not confirmed in frontend docs |
| **Mobile Behavior** | No mobile nav |
| **Frontend Effects** | Table (assumed similar to job list) |
| **Safe Fix** | Confirm re-post action. Add empty state: "No expired jobs." |
| **Status** | Functional at list level. Actions unconfirmed. |

---

### Route: `/recruiter/jobs/create`

| Dimension | Detail |
|-----------|--------|
| **Component** | `JobCreateComponent` |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401 on submit |
| **Wrong Role** | Redirect |
| **Missing Company** | No confirmed block at route level. Job create may succeed without full company profile but dashboard action center will still show "Complete Profile." |
| **Missing Job** | N/A (creation page) |
| **API Calls** | `POST /job/create`, file upload for `jobBanner`. Lookup data for dropdowns (assumed `GET /job/create` or similar). |
| **Loading State** | Form submit loading (not confirmed) |
| **Empty State** | N/A (blank form on load) |
| **Error State** | Validation: `publishJobPost()` shows snackbar (BUG: wrong CSS class). API error on submit not confirmed. |
| **Fallback Route** | `/recruiter/jobs/list` (after save/publish). `/signin` (guard). |
| **CTA Labels** | "Next" (per step), "Back" (per step), "Save as Draft", "Publish" |
| **Broken Risk** | HIGH — publish-blocked snackbar uses wrong panelClass (success color on error); no step-3 interview question requirement indicator |
| **Mobile Behavior** | No mobile nav. Stepper may be usable on mobile but is untested per documented facts. |
| **Frontend Effects** | 4-step stepper with `@animate`. `HapticFeedbackService.jobPublished()` on successful publish (should fire). |
| **Safe Fix** | Fix `success-snackbar` -> `error-snackbar` on publish block. Add interview question count indicator on step 3. |
| **Status** | Functional with bugs. Two documented issues. |

---

### Route: `/recruiter/jobs/edit?id=`

| Dimension | Detail |
|-----------|--------|
| **Component** | `JobEditComponent` (name inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401 |
| **Wrong Role** | Redirect |
| **Missing Company** | Company ownership enforced by backend on `PUT /job/updatejobs` |
| **Missing Job** | If `id` query param is invalid/missing: API error loading job data (behavior not confirmed) |
| **API Calls** | (job detail load API — not explicitly confirmed), `PUT /job/updatejobs` |
| **Loading State** | Not confirmed |
| **Empty State** | N/A |
| **Error State** | Invalid job ID behavior not confirmed |
| **Fallback Route** | `/recruiter/jobs/list` (after save). `/signin` (guard). |
| **CTA Labels** | "Update" / "Save" (assumed), "Cancel" |
| **Broken Risk** | MEDIUM — invalid/missing job ID behavior not confirmed |
| **Mobile Behavior** | No mobile nav |
| **Frontend Effects** | Edit form (assumed same as create stepper or similar) |
| **Safe Fix** | Add guard: if job ID is missing from query param, redirect to `/recruiter/jobs/list` with error message. |
| **Status** | Functional. Unconfirmed edge cases. |

---

### Route: `/recruiter/jobs/applicants?id=`

| Dimension | Detail |
|-----------|--------|
| **Component** | `JobApplicantsComponent` |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`). Backend: company ownership on `GET /job/applicants`. |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401; employer sees failed table load |
| **Wrong Role** | Redirect |
| **Missing Company** | Backend company ownership check will fail; employer sees empty or error applicant list |
| **Missing Job** | If job ID is invalid: `GET /job/applicants` returns error or empty. No confirmed error state. |
| **API Calls** | `GET /job/applicants`, `GET /job/applicants/signals` (best-effort), `GET /job/applicantdetails` (on row click), `GET /job/applicant/snapshot-summary?applicationId=` (on detail open), `POST /messages/thread` (on detail open), `GET /messages/thread/messages` (polling 8s) |
| **Loading State** | Main table: not confirmed. Snapshot card: async load. Messages: poll. |
| **Empty State** | Zero applicants: not confirmed |
| **Error State** | Signals API failure: best-effort, no error state shown. Main applicant list API failure: not confirmed. Messages error: preserved with retry. |
| **Fallback Route** | `/recruiter/jobs/list` (breadcrumb/back). `/signin` (guard). |
| **CTA Labels** | Table row click (opens detail). "Invite" button (`inviteApplicant()` — BROKEN). "View Video" (`viewCv()`). Message send button. |
| **Broken Risk** | CRITICAL — `inviteApplicant()` is empty TODO; no pipeline advancement possible |
| **Mobile Behavior** | No mobile nav. Inline detail panel + table on same page may be crowded on mobile. |
| **Frontend Effects** | Table with match signal column. Inline detail panel (`showProfile` flag). `VideoPreviewComponent` dialog. `<app-message-thread>` polling. Disclaimer shown by `hasAnyMatchSignal()`. |
| **Safe Fix** | Implement `inviteApplicant()`. Add empty state for zero applicants. Add error state for main list API failure. |
| **Status** | Partially functional. Invite flow is broken. |

---

### Route: `/recruiter/jobs/view?id=`

| Dimension | Detail |
|-----------|--------|
| **Component** | `JobViewComponent` (name inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401 |
| **Wrong Role** | Redirect |
| **Missing Company** | Company ownership check on backend |
| **Missing Job** | Invalid ID: behavior not confirmed |
| **API Calls** | `GET /job/details` or similar (not confirmed) |
| **Loading State** | Not confirmed |
| **Empty State** | N/A |
| **Error State** | Not confirmed |
| **Fallback Route** | `/recruiter/jobs/list` |
| **CTA Labels** | Edit, Publish, Archive (assumed) |
| **Broken Risk** | LOW — route exists, internals not fully documented |
| **Mobile Behavior** | No mobile nav |
| **Frontend Effects** | Job preview (assumed similar to step 4 of create stepper) |
| **Safe Fix** | Confirm internals match expected read-only job view. |
| **Status** | Confirmed route exists. Internals unconfirmed. |

---

### Route: `/recruiter/contacts/list`

| Dimension | Detail |
|-----------|--------|
| **Component** | `ContactListComponent` (name inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Missing Company** | Contacts may require company scope |
| **Missing Job** | N/A |
| **API Calls** | Not confirmed |
| **Loading State** | Not confirmed |
| **Empty State** | Not confirmed |
| **Error State** | Not confirmed |
| **Fallback Route** | `/signin` |
| **CTA Labels** | Not confirmed |
| **Broken Risk** | LOW — route exists, internals not documented in provided facts |
| **Mobile Behavior** | No mobile nav |
| **Status** | Route exists. Internals not documented. |

---

### Route: `/recruiter/contacts/candidates`

| Dimension | Detail |
|-----------|--------|
| **Component** | `CandidatesComponent` (inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Notes** | Separate from job-specific applicants. The relationship between "Contacts > Candidates" and "Job Applicants" is not documented. |
| **Broken Risk** | MEDIUM — possible confusion between Candidates (contacts) and Applicants (job-specific) |
| **Status** | Route exists. Internals not documented. |

---

### Route: `/recruiter/contacts/groups`

| Dimension | Detail |
|-----------|--------|
| **Component** | `ContactGroupsComponent` (inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Broken Risk** | LOW |
| **Status** | Route exists. Internals not documented. |

---

### Route: `/recruiter/contacts/candidate-list/:id`

| Dimension | Detail |
|-----------|--------|
| **Component** | `CandidateListComponent` (inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Notes** | Route param `:id` — candidate group or contact list ID |
| **Broken Risk** | LOW — invalid ID handling not confirmed |
| **Status** | Route exists. Internals not documented. |

---

### Route: `/recruiter/contacts/group-list/:id`

| Dimension | Detail |
|-----------|--------|
| **Component** | `GroupListComponent` (inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Notes** | Route param `:id` — group ID |
| **Broken Risk** | LOW |
| **Status** | Route exists. Internals not documented. |

---

### Route: `/recruiter/interview`

| Dimension | Detail |
|-----------|--------|
| **Component** | `EmployerInterviewComponent` -> `<app-under-construction>` |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Missing Company** | N/A (under construction page renders regardless) |
| **Missing Job** | N/A |
| **API Calls** | None (under construction) |
| **Loading State** | None |
| **Empty State** | N/A — entire page is an under-construction component |
| **Error State** | None |
| **Fallback Route** | `/signin` |
| **CTA Labels** | None (under construction content only) |
| **Broken Risk** | HIGH — route appears in sidebar navigation ("Interviews") but delivers no functionality |
| **Mobile Behavior** | `<app-under-construction>` renders regardless of device |
| **Frontend Effects** | `<app-under-construction>` component |
| **Safe Fix** | Either: (a) remove "Interviews" from sidebar until module is built, or (b) show a coming-soon state with a clear timeline note. Current under-construction page is better than nothing but should include a "Coming Soon" headline and explanation. |
| **Status** | Route works. Content is a stub. No employer value delivered. |

---

### Route: `/recruiter/subscription`

| Dimension | Detail |
|-----------|--------|
| **Component** | `SubscriptionComponent` (name inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Missing Company** | Subscription may be linked to user or company — behavior not confirmed |
| **Missing Job** | N/A |
| **API Calls** | Subscription plan API (not confirmed) |
| **Loading State** | Not confirmed |
| **Empty State** | No active subscription: show plan selection (assumed) |
| **Error State** | Not confirmed |
| **Fallback Route** | `/signin`, `/recruiter/jobs/create` (from subscription gate dialog) |
| **CTA Labels** | Upgrade plan, Manage subscription (assumed) |
| **Broken Risk** | MEDIUM — `SubscriptionAlertComponent` localization not fully confirmed; payment flow internals not documented |
| **Mobile Behavior** | No mobile nav |
| **Status** | Route exists. Internals not fully documented. |

---

### Route: `/recruiter/company/details`

| Dimension | Detail |
|-----------|--------|
| **Component** | `employer-company.component.html` -> `<app-company-details>` |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Expired Session** | API 401 |
| **Wrong Role** | Redirect |
| **Missing Company** | First-time: blank form. Calls `POST /company/createinitial` to initialize. |
| **Missing Job** | N/A |
| **API Calls** | `GET /company/usercompany`, `POST /company/createinitial`, `POST /company/createcompany`, `PUT /company/update` |
| **Loading State** | Existing company data loads on init (loading state not confirmed) |
| **Empty State** | First-time employer: all fields blank |
| **Error State** | Save API failure: not confirmed |
| **Fallback Route** | `/signin` |
| **CTA Labels** | "Save" / "Update" (assumed), "Upload Logo" |
| **Broken Risk** | MEDIUM — sidebar label for this route is "Employer Branding" (mismatch with actual content which is company profile/details); company-not-setup dialog's redirect is broken making this the only path for new employers that requires manual navigation |
| **Mobile Behavior** | No mobile nav. Form renders on mobile (assumed). |
| **Frontend Effects** | Company logo file upload. Form fields. |
| **Safe Fix** | Rename sidebar item from "Employer Branding" to "Company Profile." Fix company-not-setup redirect to navigate here. Add save success feedback. |
| **Status** | Functional. Labeling and navigation bugs affect discoverability. |

---

### Route: `/recruiter/company/settings`

| Dimension | Detail |
|-----------|--------|
| **Component** | `CompanySettingsComponent` (name inferred) |
| **Module** | `EmployerPanelModule` |
| **Guard** | `AuthGuard` (role `'2'`) |
| **Allowed Roles** | Employer only |
| **Guest Behavior** | Redirect to `/signin` |
| **Notes** | Accessible via sidebar "Settings" item |
| **API Calls** | Not confirmed |
| **Loading State** | Not confirmed |
| **Broken Risk** | LOW — route exists and sidebar navigation is confirmed working |
| **Mobile Behavior** | No mobile nav |
| **Status** | Route exists. Internals not documented. |

---

### Public Routes (employer-relevant)

| Route | Component | Guard | Loading | Empty | Error | Risk |
|-------|-----------|-------|---------|-------|-------|------|
| `/home` | `MainPortalComponent` | None | Not confirmed | N/A | N/A | NONE |
| `/employers` | `EmployerPortalComponent` | None | Not confirmed | N/A | N/A | NONE |
| `/jobs` | `PublicListComponent` | None | Not confirmed | No confirmed empty state CTA | Not confirmed | LOW |
| `/jobs/details/:id` | `PublicDetailsComponent` | None | Not confirmed | N/A | Invalid ID not confirmed | LOW |
| `/jobs/search/:keyword` | `PublicSearchComponent` | None | Not confirmed | No results state not confirmed | Not confirmed | LOW |

---

## Route Risk Summary

| Risk Level | Routes |
|------------|--------|
| CRITICAL | `/recruiter/dashboard` (company-not-setup broken, pipeline drill-down broken), `/recruiter/jobs/applicants?id=` (inviteApplicant broken) |
| HIGH | `/recruiter/jobs/create` (wrong snackbar class, no interview question indicator), `/recruiter/interview` (stub page in sidebar nav) |
| MEDIUM | `/recruiter/jobs/list` (no empty state), `/recruiter/jobs/expired` (re-post unconfirmed), `/recruiter/jobs/edit?id=` (invalid ID handling), `/recruiter/company/details` (label mismatch), `/recruiter/subscription` (payment flow unconfirmed), `/recruiter/contacts/candidates` (ambiguous vs applicants) |
| LOW | `/recruiter/jobs/view?id=`, `/recruiter/contacts/list`, `/recruiter/contacts/groups`, `/recruiter/contacts/candidate-list/:id`, `/recruiter/contacts/group-list/:id`, `/recruiter/company/settings`, public routes |

---

*End of Document 6*
