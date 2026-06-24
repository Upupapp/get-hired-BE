# GetHired Employer Journey — Button and CTA Registry V4

**Date:** 2026-06-24
**Scope:** Every employer-facing CTA documented across sidebar, dashboard, job lifecycle, applicant review, messaging, company, and settings surfaces.

---

## CTA Table Format

Each CTA is documented with the following fields:

- **ID:** Unique identifier (prefix: EB = Employer Button/CTA)
- **Label:** Visible text on the button or link
- **Location:** Page, component, and section
- **User State:** What must be true for this CTA to be visible
- **Current Target:** Current behavior / route it navigates to
- **Route Exists?:** Whether the target route is confirmed to exist
- **Requires Auth?** Requires `localStorage['state'] === 'true'` and role `'2'`
- **Requires Company?** Requires a company record to exist
- **Requires Job?** Requires at least one job to exist
- **Requires Applicant?** Requires a specific applicant context
- **Type:** Button / Link / Dialog trigger / Form submit / Action modal item
- **Expected Behavior:** What should happen
- **Current Behavior:** What currently happens
- **Broken?** Yes / No / Partial
- **Broken Risk:** CRITICAL / HIGH / MEDIUM / LOW / NONE
- **Recommended Destination:** Correct target if current is wrong
- **Fallback:** Behavior if pre-conditions are not met
- **Disabled-State Helper Copy:** Suggested copy for disabled state
- **Microinteraction:** Expected motion/haptic
- **A11y Label:** `aria-label` recommendation
- **Fix Needed:** Whether a code change is required

---

## Section 1: Sidebar Navigation CTAs

---

**EB-001**
| Field | Value |
|-------|-------|
| **ID** | EB-001 |
| **Label** | Dashboard |
| **Location** | `employer-sidebar.component` — top sidebar item |
| **User State** | Authenticated employer |
| **Current Target** | `/recruiter/dashboard` |
| **Route Exists?** | Yes |
| **Requires Auth?** | Yes |
| **Requires Company?** | No (navigates regardless; company-not-setup dialog handles missing company) |
| **Requires Job?** | No |
| **Requires Applicant?** | No |
| **Type** | Link |
| **Expected Behavior** | Navigate to employer dashboard command center |
| **Current Behavior** | Navigates correctly |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Recommended Destination** | `/recruiter/dashboard` |
| **Fallback** | N/A |
| **Disabled-State Helper Copy** | N/A |
| **Microinteraction** | Active state glow/highlight on current route. `.gh-pressable` press scale on click. |
| **A11y Label** | `aria-label="Dashboard"` + `aria-current="page"` when active |
| **Fix Needed** | No |

---

**EB-002**
| Field | Value |
|-------|-------|
| **ID** | EB-002 |
| **Label** | Jobs (expandable) |
| **Location** | `employer-sidebar.component` — sidebar expandable item |
| **User State** | Authenticated employer |
| **Current Target** | Expands to show: "Job Posts" and "Expired Jobs" sub-items |
| **Route Exists?** | Yes (sub-routes exist) |
| **Requires Auth?** | Yes |
| **Type** | Expandable sidebar group |
| **Expected Behavior** | Toggles sub-navigation |
| **Current Behavior** | Expands sub-menu (assumed) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | Sub-menu expand/collapse animation |
| **A11y Label** | `aria-expanded="true/false"` on toggle |
| **Fix Needed** | No |

---

**EB-003**
| Field | Value |
|-------|-------|
| **ID** | EB-003 |
| **Label** | Job Posts |
| **Location** | `employer-sidebar.component` — sub-item under Jobs |
| **Current Target** | `/recruiter/jobs/list` |
| **Route Exists?** | Yes |
| **Type** | Link |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Job Posts"` |
| **Fix Needed** | No |

---

**EB-004**
| Field | Value |
|-------|-------|
| **ID** | EB-004 |
| **Label** | Expired Jobs |
| **Location** | `employer-sidebar.component` — sub-item under Jobs |
| **Current Target** | `/recruiter/jobs/expired` |
| **Route Exists?** | Yes |
| **Type** | Link |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Expired Jobs"` |
| **Fix Needed** | No |

---

**EB-005**
| Field | Value |
|-------|-------|
| **ID** | EB-005 |
| **Label** | Contacts (expandable) |
| **Location** | `employer-sidebar.component` — sidebar expandable item |
| **Current Target** | Expands: Contact List, Contact Group, Candidates |
| **Route Exists?** | Yes (sub-routes exist) |
| **Type** | Expandable sidebar group |
| **Broken?** | No |
| **Broken Risk** | LOW |
| **A11y Label** | `aria-expanded` on toggle |
| **Fix Needed** | No |

---

**EB-006 through EB-008** (Contacts sub-items)

| ID | Label | Target | Route Exists? | Broken? |
|----|-------|--------|---------------|---------|
| EB-006 | Contact List | `/recruiter/contacts/list` | Yes | No |
| EB-007 | Contact Group | `/recruiter/contacts/groups` | Yes | No |
| EB-008 | Candidates | `/recruiter/contacts/candidates` | Yes | No |

---

**EB-009**
| Field | Value |
|-------|-------|
| **ID** | EB-009 |
| **Label** | Interviews |
| **Location** | `employer-sidebar.component` |
| **Current Target** | `/recruiter/interview` |
| **Route Exists?** | Yes (renders `<app-under-construction>`) |
| **Type** | Link |
| **Expected Behavior** | Navigate to interview management |
| **Current Behavior** | Navigates to an under-construction stub page |
| **Broken?** | Partial |
| **Broken Risk** | HIGH |
| **Recommended Destination** | When built: `/recruiter/interview`. For now: keep route but improve stub with a "Coming Soon" message. |
| **Disabled-State Helper Copy** | Consider: "Interview scheduling is coming soon." with a subtle coming-soon badge on the sidebar item. |
| **A11y Label** | `aria-label="Interviews — Coming Soon"` if marked as coming soon |
| **Fix Needed** | Yes — improve stub content or add coming-soon indicator to sidebar label |

---

**EB-010**
| Field | Value |
|-------|-------|
| **ID** | EB-010 |
| **Label** | Subscription |
| **Location** | `employer-sidebar.component` |
| **Current Target** | `/recruiter/subscription` |
| **Route Exists?** | Yes |
| **Type** | Link |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Subscription"` |
| **Fix Needed** | No |

---

**EB-011**
| Field | Value |
|-------|-------|
| **ID** | EB-011 |
| **Label** | Employer Branding |
| **Location** | `employer-sidebar.component` |
| **Current Target** | `/recruiter/company/details` |
| **Route Exists?** | Yes |
| **Type** | Link |
| **Expected Behavior** | Navigate to employer branding configuration |
| **Current Behavior** | Navigates to company profile / details page (not a dedicated branding page) |
| **Broken?** | Partial (label mismatch — destination is company details, not a distinct branding module) |
| **Broken Risk** | LOW |
| **Recommended Destination** | `/recruiter/company/details` (correct route, wrong label) |
| **Disabled-State Helper Copy** | N/A |
| **A11y Label** | `aria-label="Company Profile"` (after rename) |
| **Fix Needed** | Yes — rename label from "Employer Branding" to "Company Profile" |

---

**EB-012**
| Field | Value |
|-------|-------|
| **ID** | EB-012 |
| **Label** | Settings |
| **Location** | `employer-sidebar.component` — bottom sidebar item |
| **Current Target** | `/recruiter/company/settings` |
| **Route Exists?** | Yes |
| **Type** | Link |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Settings"` |
| **Fix Needed** | No |

---

## Section 2: Dashboard CTAs

---

**EB-013**
| Field | Value |
|-------|-------|
| **ID** | EB-013 |
| **Label** | Review X Applicants |
| **Location** | `company-dashboard.component` — action center |
| **User State** | `needsReviewCount > 0` |
| **Current Target** | `/recruiter/jobs/applicants?id=` (for a specific job) |
| **Route Exists?** | Yes |
| **Requires Auth?** | Yes |
| **Requires Company?** | Yes |
| **Requires Job?** | Yes (job with applicants needing review) |
| **Type** | Button (`btn-cta-primary`) |
| **Expected Behavior** | Navigate to job applicant list, scoped to the job with needsReview |
| **Current Behavior** | Navigates (implementation details assumed — job ID must be passed) |
| **Broken?** | Partial (conditional visibility is correct; navigation target confirmation needed) |
| **Broken Risk** | MEDIUM |
| **Microinteraction** | `HapticFeedbackService.press()`. `.gh-pressable` scale on click. Coral button (`btn-cta-primary`). |
| **A11y Label** | `aria-label="Review 3 applicants needing attention"` (dynamic count) |
| **Fix Needed** | Verify exact navigation target includes a job ID |

---

**EB-014**
| Field | Value |
|-------|-------|
| **ID** | EB-014 |
| **Label** | Manage Jobs |
| **Location** | `company-dashboard.component` — action center (always visible) |
| **Current Target** | `/recruiter/jobs/list` |
| **Route Exists?** | Yes |
| **Type** | Button (`btn-cta-outline`) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | `.gh-pressable` scale. Outline button style. |
| **A11y Label** | `aria-label="Manage job posts"` |
| **Fix Needed** | No |

---

**EB-015**
| Field | Value |
|-------|-------|
| **ID** | EB-015 |
| **Label** | Complete Company Profile |
| **Location** | `company-dashboard.component` — action center (conditional: `companyProfileMissingFields()` returns true) |
| **User State** | `companyLogoUrl`, `companyDetails`, or `companyCity` is missing |
| **Current Target** | `/recruiter/company/details` |
| **Route Exists?** | Yes |
| **Type** | Button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | `.gh-pressable` scale |
| **A11y Label** | `aria-label="Complete your company profile"` |
| **Fix Needed** | No — conditional logic is correct |

---

**EB-016**
| Field | Value |
|-------|-------|
| **ID** | EB-016 |
| **Label** | Pipeline bar chart stage click |
| **Location** | `company-dashboard.component` — hiring pipeline chart |
| **User State** | Pipeline data loaded from `/company/dashboard/pipeline-overview` |
| **Current Target** | `goToJobsList()` -> `/recruiter/jobs/list` |
| **Route Exists?** | Yes (but wrong destination) |
| **Type** | Clickable chart bar |
| **Expected Behavior** | Navigate to stage-filtered applicant view |
| **Current Behavior** | Navigates to generic job list |
| **Broken?** | Yes (wrong destination) |
| **Broken Risk** | HIGH |
| **Recommended Destination** | Stage-filtered applicant view (e.g., `/recruiter/jobs/applicants?stage={stageId}`) |
| **Microinteraction** | `HapticFeedbackService.press()` on bar click. Tooltip on hover with stage name + count. |
| **A11y Label** | `aria-label="Screening stage: 5 applicants. Click to view."` (dynamic per stage) |
| **Fix Needed** | Yes — replace `goToJobsList()` with parameterized stage navigation |

---

**EB-017**
| Field | Value |
|-------|-------|
| **ID** | EB-017 |
| **Label** | (Needs-review list item click) |
| **Location** | `company-dashboard.component` — applicants needing review list |
| **User State** | `needsReviewCount > 0` |
| **Current Target** | (not confirmed — assumed to navigate to applicant detail) |
| **Type** | Clickable list item |
| **Broken?** | Not confirmed — target needs verification |
| **Broken Risk** | MEDIUM |
| **A11y Label** | `aria-label="Review application from {applicantName}"` |
| **Fix Needed** | Verify navigation target on needs-review list item click |

---

## Section 3: Job List CTAs

---

**EB-018**
| Field | Value |
|-------|-------|
| **ID** | EB-018 |
| **Label** | Create Job |
| **Location** | `job-list.component` — above job table |
| **User State** | Authenticated employer. If at subscription limit: subscription gate fires instead. |
| **Current Target** | `/recruiter/jobs/create` (if under limit) or `SubscriptionAlertComponent` dialog (if at limit) |
| **Route Exists?** | Yes |
| **Type** | Button (`btn-cta-primary`) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | `.gh-pressable`. Coral button. |
| **A11y Label** | `aria-label="Create a new job post"` |
| **Fix Needed** | No |

---

**EB-019**
| Field | Value |
|-------|-------|
| **ID** | EB-019 |
| **Label** | Status filter (All / Draft / Published) |
| **Location** | `job-list.component` — filter control above table |
| **Type** | Filter tabs or select (not confirmed) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | Each filter option needs `aria-pressed` or `aria-selected` based on implementation |
| **Fix Needed** | Verify `aria-pressed` / `aria-selected` on filter controls |

---

**EB-020**
| Field | Value |
|-------|-------|
| **ID** | EB-020 |
| **Label** | Row action trigger (kebab or "..." menu) |
| **Location** | `job-list.component` — each job row |
| **Current Target** | `TableControlModalComponent` dialog |
| **Type** | Button or icon |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Actions for job: {jobTitle}"` |
| **Fix Needed** | No |

---

**EB-021 through EB-024** (TableControlModalComponent actions)

| ID | Label | Target | Broken? |
|----|-------|--------|---------|
| EB-021 | View | `/recruiter/jobs/view?id=` | No |
| EB-022 | Edit | `/recruiter/jobs/edit?id=` | No |
| EB-023 | Applicants | `/recruiter/jobs/applicants?id=` | No |
| EB-024 | Delete (Archive) | `PUT /job/changestatus` with status 4 | No (but no confirmation dialog confirmed) |

---

## Section 4: Subscription Alert CTA

---

**EB-025**
| Field | Value |
|-------|-------|
| **ID** | EB-025 |
| **Label** | Upgrade Subscription (or similar) |
| **Location** | `SubscriptionAlertComponent` dialog (shown when job count = subscription limit) |
| **Current Target** | `/recruiter/subscription` |
| **Route Exists?** | Yes |
| **Type** | Button in dialog |
| **Broken?** | No |
| **Broken Risk** | LOW |
| **A11y Label** | `aria-label="Upgrade subscription to post more jobs"` |
| **Fix Needed** | Verify localization strings in SubscriptionAlertComponent |

---

## Section 5: Job Create Stepper CTAs

---

**EB-026**
| Field | Value |
|-------|-------|
| **ID** | EB-026 |
| **Label** | Next (step 1 -> step 2) |
| **Location** | `job-create.component` — step 1 footer |
| **Current Target** | Advance stepper to step 2 |
| **Type** | Button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Next: Rates and Roles"` |
| **Fix Needed** | No |

---

**EB-027**
| Field | Value |
|-------|-------|
| **ID** | EB-027 |
| **Label** | Next (step 2 -> step 3) |
| **Location** | `job-create.component` — step 2 footer |
| **Type** | Button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Next: Create Interview"` |
| **Fix Needed** | No |

---

**EB-028**
| Field | Value |
|-------|-------|
| **ID** | EB-028 |
| **Label** | Next (step 3 -> step 4) |
| **Location** | `job-create.component` — step 3 footer |
| **Type** | Button |
| **Expected Behavior** | Advance to preview step. Warn if 0 interview questions. |
| **Current Behavior** | Advances without warning about missing interview questions. |
| **Broken?** | Partial |
| **Broken Risk** | MEDIUM |
| **A11y Label** | `aria-label="Next: Preview Job Post"` |
| **Fix Needed** | Yes — add inline warning if advancing from step 3 with 0 questions |

---

**EB-029**
| Field | Value |
|-------|-------|
| **ID** | EB-029 |
| **Label** | Back |
| **Location** | `job-create.component` — all steps except step 1 |
| **Type** | Button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Back to previous step"` |
| **Fix Needed** | No |

---

**EB-030**
| Field | Value |
|-------|-------|
| **ID** | EB-030 |
| **Label** | Save as Draft |
| **Location** | `job-create.component` — step 4 |
| **Current Target** | `POST /job/create` with `jobStatusId: 1`, then dialog + navigate `/recruiter/jobs/list` |
| **Type** | Button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | `HapticFeedbackService.press()`. Success dialog on completion. |
| **A11y Label** | `aria-label="Save job as draft"` |
| **Fix Needed** | No |

---

**EB-031**
| Field | Value |
|-------|-------|
| **ID** | EB-031 |
| **Label** | Publish |
| **Location** | `job-create.component` — step 4 |
| **Current Target** | `publishJobPost()` validation -> `POST /job/create` with `jobStatusId: 2` |
| **Type** | Button (`btn-cta-primary`) |
| **Expected Behavior** | Validate required fields (including interviewQuestions.length > 0). If valid: publish job. If invalid: show error snackbar. |
| **Current Behavior (valid)** | Publishes and shows success snackbar + navigates to job list. |
| **Current Behavior (invalid)** | Shows "Job not ready to be Published" snackbar with `panelClass: ['success-snackbar']` — coral color makes it appear as a success message. |
| **Broken?** | Yes (wrong snackbar class on failure path) |
| **Broken Risk** | HIGH |
| **Recommended Destination** | Same (`publishJobPost()`) — fix the panelClass |
| **Disabled-State Helper Copy** | When fields incomplete: "Fill in all required fields to publish." Consider disabling the Publish button with this tooltip until all publish conditions are met. |
| **Microinteraction** | On success: `HapticFeedbackService.jobPublished()`. On failure: `HapticFeedbackService.selection()` (gentle signal, not success). |
| **A11y Label** | `aria-label="Publish job post"`. When disabled: `aria-disabled="true"` + `aria-describedby="publish-requirements-hint"` |
| **Fix Needed** | Yes — change `panelClass: ['success-snackbar']` to `['error-snackbar']` or `['warning-snackbar']` |

---

## Section 6: Applicant List CTAs

---

**EB-032**
| Field | Value |
|-------|-------|
| **ID** | EB-032 |
| **Label** | Applicant row (table row click) |
| **Location** | `job-applicants.component` — applicant table |
| **Current Target** | Sets `showProfile = true`, loads applicant detail inline |
| **Type** | Clickable table row |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | `HapticFeedbackService.selection()` on row click. Row highlight on hover. |
| **A11y Label** | `aria-label="View application from {applicantName}"` on row |
| **Fix Needed** | No |

---

## Section 7: Applicant Detail CTAs

---

**EB-033**
| Field | Value |
|-------|-------|
| **ID** | EB-033 |
| **Label** | Invite |
| **Location** | `job-applicants.component` — applicant detail panel |
| **User State** | Applicant detail panel open (`showProfile = true`) |
| **Current Target** | `inviteApplicant()` method |
| **Route Exists?** | N/A (no navigation — API call expected) |
| **Requires Auth?** | Yes |
| **Requires Company?** | Yes |
| **Requires Applicant?** | Yes |
| **Type** | Button |
| **Expected Behavior** | Advance applicant to next pipeline stage (e.g., invite for interview) |
| **Current Behavior** | Empty method body — nothing happens |
| **Broken?** | YES — CONFIRMED BROKEN |
| **Broken Risk** | CRITICAL |
| **Recommended Destination** | Pipeline advancement API call + confirmation dialog + success feedback |
| **Fallback** | None currently |
| **Disabled-State Helper Copy** | N/A — currently the button appears active but does nothing |
| **Microinteraction** | On success (after fix): `HapticFeedbackService.success()`. Confirmation dialog before API call. |
| **A11y Label** | `aria-label="Invite applicant to next stage"` |
| **Fix Needed** | YES — implement `inviteApplicant()` with API call, confirmation, and feedback |

---

**EB-034**
| Field | Value |
|-------|-------|
| **ID** | EB-034 |
| **Label** | View Video (or play icon) |
| **Location** | `job-applicants.component` — applicant detail, video response section |
| **Current Target** | `viewCv()` -> opens `VideoPreviewComponent` dialog |
| **Type** | Button / icon |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | Dialog open animation. |
| **A11y Label** | `aria-label="Watch video response from {applicantName}"` |
| **Fix Needed** | No |

---

**EB-035**
| Field | Value |
|-------|-------|
| **ID** | EB-035 |
| **Label** | Close applicant detail / Back to list |
| **Location** | `job-applicants.component` — applicant detail panel |
| **Current Target** | Sets `showProfile = false` |
| **Type** | Button or back arrow |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Close applicant detail panel"` |
| **Fix Needed** | No |

---

## Section 8: Message Thread CTAs

---

**EB-036**
| Field | Value |
|-------|-------|
| **ID** | EB-036 |
| **Label** | Send |
| **Location** | `<app-message-thread>` — message input area |
| **Current Target** | `POST /messages/thread/send` with retry |
| **Type** | Button (form submit) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | Message send loading state. Message appears in thread on success. `HapticFeedbackService.press()` on send click. |
| **A11y Label** | `aria-label="Send message"` |
| **Fix Needed** | No |

---

**EB-037**
| Field | Value |
|-------|-------|
| **ID** | EB-037 |
| **Label** | Retry (on message send failure) |
| **Location** | `<app-message-thread>` — error state |
| **Current Target** | Retry `POST /messages/thread/send` |
| **Type** | Button |
| **Broken?** | No (retry mechanism confirmed in component) |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Retry sending message"` |
| **Fix Needed** | No |

---

## Section 9: Company Profile CTAs

---

**EB-038**
| Field | Value |
|-------|-------|
| **ID** | EB-038 |
| **Label** | Save / Update (company profile) |
| **Location** | `company-details.component` — form footer |
| **Current Target** | `POST /company/createinitial` or `PUT /company/update` |
| **Type** | Button (form submit) |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **Microinteraction** | Loading state on submit. Success snackbar (assumed). `HapticFeedbackService.success()`. |
| **A11y Label** | `aria-label="Save company profile"` |
| **Fix Needed** | No |

---

**EB-039**
| Field | Value |
|-------|-------|
| **ID** | EB-039 |
| **Label** | Upload Logo |
| **Location** | `company-details.component` — logo field |
| **Current Target** | File input -> upload API |
| **Type** | File upload button |
| **Broken?** | No |
| **Broken Risk** | NONE |
| **A11y Label** | `aria-label="Upload company logo"` |
| **Fix Needed** | No |

---

## Section 10: Company Not Setup Dialog CTAs

---

**EB-040**
| Field | Value |
|-------|-------|
| **ID** | EB-040 |
| **Label** | Setup Company |
| **Location** | `CompanyNotSetupComponent` dialog |
| **User State** | No company record for authenticated employer. Dialog shown on dashboard load. |
| **Current Target** | `redirectToSetup()` — closes dialog. `router.navigate` to `/recruiter/company/details` is COMMENTED OUT. |
| **Route Exists?** | Yes (`/recruiter/company/details` exists) |
| **Type** | Button |
| **Expected Behavior** | Close dialog AND navigate to `/recruiter/company/details` |
| **Current Behavior** | Closes dialog only. Employer is left on `/recruiter/dashboard` with no path forward. |
| **Broken?** | YES — CONFIRMED BROKEN |
| **Broken Risk** | CRITICAL |
| **Recommended Destination** | `/recruiter/company/details` |
| **Fallback** | Employer must manually use sidebar "Employer Branding" link (label mismatch adds confusion) |
| **Disabled-State Helper Copy** | N/A (button is always visible when dialog is shown) |
| **Microinteraction** | Dialog close animation + route transition to company details |
| **A11y Label** | `aria-label="Set up your company profile"` |
| **Fix Needed** | YES — uncomment `router.navigate(['/recruiter/company/details'])` in `redirectToSetup()` in `company-not-setup.component.ts` |

---

## Section 11: Empty State CTAs (Missing / Needed)

The following CTAs do not currently exist but are needed for complete empty state handling:

| ID | Label | Location | Recommended Target | Priority |
|----|-------|----------|--------------------|----------|
| EB-041 | Post your first job | `/recruiter/jobs/list` empty state | `/recruiter/jobs/create` | HIGH |
| EB-042 | Create a job to start receiving applicants | `/recruiter/jobs/applicants?id=` zero-applicant state | `/recruiter/jobs/create` (if no jobs) or `/recruiter/jobs/list` | HIGH |
| EB-043 | Start a new search | `/jobs` public zero-results state | `/signup?role=2` (for employers browsing) | LOW |
| EB-044 | Add interview questions to publish | `job-create.component` step 3 zero-questions state | Inline action within step 3 | HIGH |

---

## CTA Risk Summary

| Risk Level | CTAs |
|------------|------|
| CRITICAL | EB-033 (`inviteApplicant()` empty), EB-040 (`Setup Company` redirect broken) |
| HIGH | EB-031 (Publish wrong snackbar class), EB-016 (Pipeline bar wrong navigation), EB-009 (Interviews sidebar to stub) |
| MEDIUM | EB-028 (Step 3 Next no warning), EB-013 (Review Applicants — target needs verification), EB-017 (Needs-review list item click — unconfirmed) |
| LOW | EB-011 (Employer Branding label mismatch), EB-025 (Subscription alert localization) |
| NONE | All other CTAs |

---

*End of Document 7*
