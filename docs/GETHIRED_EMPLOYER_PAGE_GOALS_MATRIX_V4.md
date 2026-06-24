# GetHired Employer Journey — Page Goals Matrix V4

**Date:** 2026-06-24
**Scope:** Every employer-facing page documented with: primary goal, secondary goal, first-time user behavior, returning user behavior, empty/success/error/loading states, CTAs, breadcrumb/wayfinding, mobile behavior, accessibility notes, and V4 improvement needed.

---

## Page 1: Public Landing Page

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Public Landing / Home |
| **Route** | `/home` |
| **Component** | `MainPortalComponent` |
| **Primary Goal** | Convert anonymous visitors (employer and applicant) into registered users |
| **Secondary Goal** | Communicate GetHired's value proposition; surface platform quality through real job listings or testimonials |
| **First-Time User Behavior** | Lands from search/referral. Scans page. Looks for employer-specific value proposition. Finds CTA to sign up as employer. |
| **Returning User Behavior** | (Authenticated employer would be redirected to `/recruiter` by `UnauthGuard` if they try `/signup`. Otherwise landing page is accessible.) |
| **Empty State** | N/A (static marketing page) |
| **Success State** | Employer clicks employer signup CTA and proceeds to `/signup?role=2` |
| **Error State** | N/A |
| **Loading State** | Not confirmed (assumed fast static or SSR) |
| **Primary CTA** | Sign up as Employer -> `/signup?role=2` |
| **Secondary CTAs** | Browse Jobs -> `/jobs`, Sign In -> `/signin`, For Job Seekers -> `/job-seekers` |
| **Breadcrumb/Wayfinding** | None (top-level public page) |
| **Mobile Behavior** | Not specifically documented. Assumed standard responsive layout. |
| **Accessibility Notes** | Should have a proper H1, skip navigation link, and ARIA landmarks. Not confirmed in codebase facts. |
| **V4 Improvement Needed** | Verify H1, skip nav, and schema.org WebSite structured data injection. Add JSON-LD for organization. |

---

## Page 2: Employer Marketing Page

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Employer Portal / For Employers |
| **Route** | `/employers` |
| **Component** | `EmployerPortalComponent` |
| **Primary Goal** | Convert employer visitors into account registrations |
| **Secondary Goal** | Explain employer-specific features (job posting, applicant review, match signals, subscription) |
| **First-Time User Behavior** | Reads employer-specific marketing content. Finds "Post a Job" or "Sign Up" CTA. |
| **Returning User Behavior** | Authenticated employer who lands here is not blocked (no guard) — they can proceed to their panel. |
| **Empty State** | N/A (static page) |
| **Success State** | Employer clicks signup CTA -> `/signup?role=2` |
| **Error State** | N/A |
| **Loading State** | Not confirmed |
| **Primary CTA** | Start Hiring / Post a Job -> `/signup?role=2` |
| **Secondary CTAs** | Sign In -> `/signin` |
| **Breadcrumb/Wayfinding** | None (top-level public page) |
| **Mobile Behavior** | Not confirmed |
| **Accessibility Notes** | H1 should be employer-specific (e.g., "Hire smarter with GetHired"). Not confirmed. |
| **V4 Improvement Needed** | Confirm CTA routes to `?role=2`. Add employer feature highlights matching actual platform capabilities. |

---

## Page 3: Signin

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Sign In |
| **Route** | `/signin` |
| **Component** | `SigninComponent` |
| **Guard** | `UnauthGuard` |
| **Primary Goal** | Authenticate an existing employer and redirect to their panel |
| **Secondary Goal** | Surface password reset and signup paths |
| **First-Time User Behavior** | Employer arrives here after email verification. First login. Enters credentials. Lands on `/recruiter/dashboard`. |
| **Returning User Behavior** | Quick sign-in. Already knows their credentials. |
| **Empty State** | N/A (form page) |
| **Success State** | localStorage written. Navigate to `/recruiter/dashboard`. |
| **Error State** | Incorrect credentials: form error (assumed). |
| **Loading State** | Form submit loading state (assumed). |
| **Primary CTA** | Sign In (form submit) |
| **Secondary CTAs** | Forgot Password -> `/reset-password`, Sign Up -> `/signup` |
| **Breadcrumb/Wayfinding** | None |
| **Mobile Behavior** | Form should be mobile-responsive (not confirmed from codebase facts) |
| **Accessibility Notes** | Form fields need `label` elements, not placeholder-only. Submit button needs visible focus state. |
| **V4 Improvement Needed** | Add a 401 HTTP interceptor that clears localStorage and redirects to `/signin` on expired session. Confirm `autocomplete="email"` and `autocomplete="current-password"` on fields. |

---

## Page 4: Signup

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Sign Up |
| **Route** | `/signup` |
| **Component** | `SignupComponent` |
| **Guard** | `UnauthGuard` |
| **Primary Goal** | Create a new employer account |
| **Secondary Goal** | Ensure correct role is selected; prevent incorrect-role signups |
| **First-Time User Behavior** | Arrives from employer marketing page with `?role=2` pre-selecting employer tab. Fills name, email, password. Submits. |
| **Returning User Behavior** | `UnauthGuard` redirects already-authenticated employers to `/recruiter`. |
| **Empty State** | N/A (blank form) |
| **Success State** | Account created. Navigate to `/verify` or confirmation message. Verification email sent. |
| **Error State** | Duplicate email, password too weak, server error (assumed form-level error display). |
| **Loading State** | Submit button loading state (assumed). |
| **Primary CTA** | Sign Up (form submit) |
| **Secondary CTAs** | Sign In -> `/signin` |
| **Breadcrumb/Wayfinding** | None |
| **Mobile Behavior** | Form should be mobile-responsive |
| **Accessibility Notes** | Role selector must be accessible (radio group or tabs with `aria-selected`). `?role=2` pre-selection must be announced. |
| **V4 Improvement Needed** | Add visible "Signing up as Employer" confirmation label when role=2. Confirm `autocomplete` attributes. |

---

## Page 5: Dashboard

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Employer Dashboard |
| **Route** | `/recruiter/dashboard` |
| **Component** | `EmployerDashboardComponent` -> `<app-company-dashboard>` |
| **Primary Goal** | Give the employer an immediate read on hiring status and surface the single next best action |
| **Secondary Goal** | Provide deep-link access to applicants needing review, jobs, and pipeline data |
| **First-Time User Behavior (no company)** | `CompanyNotSetupComponent` dialog shown. "Setup Company" button calls broken redirect. Employer is stranded. |
| **First-Time User Behavior (company exists)** | Dashboard loads with zero KPIs. Action center shows "Complete Company Profile" if profile is incomplete. Manage Jobs CTA. |
| **Returning User Behavior** | Dashboard shows real KPI data, action center priorities, pipeline chart, needs-review list. Employer takes action from dashboard. |
| **Empty State** | Zero jobs: no confirmed empty state. Zero applicants: needsReview=0, no "Review Applicants" action card. Pipeline chart presumably shows empty bars. |
| **Success State** | All KPI cards loaded. Pipeline chart populated. Action center shows current priorities. |
| **Error State** | `pipelineError` flag + retry for pipeline. KPI error state not confirmed. |
| **Loading State** | Three skeleton loaders: `emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`. |
| **Primary CTA** | "Review X Applicants" (conditional on needsReviewCount > 0) |
| **Secondary CTAs** | "Manage Jobs", "Complete Company Profile" (conditional), pipeline bar clicks (broken), needs-review list item clicks |
| **Breadcrumb/Wayfinding** | None (top-level panel page) |
| **Mobile Behavior** | Sidebar hidden. Dashboard content renders but employer cannot navigate away without knowing URLs directly. No mobile nav. |
| **Accessibility Notes** | Skeleton loaders need `aria-busy="true"`. KPI cards need `aria-label` with values. Pipeline chart bars need `aria-label` per bar. |
| **V4 Improvement Needed** | Fix company-not-setup redirect (CRITICAL). Fix pipeline bar click navigation (HIGH). Add empty states for zero-jobs and zero-applicants. Add `aria-busy` to skeletons. Add `aria-label` to pipeline bars. |

---

## Page 6: Job List

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Job Posts |
| **Route** | `/recruiter/jobs/list` |
| **Component** | `JobListComponent` |
| **Primary Goal** | Give the employer a complete view of all current and draft job posts with direct management actions |
| **Secondary Goal** | Surface subscription limit and provide path to create new jobs |
| **First-Time User Behavior** | Empty table. No confirmed "Create your first job" empty state CTA. |
| **Returning User Behavior** | Table populated with job rows. Status filter (All / Draft / Published) for organization. |
| **Empty State** | No confirmed empty state component. Expected: "No job posts yet. Create your first job post." with CTA to `/recruiter/jobs/create`. |
| **Success State** | Table with job rows. Each row has: job title, status, date, action trigger. |
| **Error State** | Not confirmed for job list API failure. |
| **Loading State** | Not confirmed. Expected: table skeleton or spinner. |
| **Primary CTA** | Create Job (subscription-gated) |
| **Secondary CTAs** | Status filter, row action modal (View, Edit, Applicants, Delete/Archive) |
| **Breadcrumb/Wayfinding** | Sidebar "Jobs > Job Posts" active state |
| **Mobile Behavior** | No mobile nav. Table may require horizontal scroll. |
| **Accessibility Notes** | Table needs `<caption>` and column headers with `scope="col"`. Row actions need `aria-label` with job title context. |
| **V4 Improvement Needed** | Add empty state with "Create your first job" CTA. Add table `<caption>`. Verify row action aria-labels. |

---

## Page 7: Job Create

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Create Job Post |
| **Route** | `/recruiter/jobs/create` |
| **Component** | `JobCreateComponent` |
| **Primary Goal** | Collect all job information needed to create a published, applicant-facing job post |
| **Secondary Goal** | Guide the employer through the required fields (including interview questions) without blocking progress |
| **First-Time User Behavior** | Sees 4-step stepper with blank fields. May not know that interview questions are required to publish. |
| **Returning User Behavior** | Familiar with the stepper. May create multiple job posts quickly. |
| **Step 1 Empty State** | All fields blank. Required fields: `jobTitle`, `jobCity`, `jobCountry`, `jobBanner`. |
| **Step 2 Empty State** | Salary fields optional. `jobTypeId`, `jobLevelId` selects. |
| **Step 3 Empty State** | Zero interview questions. No indicator that at least 1 is required for publish. |
| **Step 4 Empty State** | N/A — preview of entered data. |
| **Success State (Draft)** | Dialog confirmation. Navigate to `/recruiter/jobs/list`. Job in Draft status. |
| **Success State (Publish)** | Success snackbar. Navigate to `/recruiter/jobs/list`. Job in Published status. |
| **Error State (Publish Blocked)** | Snackbar "Job not ready to be Published" with WRONG panelClass (`success-snackbar` — coral color). |
| **Error State (API Fail)** | Not confirmed. |
| **Loading State** | Step transitions: `@animate`. Submit: loading state not confirmed. |
| **Primary CTA** | Publish (step 4) |
| **Secondary CTAs** | Save as Draft (step 4), Next (each step), Back (each step), "Add Interview Question" (step 3) |
| **Breadcrumb/Wayfinding** | Sidebar "Jobs > Job Posts" active; stepper shows current step |
| **Mobile Behavior** | Stepper may be functional but untested. No mobile nav to return to other sections. |
| **Accessibility Notes** | Stepper steps need `aria-current="step"` on active step. Required fields need `aria-required="true"`. Error snackbar needs `role="alert"`. |
| **V4 Improvement Needed** | Fix publish-blocked snackbar panelClass (HIGH). Add step-3 interview question count indicator (MEDIUM). Add `aria-required` to required fields. Fix snackbar `role="alert"`. |

---

## Page 8: Job Applicants

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Job Applicants |
| **Route** | `/recruiter/jobs/applicants?id={jobId}` |
| **Component** | `JobApplicantsComponent` |
| **Primary Goal** | Enable the employer to review all applicants for a specific job and take action on each |
| **Secondary Goal** | Surface match signals to help the employer prioritize which applicants to review first |
| **First-Time User Behavior (new job)** | Zero applicants. No confirmed empty state. |
| **Returning User Behavior** | Table with applicants. Match signals in column. Click applicant to open inline detail panel. |
| **Empty State** | Zero applicants: not confirmed. Expected: "No applicants yet. Share your job post to attract candidates." |
| **Success State (list)** | Table with applicant rows, match signal column populated. Disclaimer shown when signals exist. |
| **Success State (detail)** | Applicant detail panel: avatar, snapshot card (completeness%, matchLevel), application preview, message thread. |
| **Error State (signals)** | Best-effort call — no error shown. Applicant list still renders. |
| **Error State (list API)** | Not confirmed. |
| **Error State (messages)** | Message thread error preserved with retry CTA. |
| **Loading State** | Main table: not confirmed. Snapshot card: async load. Messages: 8s polling. |
| **Primary CTA** | (Applicant row click) -> opens detail panel |
| **Secondary CTAs** | Invite (BROKEN — `inviteApplicant()` empty), View Video (`viewCv()`), Send Message (in thread), Close detail panel |
| **Breadcrumb/Wayfinding** | "Jobs / {jobId} / Applicants / {applicantProfileId}" |
| **Mobile Behavior** | No mobile nav. Inline detail panel + table may cause UX issues on small screens. |
| **Accessibility Notes** | Table rows need `role="row"` with `aria-label` for applicant name. `inviteApplicant` button needs `aria-disabled` and explanation since it currently does nothing. |
| **V4 Improvement Needed** | Implement `inviteApplicant()` (CRITICAL). Add empty state for zero applicants. Add table accessibility. Add `aria-disabled` to broken Invite button with explanatory text. |

---

## Page 9: Expired Jobs

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Expired Jobs |
| **Route** | `/recruiter/jobs/expired` |
| **Component** | `ExpiredJobsComponent` (inferred) |
| **Primary Goal** | Show the employer jobs that have passed their active period, with options to re-post or archive |
| **Secondary Goal** | Prevent clutter in the main job list |
| **First-Time User Behavior** | No expired jobs: empty list (no confirmed empty state). |
| **Returning User Behavior** | Expired job rows. Row actions (re-post, archive). |
| **Empty State** | Not confirmed. Expected: "No expired jobs. Active jobs appear here when they expire." |
| **Success State** | Table of expired jobs with actions. |
| **Error State** | Not confirmed. |
| **Loading State** | Not confirmed. |
| **Primary CTA** | Re-post (assumed — not confirmed in frontend docs) |
| **Secondary CTAs** | Archive |
| **Breadcrumb/Wayfinding** | Sidebar "Jobs > Expired Jobs" active |
| **Mobile Behavior** | No mobile nav |
| **Accessibility Notes** | Table accessibility (same as job list) |
| **V4 Improvement Needed** | Confirm re-post action exists. Add empty state. |

---

## Page 10: Interview (Stub)

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Interviews |
| **Route** | `/recruiter/interview` |
| **Component** | `EmployerInterviewComponent` -> `<app-under-construction>` |
| **Primary Goal** | (Intended) Enable employers to manage interview scheduling and review interview submissions |
| **Secondary Goal** | N/A (stub) |
| **First-Time User Behavior** | Employer clicks "Interviews" in sidebar and sees an under-construction page. |
| **Returning User Behavior** | Same — no functionality regardless of return visits. |
| **Empty State** | N/A — entire page is `<app-under-construction>` |
| **Success State** | N/A |
| **Error State** | N/A |
| **Loading State** | N/A |
| **Primary CTA** | None (under-construction page) |
| **Secondary CTAs** | None |
| **Breadcrumb/Wayfinding** | Sidebar "Interviews" active |
| **Mobile Behavior** | `<app-under-construction>` renders. No mobile nav. |
| **Accessibility Notes** | Under-construction page should have a meaningful H1. |
| **V4 Improvement Needed** | Add a "Coming Soon" headline and feature preview to `<app-under-construction>` for the interview context. Consider adding a "Coming Soon" badge to the sidebar item. Note: interview questions are already collected in job create step 3. |

---

## Page 11: Subscription

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Subscription |
| **Route** | `/recruiter/subscription` |
| **Component** | `SubscriptionComponent` (inferred) |
| **Primary Goal** | Enable employers to manage their subscription plan and understand job post limits |
| **Secondary Goal** | Convert free or limited employers to higher-tier plans |
| **First-Time User Behavior** | Employer on free/trial plan. Sees plan options. |
| **Returning User Behavior** | Employer sees current plan, usage, and upgrade options. |
| **Empty State** | No active plan: show plan selection (assumed). |
| **Success State** | Plan active, limits displayed, upgrade CTAs. |
| **Error State** | Payment failure (assumed). |
| **Loading State** | Not confirmed. |
| **Primary CTA** | Upgrade Plan (assumed) |
| **Secondary CTAs** | View current plan details |
| **Breadcrumb/Wayfinding** | Sidebar "Subscription" active |
| **Mobile Behavior** | No mobile nav |
| **Accessibility Notes** | Plan comparison tables need proper `<th scope="col/row">` if used. |
| **V4 Improvement Needed** | Verify localization strings in `SubscriptionAlertComponent`. Confirm payment flow behavior. |

---

## Page 12: Company Details

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Company Profile (labeled "Employer Branding" in sidebar) |
| **Route** | `/recruiter/company/details` |
| **Component** | `employer-company.component.html` -> `<app-company-details>` |
| **Primary Goal** | Allow employers to set up and maintain their company profile visible to applicants |
| **Secondary Goal** | Clear the "Complete Company Profile" dashboard action center card |
| **First-Time User Behavior** | Blank form (if no company). Upload logo, write description, add city. Save. |
| **Returning User Behavior** | Form pre-populated with existing company data. Update and save. |
| **Empty State** | All fields blank (first-time). |
| **Success State** | Company data saved. Dashboard action center "Complete Company Profile" card disappears (on next dashboard load). |
| **Error State** | Save API failure: not confirmed. |
| **Loading State** | Existing company data loads on init (loading state not confirmed). |
| **Primary CTA** | Save / Update |
| **Secondary CTAs** | Upload Logo, Cancel (assumed) |
| **Breadcrumb/Wayfinding** | Sidebar "Employer Branding" active (label mismatch — should read "Company Profile") |
| **Mobile Behavior** | Form renders on mobile. No mobile nav. |
| **Accessibility Notes** | File upload input needs a visually associated label. Required field indicators need `aria-required`. |
| **V4 Improvement Needed** | Rename sidebar label from "Employer Branding" to "Company Profile". Show which specific fields are missing (matching the 3 checked by `companyProfileMissingFields()`). Add save success feedback. Fix company-not-setup redirect to land here. |

---

## Page 13: Company Settings

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Company Settings |
| **Route** | `/recruiter/company/settings` |
| **Component** | `CompanySettingsComponent` (inferred) |
| **Primary Goal** | Configure company-level settings (billing info, team members, permissions) |
| **Secondary Goal** | Manage company users via `addUserToCompany`, `getCompanyUsers` (company.service methods) |
| **First-Time User Behavior** | Settings form with defaults. |
| **Returning User Behavior** | Review and update settings. |
| **Empty State** | Not confirmed. |
| **Success State** | Settings saved. |
| **Error State** | Not confirmed. |
| **Loading State** | Not confirmed. |
| **Primary CTA** | Save Settings (assumed) |
| **Secondary CTAs** | Not confirmed |
| **Breadcrumb/Wayfinding** | Sidebar "Settings" active |
| **Mobile Behavior** | No mobile nav |
| **Accessibility Notes** | Not confirmed |
| **V4 Improvement Needed** | Document full settings internals. Verify `addUserToCompany` and `getCompanyUsers` API calls are wired. |

---

## Page 14: Contacts — List

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Contact List |
| **Route** | `/recruiter/contacts/list` |
| **Component** | `ContactListComponent` (inferred) |
| **Primary Goal** | Manage employer's contact database of candidates |
| **Secondary Goal** | Cross-reference contacts with job applicants |
| **First-Time User Behavior** | Empty contact list |
| **Returning User Behavior** | Contact rows with management actions |
| **Empty State** | Not confirmed |
| **Success State** | Table of contacts |
| **Error State** | Not confirmed |
| **Loading State** | Not confirmed |
| **Primary CTA** | Add Contact (assumed) |
| **Breadcrumb/Wayfinding** | Sidebar "Contacts > Contact List" active |
| **Mobile Behavior** | No mobile nav |
| **V4 Improvement Needed** | Full internals documentation needed. |

---

## Page 15: Public Job List

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Browse Jobs (Public) |
| **Route** | `/jobs` |
| **Component** | `PublicListComponent` |
| **Primary Goal** | Allow applicants and employers to browse published job posts |
| **Secondary Goal** | Demonstrate platform quality to prospective employers |
| **First-Time User Behavior** | Sees a list of published jobs. May filter or search. |
| **Returning User Behavior** | Quick scan of new jobs. |
| **Empty State** | No published jobs: no confirmed empty state CTA. Risk of appearing as empty/unused platform. |
| **Success State** | Grid or list of job cards with key metadata. |
| **Error State** | Not confirmed. |
| **Loading State** | Not confirmed. |
| **Primary CTA** | Job card click -> `/jobs/details/:id` |
| **Secondary CTAs** | Search -> `/jobs/search/:keyword`, Filter (category, type, location) |
| **Breadcrumb/Wayfinding** | None (top-level public page) |
| **Mobile Behavior** | Not confirmed |
| **V4 Improvement Needed** | Add empty state with "Post your job here" CTA -> `/signup?role=2` for employer context. Confirm JSON-LD on job detail pages. |

---

## Page 16: Public Job Detail

| Dimension | Detail |
|-----------|--------|
| **Page Name** | Job Detail (Public) |
| **Route** | `/jobs/details/:id` |
| **Component** | `PublicDetailsComponent` |
| **Primary Goal** | Present a job post to potential applicants; enable application |
| **Secondary Goal** | Serve schema.org JobPosting structured data for Google Jobs eligibility |
| **First-Time User Behavior** | Applicant or employer lands on job detail from search or link. Reads job description. |
| **Returning User Behavior** | May return to check application deadline or share link. |
| **Empty State** | N/A (single job view) |
| **Success State** | Full job detail rendered: title, description, salary, requirements, company info, apply CTA. |
| **Error State** | Invalid job ID -> not confirmed (likely 404 behavior via catch-all route). |
| **Loading State** | Not confirmed. |
| **Primary CTA** | Apply (for applicants) |
| **Secondary CTAs** | Share job link (`GET /job/sharelink`) |
| **Breadcrumb/Wayfinding** | `/jobs` -> `/jobs/details/:id` |
| **Mobile Behavior** | Not confirmed |
| **Accessibility Notes** | H1 = job title. Apply button needs clear `aria-label`. |
| **V4 Improvement Needed** | Add `<script type="application/ld+json">` with schema.org JobPosting data. Confirm structured data fields map from API response. |

---

*End of Document 8*
