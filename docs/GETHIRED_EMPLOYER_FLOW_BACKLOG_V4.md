# GETHIRED EMPLOYER FLOW BACKLOG V4

**Document:** 33 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Authoritative backlog for employer panel V5+

---

## Effort Key

- XS: < 2 hours
- S: 2–8 hours (half-day to full-day)
- M: 1–3 days
- L: 3–7 days (sprint)
- XL: 7+ days (multiple sprints)

## Priority Key

- P1: Blocking meaningful employer use; fix before next production push
- P2: Significant employer friction; fix in next sprint
- P3: Enhancement; fix when capacity allows
- P4: Nice-to-have; schedule when roadmap permits

---

## B01: Global Messages Route

**Title:** Add `/recruiter/messages` global inbox  
**Area:** Messaging  
**Priority:** P1  
**Effort:** M  
**User impact:** Employers currently cannot check messages without navigating to a specific job and opening a specific applicant detail panel. Unread messages are invisible from any top-level view.  
**Business impact:** High — messaging is a core employer-applicant communication channel. No global inbox means employers miss replies.  
**Risk if deferred:** Employers stop using in-app messaging; communication moves off-platform; hiring velocity drops.  
**Tech risk:** Low — backend `/messages/thread` endpoints exist; frontend needs a list endpoint and a route.  
**Files to create/modify:**
- New route: `/recruiter/messages`
- New component: `employer-messages` or reuse `job-applicants` message panel
- Sidebar: add "Messages" item with unread count badge
- Backend: add GET `/messages/threads` endpoint for employer's company
**Dependencies:** Backend endpoint for thread list  
**Recommended command:** STITCH or direct implementation  
**Acceptance criteria:** Employer can navigate to `/recruiter/messages` from sidebar, see a list of all threads, click into a thread, read and send messages, and the sidebar shows an unread badge when threads have unread messages.

---

## B02: Mobile Sidebar and Navigation

**Title:** Implement responsive mobile sidebar/nav for employer panel  
**Area:** Navigation, Responsive layout  
**Priority:** P1  
**Effort:** L  
**User impact:** On mobile, the employer sidebar is not usable. Employers cannot navigate the panel on mobile devices.  
**Business impact:** High — significant portion of recruiter usage is mobile or tablet.  
**Risk if deferred:** Mobile employer experience is broken.  
**Tech risk:** Medium — requires responsive layout changes across employer panel.  
**Files to modify:**
- `employer-sidebar.component.html/scss`
- `employer-panel.component.html/scss`
- Possibly a new `employer-mobile-nav.component`
**Dependencies:** None  
**Recommended command:** OPTIMIZE or direct implementation  
**Acceptance criteria:** On viewports < 768px, the employer panel shows a bottom nav bar or hamburger-triggered drawer; all sidebar links are accessible; no horizontal overflow.

---

## B03: Interview Page (Replace Under Construction)

**Title:** Implement `/recruiter/interview` page  
**Area:** Interviews  
**Priority:** P1  
**Effort:** XL  
**User impact:** `/recruiter/interview` is a dead end. The sidebar links to it and employers get a placeholder screen.  
**Business impact:** High — interview management is a core recruiter workflow.  
**Risk if deferred:** Employer trust in platform completeness is damaged.  
**Tech risk:** High — requires product decision on interview feature scope.  
**Minimum viable scope:**
- List of jobs with their configured interview questions
- Link from each job to step 3 of job-create/edit
- Remove "under construction" placeholder
**Full scope:** Interview response review per applicant, scheduling, question bank management  
**Dependencies:** Product decision on MVP scope  
**Recommended command:** New feature implementation  
**Acceptance criteria:** Employer can navigate to `/recruiter/interview` and see their interview questions organized by job. The under-construction placeholder is gone.

---

## B04: Make Interview Questions Optional for Publish

**Title:** Remove `interviewQuestions.length != 0` as a publish requirement  
**Area:** Job creation  
**Priority:** P2  
**Effort:** S  
**User impact:** Currently a job cannot be published without at least one interview question. Many employers may want to publish without a video interview step.  
**Business impact:** Medium — publish friction reduces job post volume.  
**Risk if deferred:** Employer drop-off at step 3 of job create.  
**Tech risk:** Low — removing one condition from `publishJobPost()`. The interview step's `statusChanges` subscription is already commented out in the codebase.  
**Files to modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — `publishJobPost()` condition block
**Dependencies:** Product decision (make interview questions truly optional)  
**Acceptance criteria:** A job with zero interview questions can be published. The missing-fields snackbar does not list "Interview Questions" when this requirement is removed.

---

## B05: Post-Publish Route to Job-Level Dashboard

**Title:** After job publish success, navigate to job-level applicant/dashboard view  
**Area:** Navigation, Post-publish  
**Priority:** P2  
**Effort:** S  
**User impact:** After publishing a job, employer is taken to the general jobs list. There is no direct route to the newly published job's applicant view.  
**Business impact:** Medium — reduces friction to monitoring a newly posted job.  
**Tech risk:** Low — `navigateByUrl` change in `afterSubmit()`.  
**Files to modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — `afterSubmit()` published branch
**Dependencies:** B03 not required  
**Acceptance criteria:** After a job is published and the employer dismisses the success dialog, they are taken to `/recruiter/jobs/applicants?jobId=[newJobId]`.

---

## B06: Pipeline Bar Click to Filtered Applicant List

**Title:** Clicking a pipeline stage on the dashboard navigates to a filtered applicant list  
**Area:** Dashboard, Pipeline  
**Priority:** P2  
**Effort:** S  
**User impact:** Pipeline stages on the dashboard are currently visual-only. Clicking a stage does not navigate to the applicants at that stage.  
**Business impact:** Medium — reduces clicks from dashboard to applicants by stage.  
**Tech risk:** Low — add click handler + navigate with filter query param.  
**Files to modify:**
- `company-dashboard.component.html` — pipeline stage click handler
- `job-applicants.component.ts` — accept stage filter query param
**Acceptance criteria:** Clicking "Shortlisted (3)" on the dashboard takes the employer to the applicant list filtered to shortlisted applicants.

---

## B07: Persistent Onboarding Checklist UI

**Title:** Add visual onboarding checklist for first-time employers  
**Area:** Onboarding, Dashboard  
**Priority:** P2  
**Effort:** M  
**User impact:** First-time employers have no visual progress indicator for setup completion (company profile, first job, first publish).  
**Business impact:** High for activation — onboarding checklists significantly improve time-to-first-post.  
**Tech risk:** Low-Medium — new component; state could be derived from existing API data.  
**Files to create/modify:**
- New `employer-onboarding-checklist.component`
- `company-dashboard.component` — add checklist widget
**Dependencies:** None (state derivable from existing data)  
**Acceptance criteria:** A first-time employer sees a checklist of 3–5 steps (set up company, post first job, review first applicant). Steps check off as they are completed. Checklist disappears or collapses when all steps are done.

---

## B08: prefers-reduced-motion in mainAnimations

**Title:** Add prefers-reduced-motion support to Angular animations and CSS transitions  
**Area:** Accessibility, Motion  
**Priority:** P2  
**Effort:** XS  
**User impact:** Users who have enabled reduced motion in their OS receive full animations regardless of their preference.  
**Business impact:** Low (affects a small percentage of users) but legally significant in some jurisdictions (WCAG 2.1 AA).  
**Tech risk:** Low  
**Files to modify:**
- `get-hired-FE/src/app/shared/animations/main-animations.ts` — add matchMedia check before animating
- `motion.scss` or global SCSS — add `@media (prefers-reduced-motion: reduce)` override block
**Acceptance criteria:** When `prefers-reduced-motion: reduce` is set in the OS, all CSS transitions and Angular animations in the employer panel either do not run or run at near-zero duration.

---

## B09: Sidebar Keyboard Navigation and ARIA Fixes

**Title:** Fix employer sidebar for keyboard navigation and ARIA compliance  
**Area:** Accessibility, Sidebar  
**Priority:** P2  
**Effort:** S  
**User impact:** Keyboard-only and screen reader users cannot navigate the employer sidebar.  
**Business impact:** Legal risk (WCAG 2.1 AA compliance), user trust.  
**Tech risk:** Low-Medium — template and SCSS change; no logic change.  
**Files to modify:**
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.html` — change `div` to `button` (or `a`) for nav items; add `<nav role="navigation" aria-label="Employer navigation">`; add `[attr.aria-current]` binding
- `employer-sidebar.component.scss` — add focus ring styles
**Dependencies:** None  
**Acceptance criteria:** All sidebar items are reachable via Tab key. The active item has `aria-current="page"`. The nav container has `role="navigation"`. Screen readers announce the navigation region and its items correctly.

---

## B10: inviteApplicant() Implementation

**Title:** Implement `inviteApplicant()` function  
**Area:** Applicant management  
**Priority:** P3  
**Effort:** M  
**User impact:** Employers cannot invite applicants to jobs or next steps from within the platform.  
**Business impact:** Medium — platform stickiness depends on employer-initiated outreach being in-app.  
**Tech risk:** Medium — requires backend endpoint + email/notification logic.  
**Files to modify:**
- `job-applicants.component.ts` — implement inviteApplicant()
- Backend: add invite endpoint
**Dependencies:** B01 (messaging) may overlap  
**Acceptance criteria:** Employer can click "Invite" on an applicant, fill in a message or select a template, and the applicant receives an in-app notification and/or email.

---

## B11: Company Profile Completeness Backend Score

**Title:** Backend-calculated company profile completeness score  
**Area:** Company profile, Dashboard  
**Priority:** P3  
**Effort:** M  
**User impact:** The frontend currently derives missing fields from the API response array. A dedicated completeness score from the backend would support richer UI (progress bar, percentage, targeted nudges).  
**Tech risk:** Low — additive backend feature.  
**Acceptance criteria:** API returns a `profileCompletnessScore` (0–100) alongside `missingFields`. Dashboard uses the score to display a progress indicator.

---

## B12: Job Quality and Readiness Panel

**Title:** Add a job quality/readiness visual panel in job-create and job-list  
**Area:** Job creation, Job list  
**Priority:** P2  
**Effort:** M  
**User impact:** Employers have no visibility into job posting quality (missing description, no banner, no salary range, low keyword density).  
**Business impact:** Higher-quality job posts attract more qualified applicants.  
**Tech risk:** Low (can be frontend-only initially, using form state).  
**Acceptance criteria:** Employer sees a quality score or checklist on the job create preview step and in the job list, highlighting missing optional fields that improve discoverability.

---

## B13: Job Sharing CTA

**Title:** Add job sharing CTA in job list and dashboard  
**Area:** Job discovery, Sharing  
**Priority:** P2  
**Effort:** XS  
**User impact:** Employers cannot easily share their job links from within the employer panel.  
**Business impact:** Direct path to more applicants with zero cost.  
**Tech risk:** Minimal — backend GET `/job/sharelink` exists.  
**Files to modify:**
- `job-list.component` — add "Copy Link" button per job
- `company-dashboard.component` — add "Share Job" action in pipeline or dashboard
**Acceptance criteria:** Employer can click "Share" on a published job, copy the public link, and share it externally. Link opens the public job detail page.

---

## B14: Draft Auto-Save and Unsaved Warning

**Title:** Auto-save job drafts and warn on unsaved navigate-away  
**Area:** Job creation  
**Priority:** P3  
**Effort:** M  
**User impact:** If the employer navigates away during job creation, form data is lost with no warning.  
**Business impact:** Reduced drop-off during job creation.  
**Tech risk:** Medium — requires debounced auto-save or a `CanDeactivate` guard.  
**Acceptance criteria:** Job create form auto-saves to draft every 30 seconds (or on step navigation). If the employer navigates away with unsaved changes, a confirmation dialog warns them.

---

## B15: Analytics Instrumentation in Employer Panel

**Title:** Implement analytics events in employer panel components  
**Area:** Analytics  
**Priority:** P3  
**Effort:** S  
**User impact:** No direct user impact; enables data-driven improvement.  
**Business impact:** Without analytics, product decisions are made without data.  
**Tech risk:** Low (additive).  
**Dependencies:** Confirm analytics infrastructure and consent mechanism (see Doc 29)  
**Acceptance criteria:** Events from the P1 priority list in Doc 29 are firing correctly. Privacy rules in Doc 29 are enforced.
