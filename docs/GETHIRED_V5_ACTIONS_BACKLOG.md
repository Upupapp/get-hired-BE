# GETHIRED V5 ACTIONS BACKLOG

**Generated:** 2026-06-24  
**Scope:** Post-V5 employer-side work — everything deferred, open, or newly surfaced after the V5 deployment  
**Source docs:** GETHIRED_EMPLOYER_FLOW_BACKLOG_V4.md, GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_BACKLOG_V5.md, GETHIRED_EMPLOYER_ACTIVATION_METRICS_PLAN_V5.md, and all V5 implementation logs

---

## Executive Summary

V5 shipped five concrete improvements: interview questions removed as a publish blocker (B04), post-publish routing to the job-specific applicant view (B05), a 3-step onboarding checklist on the dashboard (B07 partial), a mobile bottom nav bar (B02 partial), and employer-specific signup copy when `?role=2`. The sidebar was also restructured to 5 items and the Interviews stub was removed from navigation (route preserved).

**What is still open:** The highest-value unshipped feature is the global messages inbox (B01) — employers currently cannot check messages without navigating into a specific applicant detail. Next in priority is replacing the interview page under-construction stub (B03), followed by company profile subtabs (B09), and the full job readiness bar (B13). Analytics instrumentation, SEO/JSON-LD, and a handful of small accessibility fixes round out the backlog.

**V5 closed:** B04, B05, B07 (partial), B02 (partial), nav restructure, signup UX  
**Still open:** B01, B03, B06, B07-extended, B08, B09, B10, B11, B12, B13, B14, B15, B16, plus new SEO items

---

## Prioritized Backlog

### Priority definitions (V5 standard)
- **P0** — Launch blocker; do not ship to new users without resolving
- **P1** — Blocking meaningful employer use; fix before next push
- **P2** — Significant friction; fix in next sprint
- **P3** — Enhancement; fix when capacity allows
- **P4** — Nice-to-have; schedule when roadmap permits

### Effort key
- **XS** — < 2 hours  
- **S** — 2–8 hours  
- **M** — 1–3 days  
- **L** — 3–7 days  
- **XL** — 7+ days

---

### P0 — Launch Blockers

*No P0 items exist at this stage. All auth/guard P0s were resolved in the V3 P0/P1 sprint. The under-construction interview page (B03) is P1, not P0, because the sidebar link was removed in V5 — employers are no longer routed there by default.*

---

### P1 — High priority / next push

---

#### B01: Global Messages Inbox

**Title:** Add `/recruiter/messages` global inbox  
**Priority:** P1  
**Effort:** M  
**Depends on:** Backend GET `/messages/threads` endpoint (does not yet exist for employer-level thread list)

**Description:** Employers currently cannot check messages without navigating to a specific job's applicant detail panel. Unread messages are invisible from any top-level view. Messaging is a core employer-applicant communication channel; without a global inbox, employers miss replies and move communication off-platform.

**Acceptance criteria:**
- Employer can navigate to `/recruiter/messages` from the sidebar and see a list of all conversation threads
- Each thread shows applicant name, job title, latest message preview, and unread indicator
- Clicking a thread opens the full conversation and allows sending replies
- Sidebar shows an unread badge count when any thread has unread messages

**Recommended command:** `GETHIRED_EMPLOYER_GLOBAL_MESSAGES_INBOX_V5`

**Key files to create/modify:**
- New route: `/recruiter/messages` (employer-panel-routing.module.ts)
- New component: `employer-messages/` or adapted from job-applicants message panel
- Backend: GET `/messages/threads?companyId=` endpoint
- `employer-sidebar.component.ts` — add Messages item with badge

---

#### B03: Interview Page — Replace Under-Construction Stub

**Title:** Implement minimum viable `/recruiter/interview` page  
**Priority:** P1  
**Effort:** XL  
**Depends on:** Product decision on MVP scope (recommendation: use minimum viable scope below to unblock)

**Description:** `/recruiter/interview` renders `<app-under-construction>`. The route is preserved but the sidebar link was removed in V5. Employers who have interview questions configured on their jobs have no employer-side view to manage or review them. Minimum viable scope removes the dead end without requiring a full interview scheduling product.

**Acceptance criteria:**
- `/recruiter/interview` renders real content (no under-construction placeholder)
- Employer sees a list of their jobs with their configured interview questions
- Clicking a job's interview section links to step 3 of job edit
- Full scope (video response review, scheduling, question bank) is deferred

**Recommended command:** `GETHIRED_EMPLOYER_INTERVIEW_MODULE_MVP_V5`

**Key files to create/modify:**
- `interview.component.html/ts/scss` — new content replacing under-construction
- `employer-sidebar.component.ts` — re-add Interviews to sidebar once content exists
- `employer-panel-routing.module.ts` — no change needed (route already preserved)

---

### P2 — Next sprint

---

#### B06: Pipeline Bar Click to Filtered Applicant List

**Title:** Clicking a pipeline stage on the dashboard navigates to a filtered applicant list  
**Priority:** P2  
**Effort:** S  
**Depends on:** None

**Description:** Pipeline stage bars on the employer dashboard are currently visual-only. Clicking "Shortlisted (3)" or any stage does not navigate to the applicants at that stage — it routes to the jobs list instead.

**Acceptance criteria:**
- Clicking any pipeline stage bar navigates to `/recruiter/jobs/applicants?id=[jobId]&stage=[stageName]`
- The applicant list component filters by the `stage` query param when present
- Back navigation returns the employer to the dashboard without resetting the filter
- If no applicants exist for a stage, the filtered view shows the empty state

**Recommended command:** Direct implementation or STITCH

**Key files to modify:**
- `company-dashboard.component.html` — add click handler to pipeline stage bar
- `company-dashboard.component.ts` — add `navigateToPipelineStage(jobId, stage)` method
- `job-applicants.component.ts` — read and apply `stage` query param as filter

---

#### B08: Angular Animations Reduced-Motion Support

**Title:** Add `prefers-reduced-motion` support to Angular `mainAnimations`  
**Priority:** P2  
**Effort:** S  
**Depends on:** None

**Description:** CSS component animations already have `@media (prefers-reduced-motion: reduce)` fallbacks (added in V5). However, Angular `mainAnimations.ts` fires `trigger`/`state`/`transition` animations unconditionally — the Angular animation engine does not check OS reduced-motion preference automatically.

**Acceptance criteria:**
- `mainAnimations.ts` checks `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before returning animation definitions
- When reduced-motion is enabled, Angular animations either use `0ms` duration or return `NoopAnimationsModule`-equivalent no-ops
- No motion-only state changes remain (state must be conveyed by color or text, not animation alone)
- Existing component CSS `@media (prefers-reduced-motion: reduce)` blocks are unchanged

**Recommended command:** Direct implementation or OPTIMIZE

**Key files to modify:**
- `get-hired-FE/src/app/shared/animations/main-animations.ts`
- Possibly `app.module.ts` — conditional `BrowserAnimationsModule` vs `NoopAnimationsModule`

---

#### B10: Dashboard Draft Job CTA

**Title:** Surface draft jobs on dashboard with "Continue draft" action card  
**Priority:** P2  
**Effort:** S  
**Depends on:** Backend: `draftJobs` count in GET `/company/dashboard` response

**Description:** The dashboard does not surface draft jobs. An employer who started a job, saved as draft, and returned to the dashboard has no visible prompt to continue it. State C in the dashboard's 8-state model is partially handled (draft jobs show in the jobs list) but the dashboard action card for "Continue draft" is missing.

**Acceptance criteria:**
- When `draftJobs > 0` in the dashboard API response, an action card appears: "You have [N] draft job(s). Continue where you left off."
- CTA routes to `/recruiter/jobs/list` (filtered to drafts, or unfiltered with draft badge visible)
- Card is not shown when `draftJobs === 0`
- Onboarding checklist step 2 (Post first job) remains separate from draft card

**Recommended command:** STITCH or direct implementation

**Key files to modify:**
- `company-dashboard.component.html` — add draft action card template
- `company-dashboard.component.ts` — read `draftJobs` count from dashboard API response
- Backend: GET `/company/dashboard` response object — add `draftJobsCount` field

---

#### B11: Post-Publish jobId in Edit Flow Verification

**Title:** Verify B05 post-publish navigation works in job edit mode  
**Priority:** P2  
**Effort:** XS  
**Depends on:** B05 (already shipped in V5)

**Description:** B05 routes to `/recruiter/jobs/applicants?id=jobId` after publish. The fix reads jobId from the job-create query param when in edit mode. This should be verified: does `this.jobId` always resolve from the URL when `mode='edit'` and the employer publishes an existing draft?

**Acceptance criteria:**
- In edit mode (`/recruiter/jobs/edit?id=123`), after publishing, employer is routed to `/recruiter/jobs/applicants?id=123`
- If jobId is not available, fallback to `/recruiter/jobs/list` (no blank navigate)
- Verified via manual test in edit mode as well as create mode

**Recommended command:** Direct implementation / QA

**Key files to verify/modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — `afterSubmit()` published branch, edit-mode jobId sourcing

---

#### B12: aria-live on Panel Loading State

**Title:** Add `aria-live="polite"` to employer panel loading container  
**Priority:** P2  
**Effort:** XS  
**Depends on:** None

**Description:** The employer panel loading fallback (`#panelLoading` in employer-panel.component.html) does not have `aria-live`. Screen readers may not announce the transition from loading to loaded content, causing a jarring experience for screen reader users.

**Acceptance criteria:**
- `#panelLoading` (or equivalent loading container) has `aria-live="polite"` and `aria-busy="true"` while loading
- `aria-busy` is removed or set to `false` after content loads
- Screen reader announces loading completion without double-announcing page content

**Recommended command:** Direct implementation

**Key files to modify:**
- `get-hired-FE/src/app/employer-panel/employer-panel.component.html`

---

#### B13: Job Readiness Progress Bar in Job Create Step 4

**Title:** Add job readiness/completeness visual indicator in job create preview step  
**Priority:** P2  
**Effort:** S  
**Depends on:** None

**Description:** Job create step 4 (preview) has no visual indicator of job quality or completeness. Employers have no nudge to fill optional fields (salary, responsibilities, tags, certifications) that improve applicant quality. The V5 publish gate now only blocks on truly required fields — optional field guidance needs a separate UI element.

**Acceptance criteria:**
- Step 4 preview shows a progress bar or section chip list (e.g., "7/10 sections complete")
- Optional fields shown as "Recommended" chips — green if filled, grey if empty
- Clicking an empty chip scrolls the stepper back to the relevant step or section
- Required fields are not listed here (they block publish if absent — separate flow)
- No fake AI copy or auto-optimization copy

**Recommended command:** Direct implementation or OPTIMIZE

**Key files to modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.html` — step 4 template
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — readiness score computation method

---

#### B13-SEO: Public Job Detail JSON-LD

**Title:** Add Google JobPosting JSON-LD to public job detail  
**Priority:** P2  
**Effort:** S  
**Depends on:** Prior audit confirming all required Google JobPosting fields are available in the API response

**Description:** No JSON-LD structured data exists on the public job detail page. Google cannot rich-snippet GetHired jobs without it, reducing organic discoverability. Deferred from V4 and V5 because not all required fields were confirmed.

**Acceptance criteria:**
- `<script type="application/ld+json">` with valid JobPosting schema is injected into public-details.component
- Only required Google fields are used (`title`, `description`, `hiringOrganization.name`, `jobLocation.address`, `datePosted`)
- `validThrough` and `baseSalary` are included only when real data is present
- `employmentType` uses confirmed enum mapping (e.g. "FULL_TIME") — no guesses
- No hardcoded values; all values come from the live API response

**Recommended command:** OPTIMIZE or direct implementation after API contract audit

**Key files to modify:**
- `get-hired-FE/src/app/public-portal/public-details/public-details.component.html`
- `get-hired-FE/src/app/public-portal/public-details/public-details.component.ts`

---

#### B16: Mobile Nav aria-current

**Title:** Add `aria-current="page"` to active mobile nav items  
**Priority:** P2  
**Effort:** XS  
**Depends on:** None

**Description:** The mobile bottom nav bar uses `routerLinkActive` for CSS class changes only. `aria-current="page"` is not conditionally bound to the active item. Screen readers have no programmatic way to know which mobile nav item is current.

**Acceptance criteria:**
- Active mobile nav item has `[attr.aria-current]="isActive ? 'page' : null"` binding
- Binding uses `Router.isActive()` or `routerLinkActive` exported reference
- Post Job item (no routerLinkActive) has no `aria-current` (correct — it is a transient action)

**Recommended command:** Direct implementation

**Key files to modify:**
- `get-hired-FE/src/app/employer-panel/employer-panel.component.html` — mobile nav template

---

### P3 — Enhancement (schedule when capacity allows)

---

#### B07-extended: Full Guided Onboarding Wizard

**Title:** Full separate-route onboarding wizard for first-time employers  
**Priority:** P3  
**Effort:** M  
**Depends on:** B07 inline checklist (shipped in V5)

**Description:** V5 shipped a 3-step inline checklist on the dashboard. A full wizard (dedicated route, multi-step progress indicator, richer copy, dismissible) would provide a more guided experience for new employers who are unfamiliar with the platform.

**Acceptance criteria:**
- New route `/recruiter/onboarding` with a multi-step wizard component
- Steps: (1) Company basics, (2) Add logo/banner, (3) Post first job, (4) Review applicants
- Progress bar across top; step-by-step navigation with back/next
- Wizard appears once per employer (dismissed via backend flag or localStorage)
- Dashboard checklist remains as the persistent reference; wizard is the first-run deep guide

**Recommended command:** `GETHIRED_EMPLOYER_ONBOARDING_WIZARD_V6` or direct implementation

---

#### B09: Company Profile Subtabs (Profile / Employer Brand / Benefits)

**Title:** Add subtab navigation to company profile page  
**Priority:** P3  
**Effort:** M  
**Depends on:** None (current `/recruiter/company/details` route preserved)

**Description:** The company details page currently shows all fields on one long form. A subtab structure (Profile | Employer Brand | Benefits & Culture) would improve organisation and give employers a clearer mental model of their public employer brand vs admin settings.

**Acceptance criteria:**
- `/recruiter/company/details` route renders subtab nav with 3 tabs: Profile, Employer Brand, Benefits & Culture
- Profile tab: existing company basics form (name, description, location, type, size, industry)
- Employer Brand tab: logo upload, banner image, brand colors (colour field if present)
- Benefits & Culture tab: benefits list, culture description (fields may need backend additions — backlog B09b)
- Each tab is independently saveable
- No data loss on tab switch (unsaved changes preserved in-memory)

**Recommended command:** `GETHIRED_EMPLOYER_COMPANY_PROFILE_SUBTABS_V6`

---

#### B10-subs: Subscription Subtab under Company

**Title:** Move Subscription to a subtab under Company  
**Priority:** P3  
**Effort:** S  
**Depends on:** B09 (Company subtabs)

**Description:** The V5 navigation keeps Subscription as a top-level sidebar item. Once Company profile has subtabs, Subscription is a natural fit as a fourth subtab (Profile | Employer Brand | Benefits | Subscription), reducing sidebar length and grouping account settings logically.

**Acceptance criteria:**
- Subscription content moves to a subtab under Company (same route or nested)
- Top-level sidebar Subscription item replaced by a subtab link
- Old `/recruiter/subscription` route redirects to new location (no broken deep links)

**Recommended command:** Direct implementation after B09

---

#### B14: Draft Auto-Save and Unsaved Warning

**Title:** Auto-save job drafts and warn on navigate-away with unsaved changes  
**Priority:** P3  
**Effort:** M  
**Depends on:** None

**Description:** If an employer navigates away during job creation, form data is lost with no warning. An auto-save (debounced draft save every 30 seconds or on step change) and a `CanDeactivate` guard would prevent silent data loss.

**Acceptance criteria:**
- Job create form auto-saves to draft on every step navigation (or every 30 seconds)
- If employer navigates away with unsaved changes, a confirmation dialog warns them
- Auto-save indicator shows "Saved X seconds ago" or "Saving..."
- No duplicate draft records on repeated saves to the same job

**Recommended command:** Direct implementation

**Key files to create/modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — auto-save logic + CanDeactivate
- New `CanDeactivate` guard or implement `canDeactivate()` interface on the component

---

#### B15: Analytics Instrumentation in Employer Panel

**Title:** Implement `EmployerActivationAnalyticsService` and fire events at defined triggers  
**Priority:** P3  
**Effort:** S  
**Depends on:** Analytics provider decision (Mixpanel, Segment, or custom backend endpoint)

**Description:** The V5 metrics plan defines 14 funnel events and 8 activation metrics. None are instrumented yet beyond a `PublicPortalAnalyticsService.trackTalentProofViewed()` proxy. Until an analytics provider is selected, no events can fire. This item is unblocked only after the infrastructure decision.

**Acceptance criteria:**
- `EmployerActivationAnalyticsService` created in `shared/services/`
- Events fired at all 14 trigger points defined in GETHIRED_EMPLOYER_ACTIVATION_METRICS_PLAN_V5.md
- No applicant personal data (name, ID) in employer-side events
- Privacy rules from the metrics plan enforced (no protected attributes, no salary expectations)
- Events confirmed arriving at the analytics provider dashboard

**Recommended command:** Direct implementation after provider selected

**Key files to create/modify:**
- `get-hired-FE/src/app/shared/services/employer-activation-analytics.service.ts` (new)
- `signup.component.ts`, `job-create.component.ts`, `company-dashboard.component.ts`

---

#### B13-sharing: Job Sharing CTA

**Title:** Add "Copy Link" / "Share" CTA on published job cards  
**Priority:** P3  
**Effort:** XS  
**Depends on:** Backend GET `/job/sharelink` (confirmed existing per V4 audit)

**Description:** Employers cannot easily share their job links from within the employer panel. The backend share link endpoint already exists.

**Acceptance criteria:**
- Job list and dashboard each show a "Share" or "Copy Link" button per published job
- Clicking copies the public job URL to clipboard with a toast confirmation
- Link format: `/jobs/details/:id` (existing public detail route)
- Button is not shown for draft or expired jobs

**Recommended command:** Direct implementation

---

#### B10-invite: inviteApplicant() Implementation

**Title:** Implement `inviteApplicant()` — employer-initiated applicant outreach  
**Priority:** P3  
**Effort:** M  
**Depends on:** B01 (global messages, partial overlap in messaging infrastructure)

**Description:** The `inviteApplicant()` function stub exists in `job-applicants.component.ts` but is not implemented. Employers cannot invite applicants to jobs or next steps from within the platform.

**Acceptance criteria:**
- Employer can click "Invite" on an applicant in the applicant list
- A dialog/panel allows entering a message or selecting a template
- Submission sends an in-app notification and/or email to the applicant
- The action is logged in the applicant's thread

**Recommended command:** Direct implementation after B01

---

#### B11-profile: Company Profile Completeness Backend Score

**Title:** Backend-calculated company profile completeness score  
**Priority:** P3  
**Effort:** M  
**Depends on:** None (additive backend feature)

**Description:** The dashboard onboarding checklist and action cards currently derive missing fields from the API response array on the frontend. A dedicated backend completeness score would support richer UI (progress bar with percentage, targeted nudges per missing field category).

**Acceptance criteria:**
- GET `/company/details` or GET `/company/dashboard` returns `profileCompletenessScore: 0–100`
- Score is calculated from a defined set of fields (name, description, logo, city, size, industry)
- Dashboard uses the score to render a progress indicator (e.g., "72% complete")
- Missing fields array is still returned for targeted nudges

**Recommended command:** Direct implementation (backend)

---

### P4 — Nice-to-have

---

#### B14-roleintent: Employer Signup Role Intent Persistence

**Title:** Persist employer role intent in sessionStorage across signup navigation  
**Priority:** P4  
**Effort:** XS  
**Depends on:** None

**Description:** When an employer arrives from `/employers` and clicks signup, they go to `/signup?role=2`. If they navigate away and return to `/signup` without the query param, the employer-specific copy is lost and they see the default signup form.

**Acceptance criteria:**
- On `/signup` ngOnInit, if `role=2` is in query params, save to `sessionStorage.setItem('intendedRole', '2')`
- On subsequent `/signup` loads without query param, read `sessionStorage.getItem('intendedRole')` to restore role=2 behaviour
- sessionStorage is cleared on successful signup

---

#### B15-publicpreview: Company Profile Public Preview

**Title:** "Preview as applicant" CTA on company profile page  
**Priority:** P4  
**Effort:** S  
**Depends on:** Public `/companies/:id` or `/company/:slug` route confirmed to exist

**Description:** No "Preview as applicant" CTA exists on the company profile admin page. Employers cannot see what applicants see when they visit the company's public profile.

**Acceptance criteria:**
- Company profile page (`/recruiter/company/details`) shows "Preview public profile" button
- Clicking opens the public company profile in a new tab
- If no public company profile route exists, CTA is absent (not a dead link)

---

## Recommended Next Sprint Scope

**Sprint goal:** Unblock employer communication and remove the largest dead end in the current employer panel.

### Sprint order

1. **B01 — Global Messages Inbox** (P1, M)  
   Highest-value unshipped feature. Backend endpoint needed first; frontend route and component second. Estimate: 2–3 days total.  
   Start with: audit GET `/messages/thread` endpoint for whether a per-employer threads-list endpoint can be added without schema changes.

2. **B03 — Interview Page MVP** (P1, XL)  
   Use minimum viable scope only: list of jobs + their interview questions + link to job edit step 3. Do NOT attempt scheduling or video review in this sprint.  
   Estimate: 2–3 days for MVP scope.

3. **B06 — Pipeline Bar Click to Filtered Applicant List** (P2, S)  
   Quick win. Click handler + query param on applicant list. Estimate: half day.

4. **B16 + B12 — Accessibility micro-fixes** (P2, XS each)  
   `aria-current` on mobile nav + `aria-live` on panel loading. Bundle together. Estimate: 2–3 hours.

5. **B13 — Job Readiness Progress Bar** (P2, S)  
   Step 4 preview readiness chips/bar. High employer UX value, contained to job-create component. Estimate: 1 day.

**Defer from this sprint:** B08 (reduced-motion Angular animations — no user-facing regression, address in OPTIMIZE pass), B09 (company subtabs — M effort, lower urgency than B01/B03), B15 (analytics — blocked on provider decision).

---

## Decision Log

Decisions made in V5 that constrain or inform future work:

| # | Decision | Rationale | Constraint |
|---|----------|-----------|-----------|
| D1 | Interview questions are no longer required to publish a job (B04) | Removed friction; employers can post without video interview step | Interview questions are now fully optional. Any future "job quality score" must not re-add them as blocking. |
| D2 | Interviews tab removed from sidebar (route preserved) | Route `/recruiter/interview` still renders under-construction; removing from sidebar prevents dead-end navigation | B03 must re-add the sidebar item when real content is shipped. Do not remove the route. |
| D3 | Mobile nav has 5 items; "Post Job" is the accent CTA center item | Follows action-bias mobile nav pattern; keeps sidebar items to 5 | Any new top-level nav item on mobile must be evaluated against this 5-item budget. Messaging (B01) will need to be added to mobile nav when shipped. |
| D4 | No analytics instrumentation added in V5 | No analytics backend/provider confirmed; instrumentation without a backend is dead code | B15 is unblocked only after analytics provider is selected. The existing `PublicPortalAnalyticsService.trackTalentProofViewed()` is the only active event. |
| D5 | JSON-LD / Google JobPosting deferred (no changes to public-details in V5) | Not all required Google fields confirmed in API response | B13-SEO must be preceded by a dedicated audit of `public-details.component` and the job API response. Do not add JSON-LD by guessing field names. |
| D6 | Company profile subtabs deferred (B09) | Single-form layout preserved; subtabs are P3 enhancement | `/recruiter/company/details` route is the canonical company admin route. Any future subtab work must use sub-routes or query params, not a new top-level route. |
| D7 | Dashboard state machine: 8 states documented and partially implemented | All 8 states (A–H) are handled in the dashboard component | State F (messages) still renders the "no messages" empty state — it will activate only when B01 is shipped. |
| D8 | No AI copy, auto-optimization, or fake quality scores added | Fair-hiring and trust guardrails | B13 (job readiness bar) must use factual field-fill counts only, not AI-generated or estimated scores. |
| D9 | Sidebar "Contacts" renamed to "Candidates"; route unchanged | Employer clarity; "Contacts" was confusing next to "Candidates" sub-item | `/recruiter/contacts/**` is the real route. The sidebar label is "Candidates" in V5+. Do not change the route. |
| D10 | ng build passes with zero errors; 2 pre-existing warnings unchanged | V5 policy: no new build errors introduced | All future V5+ work must maintain this standard: `ng build --configuration production` with zero new errors. |

---

## Metrics Instrumentation Backlog

From GETHIRED_EMPLOYER_ACTIVATION_METRICS_PLAN_V5.md — nothing is instrumented yet except the `trackTalentProofViewed` proxy. The following events need implementation when the analytics infrastructure is ready:

### Events not yet instrumented (14 total)

| Event | Trigger Point | File |
|-------|--------------|------|
| `employer_landing_viewed` | `/employers` page load | PublicPortalComponent or router event |
| `employer_signup_started` | SignupComponent ngOnInit with role=2 | `signup.component.ts` |
| `employer_account_created` | Successful POST `/auth/signup` | `signup.component.ts` (success handler) |
| `employer_onboarding_started` | Dashboard load, first time, no company | `company-dashboard.component.ts` (State A) |
| `company_basics_started` | Company profile form first interaction | Company details component |
| `company_basics_completed` | Company form save success | Company details component (PUT success) |
| `employer_brand_started` | Logo/description form first interaction | Company details component |
| `employer_brand_minimum_completed` | Logo + description + city all present | Derived from company API response |
| `first_job_started` | JobCreateComponent ngOnInit (no jobId) | `job-create.component.ts` |
| `first_job_draft_saved` | `afterSubmit('asDraft')` | `job-create.component.ts` |
| `first_job_previewed` | Stepper navigates to step 4 | `job-create.component.ts` (`changeStep(4)`) |
| `first_job_published` | `afterSubmit('published')` | `job-create.component.ts` |
| `job_dashboard_viewed` | JobApplicantsComponent load after publish | `job-applicants.component.ts` |
| `returning_employer_loop` | Dashboard load with published jobs | `company-dashboard.component.ts` (State H) |

### Activation metrics to derive from events

| Metric | Formula | Status |
|--------|---------|--------|
| Signup completion rate | `employer_account_created / employer_signup_started` | Not instrumented |
| Company basics completion rate | `company_basics_completed / employer_onboarding_started` | Not instrumented |
| First job started rate | `first_job_started / employer_account_created` | Not instrumented |
| Draft save rate | `first_job_draft_saved / first_job_started` | Not instrumented |
| First job publish rate | `first_job_published / employer_account_created` | Not instrumented |
| Draft-to-publish conversion | `first_job_published / first_job_draft_saved` | Not instrumented |
| Time from signup to first draft | `ts(first_job_draft_saved) - ts(employer_account_created)` | Not instrumented |
| Time from signup to first publish | `ts(first_job_published) - ts(employer_account_created)` | Not instrumented |

### Infrastructure prerequisite
Before any of the above can be instrumented, a decision is needed on the analytics provider:
- Option A: Third-party SaaS (Mixpanel, Segment, PostHog) — lowest BE build cost, fastest time to value
- Option B: Custom backend endpoint (`POST /analytics/event`) — no third-party data sharing, higher build cost
- Option C: GA4 / Google Analytics — free, but less employer funnel granularity

**Recommendation:** PostHog (self-hosted or cloud) — open source, GDPR-friendly, good funnel analysis, Angular SDK available.

### Privacy constraints (non-negotiable)
Do NOT collect in any employer-side event:
- Protected attributes (race, gender, age, disability)
- Applicant salary expectations or benefits preferences
- Biometric data (face, voice, emotion)
- Applicant PII (name, email, ID)
- Precise geolocation without explicit consent

---

## Suggested Next Commands (in order)

1. `GETHIRED_EMPLOYER_GLOBAL_MESSAGES_INBOX_V5`  
   Build the B01 global messages inbox: backend thread-list endpoint + frontend route + component + sidebar badge. This is the highest-value unshipped employer feature.

2. `GETHIRED_EMPLOYER_INTERVIEW_MODULE_MVP_V5`  
   Replace the under-construction stub with a minimum viable interview page: jobs list with interview questions + link to job edit step 3. Re-add to sidebar.

3. `/code-review` or direct implementation — B06 + B16 + B12 bundle  
   Pipeline bar click (B06), mobile nav aria-current (B16), and panel aria-live (B12) are all small and can ship in a single focused session.

4. `GETHIRED_EMPLOYER_JOB_READINESS_BAR_V6`  
   Implement B13 job readiness progress bar in job create step 4 preview. Factual field-count only, no AI copy.

5. `GETHIRED_EMPLOYER_COMPANY_PROFILE_SUBTABS_V6`  
   B09 company profile subtabs. Only after B01 and B03 are resolved — lower priority but high polish value.
