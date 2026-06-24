# GetHired Employer Journey — Benchmark and Best Practices V4

**Date:** 2026-06-24
**Scope:** 10 benchmark frameworks applied to the GetHired employer journey. For each framework: principle, current GetHired state, decision, frontend implication, motion/haptic implication, a11y safeguard, safety rule, and acceptance criteria.

---

## Table of Contents

1. NN/g Service Blueprint
2. NN/g Journey Map
3. Greenhouse Structured Hiring
4. Workable Pipeline
5. Google JobPosting Structured Data
6. Material / Fluent Motion
7. WCAG 2.2
8. Modern SaaS Command Center
9. Progressive Disclosure
10. No-Fake-Data Trust
11. Summary Gap Table

---

## 1. NN/g Service Blueprint

### Principle

The Nielsen Norman Group service blueprint maps user actions, frontstage touchpoints, backstage processes, and support systems across each phase of a service. It forces visibility of what the user does versus what the system does invisibly, and where handoffs fail.

### GetHired Current State

The employer journey has identifiable phases (awareness, signup, company setup, job creation, publish, applicant review, pipeline management) but there is no documented service blueprint. Backstage failures (company-not-setup redirect bug, inviteApplicant TODO, missing global messages) are invisible to the employer and cause dead ends rather than recoverable errors.

### Decision

Adopt the NN/g service blueprint format as the primary design artifact for all V4 employer journey planning. See `GETHIRED_EMPLOYER_SERVICE_BLUEPRINT_V4.md` for the full blueprint.

### Frontend Implication

Every phase transition must have a visible frontstage confirmation state (snackbar, dialog, or route change). Invisible backstage failures must surface as recoverable error states with actionable copy rather than silent no-ops.

### Motion/Haptic Implication

Phase transitions (e.g., company setup complete, job published) trigger `HapticFeedbackService.success()` or `.jobPublished()`. The `@animate` Angular trigger (fade+scale, 600ms) on phase-entry elements communicates that a new service phase has begun.

### A11y Safeguard

Each phase boundary must announce itself to screen readers via a live region or focus management. Routing navigations must move focus to the new page's H1 or main landmark.

### Safety Rule

No phase transition may silently discard user input. If a backstage process fails (API error, validation block), the frontstage must show an actionable error state before the user proceeds or is redirected.

### Acceptance Criteria

- All 8 service phases are documented with user action, frontstage component, API call, and success/fail state.
- Zero silent no-ops: every CTA that currently does nothing (company-not-setup redirect, inviteApplicant) has either a working implementation or a clearly disabled state with explanatory copy.
- Each phase-entry route announces its H1 to assistive technology on navigation.

---

## 2. NN/g Journey Map

### Principle

The NN/g journey map documents the employer's experience across touchpoints — thoughts, feelings, actions, and pain points — organized by phase. It identifies moments of delight and moments of friction.

### GetHired Current State

No formal journey map exists. Identified friction moments include:
- No mobile navigation (sidebar hidden on mobile).
- Employers cannot see all messages without navigating through individual job applicant pages.
- The "Employer Branding" sidebar label leads to company details, creating label-mismatch confusion.
- The company-not-setup flow terminates in a dialog with a non-functional CTA.
- interviewQuestions being required to publish is a hard block with no in-stepper guidance about why.

Identified delight moments:
- Dashboard command center with gradient mesh hero, KPI cards, and real pipeline data.
- Match signal indicators on applicant table give employers decision-support before clicking into a profile.
- Skeleton loaders in the dashboard (hero, action center, pipeline) prevent layout shift and communicate loading progress.

### Decision

Map the employer journey with explicit sentiment annotations at each phase. Use friction points to prioritize bug fixes (company redirect, inviteApplicant) over new features.

### Frontend Implication

Add inline contextual help copy at the interviewQuestions step explaining that questions are required to publish. Add a disabled-state label on "Publish" buttons when pre-conditions are unmet. Replace the "Employer Branding" sidebar label with "Company Profile" to match the actual destination.

### Motion/Haptic Implication

At high-friction moments (validation block, empty state with zero jobs), use `HapticFeedbackService.selection()` on focus events to keep the employer grounded without false-positive success signals.

### A11y Safeguard

All friction-point error messages must use `role="alert"` or `aria-live="polite"` so screen reader users hear the error without requiring a visual scan.

### Safety Rule

Do not suppress friction by hiding errors. Surfacing friction with clear next-action CTAs is preferable to silent failure or redirect loops.

### Acceptance Criteria

- Sidebar item label "Employer Branding" is renamed to "Company Profile" and route behavior is unchanged.
- interviewQuestions step shows inline copy: "At least one interview question is required before publishing."
- Publish button is visually disabled (not just post-click snackbar) when required publish fields are missing.

---

## 3. Greenhouse Structured Hiring

### Principle

Greenhouse defines structured hiring as a system where every hiring decision is based on pre-defined, consistently applied criteria — job scorecard, interview plan, evaluation rubric. Each stage of the funnel has a defined purpose and defined success criteria before any candidate enters it.

### GetHired Current State

GetHired has the structural pieces for structured hiring: job types, job levels, categories, interview questions per job, and match signals per applicant. However:
- Interview questions are required to publish but there is no template library accessible in the employer panel (interview templates are referenced by `interviewTemplateId` in the job create form but no template browser UI is visible in current routes).
- Match signals are surfaced as a table column and a disclaimer, but no scoring rubric or decision workflow exists in the panel.
- Pipeline stages exist (referenced by `statusId` in the dashboard pipeline chart) but pipeline stage advancement is not a documented employer action in any current component.

### Decision

V4 documents structured hiring as the target model but defers full implementation to a future phase. Current architecture supports structured hiring at the data layer; the UI layer needs pipeline advancement controls, evaluation notes, and a shortlist/reject decision flow.

### Frontend Implication

The applicant detail panel should expose: current pipeline stage, a stage-advance action (once `inviteApplicant()` is implemented), and a notes/evaluation field. These are deferred but must be architecturally planned.

### Motion/Haptic Implication

Stage advancement is a significant employer action. It should trigger `HapticFeedbackService.success()` and a brief stage-transition animation (slide or fade of the stage badge).

### A11y Safeguard

Pipeline stage changes must be announced via `aria-live="polite"` so screen reader users hear the new stage label.

### Safety Rule

Never auto-advance a candidate's pipeline stage without an explicit employer action. System-inferred signals (match signals) are decision-support only, not automatic stage advancement.

### Acceptance Criteria

- Match signal disclaimer copy is preserved: "Match Signals are decision-support indicators..." — this text must not be removed.
- `inviteApplicant()` empty method is replaced with a working implementation before any stage-advancement UI is shipped.
- Pipeline stage clicks on the dashboard navigate to the job-specific applicant list filtered by that stage (currently navigates to generic job list — this is a documented bug).

---

## 4. Workable Pipeline

### Principle

Workable's pipeline model provides a Kanban-like view of candidates across hiring stages, with quick actions (email, move, reject, shortlist) accessible from the pipeline card without deep navigation. The employer's primary mental model is: "Where is each candidate right now?"

### GetHired Current State

The employer's current path to applicant status is: Dashboard pipeline bar chart -> click bar -> goToJobsList() (generic). There is no Kanban view. Applicant status changes are not exposed as a UI action. The pipeline bar chart shows aggregate data but offers no drill-down to the specific applicants at each stage.

### Decision

Document the gap. V4 notes that pipeline drill-down (bar chart stage click -> job-specific filtered applicant list by stage) is a required fix. A full Kanban view is deferred.

### Frontend Implication

`goToJobsList()` in `company-dashboard.component` should be replaced with a method that navigates to `/recruiter/jobs/applicants?id=X&stage=Y`, filtering by the clicked pipeline stage. This requires passing both a job ID and a stage filter — which means the pipeline data from `/company/dashboard/pipeline-overview` must include a representative job ID per stage, or the drill-down lands on a cross-job stage view.

### Motion/Haptic Implication

Pipeline bar hover should use `.gh-pressable` CSS scale with a brief tooltip showing the stage name and count. Click should use `HapticFeedbackService.press()` before navigation.

### A11y Safeguard

Pipeline bars must have `aria-label` values such as "Screening stage: 12 applicants. Click to view." Purely visual bar charts with no accessible label are a WCAG 2.2 failure.

### Safety Rule

Pipeline stage data displayed in the dashboard must come exclusively from `/company/dashboard/pipeline-overview`. Do not use client-side mock counts.

### Acceptance Criteria

- Dashboard pipeline bar chart: each bar click navigates to the correct filtered applicant view (or a cross-job stage view if single-job drill-down is not feasible).
- Each pipeline bar has an `aria-label` with stage name and applicant count.
- `goToJobsList()` is replaced or extended before V4 ships.

---

## 5. Google JobPosting Structured Data

### Principle

Google's JobPosting schema (schema.org/JobPosting) defines the required and recommended fields for a job post to be eligible for Google Jobs rich results. Required: `title`, `datePosted`, `description`, `hiringOrganization`. Recommended: `jobLocation`, `baseSalary`, `employmentType`, `validThrough`, `jobLocationType`.

### GetHired Current State

The job create form collects: `jobTitle`, `jobDescription`, `jobTypeId` (employment type), `jobCity`, `jobCountry`, `salaryMinimum`, `salaryMaximum`, `salaryCurrency`, `workSetupId` (maps to jobLocationType). Company data provides `hiringOrganization`. `datePosted` is presumably set by the backend on publish.

Fields collected but not confirmed as schema.org output:
- `jobAddress` (maps to `streetAddress` in PostalAddress)
- `jobLevelId` (maps to `experienceRequirements`)
- `certificationRequirements` (maps to `qualifications`)

The public job detail page (`/jobs/details/:id`, `PublicDetailsComponent`) does not have confirmed JSON-LD script injection for schema.org output. This is an assumption gap — the backend (`/job/published`, `/job/details`) may or may not generate structured data.

### Decision

V4 documents schema.org compliance as a required audit item. The frontend `PublicDetailsComponent` should inject a `<script type="application/ld+json">` block with JobPosting schema populated from API response fields.

### Frontend Implication

`PublicDetailsComponent` needs a JSON-LD service or inline template binding to render schema.org JobPosting from the job detail API response. Map: `jobTitle` -> `title`, `jobDescription` -> `description`, company name -> `hiringOrganization.name`, `jobCity`+`jobCountry` -> `jobLocation.address`, `salaryMinimum`/`salaryMaximum`/`salaryCurrency` -> `baseSalary`, `jobTypeId` resolved label -> `employmentType`.

### Motion/Haptic Implication

None — structured data is in the document head and has no UI.

### A11y Safeguard

JSON-LD does not affect the accessible DOM. No special a11y handling required for structured data injection.

### Safety Rule

Never inject fictitious salary data. If `salaryMinimum` and `salaryMaximum` are both null, omit the `baseSalary` property from the schema.org output entirely.

### Acceptance Criteria

- `PublicDetailsComponent` injects valid schema.org JobPosting JSON-LD when job data is loaded.
- Salary fields are omitted from JSON-LD when not provided by the employer.
- Google Rich Results Test passes for at least one live job URL.

---

## 6. Material / Fluent Motion

### Principle

Google Material Motion and Microsoft Fluent Motion both specify that animations should be purposeful (communicate meaning, not decorate), quick (100–300ms for micro, 300–600ms for transitions), and responsive to the user's `prefers-reduced-motion` media query.

### GetHired Current State

The codebase has a defined motion system:
- `mainAnimations` module provides `@animate` trigger (fade+scale, 600ms) and `fadeInOut`.
- `motion.scss` is imported in `styles.scss` and in the dashboard SCSS.
- `HapticFeedbackService` provides: `.selection()`, `.press()`, `.success()`, `.jobPublished()`.
- `.gh-pressable` CSS class is used on buttons (press micro-scale expected).
- Skeleton loaders: `emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`.

The 600ms duration of `@animate` is at the high end of the Material recommendation for page-level transitions. Micro-interactions (button press, hover) should target 100–200ms.

### Decision

Preserve the existing motion vocabulary. Enforce `prefers-reduced-motion` at the `motion.scss` level. Verify that `.gh-pressable` and `@animate` respect the reduced-motion media query.

### Frontend Implication

Add `@media (prefers-reduced-motion: reduce)` overrides in `motion.scss` that disable transform-scale and reduce opacity transitions to instant (0ms). The `@animate` trigger should check for reduced motion or use Angular's `AnimationBuilder` with a conditional duration.

### Motion/Haptic Implication

`HapticFeedbackService` calls should be silent no-ops on non-haptic platforms (browser). Confirm that the service already gracefully handles environments where the Vibration API is absent.

### A11y Safeguard

Animations that convey state changes (pipeline stage bar, skeleton -> content transition) must not be the only mechanism for communicating that state. The content itself (text, ARIA role updates) must convey the same information.

### Safety Rule

Do not add new animation triggers that lack a `prefers-reduced-motion` override. All new motion must be added to `motion.scss` with the reduced-motion counterpart in the same diff.

### Acceptance Criteria

- `motion.scss` contains `@media (prefers-reduced-motion: reduce)` rules covering all existing animation classes.
- `@animate` trigger produces no visible movement when reduced motion is active.
- `.gh-pressable` press scale is 0ms (instant) under reduced motion.

---

## 7. WCAG 2.2

### Principle

WCAG 2.2 (Web Content Accessibility Guidelines) defines four principles — Perceivable, Operable, Understandable, Conformant — with specific success criteria. Key 2.2 additions relevant to this project: 2.4.11 Focus Not Obscured, 2.4.12 Focus Not Obscured (Enhanced), 2.5.3 Label in Name, 3.2.6 Consistent Help, 3.3.7 Redundant Entry.

### GetHired Current State

Known gaps:
- Sidebar is hidden on mobile with no accessible alternative.
- Pipeline bar chart has no confirmed `aria-label` on chart bars.
- Match signal table column has no confirmed `aria-description` for the signal values.
- Snackbar for publish-blocked uses `success-snackbar` panelClass (coral color) — color alone conveys error vs. success, violating 1.4.1 Use of Color.
- `CompanyNotSetupComponent` dialog button ("Setup Company") performs no navigation — a screen reader user would activate the button and receive no feedback beyond the dialog closing.
- Focus management on route changes is not confirmed (Angular 13 does not automatically restore focus to the top of the new page).

### Decision

V4 targets WCAG 2.1 AA minimum. WCAG 2.2 criteria (2.4.11, 2.5.3) are implemented where cost is low. Full WCAG 2.2 AA audit is a separate workstream.

### Frontend Implication

- Fix `success-snackbar` panelClass on the publish-blocked snackbar to a semantic error class.
- Add `aria-label` to all pipeline bar chart segments.
- Add `aria-live="polite"` region for applicant list updates.
- Add router scroll/focus reset service for employer panel route changes.
- Add `aria-disabled="true"` and explanatory `aria-describedby` text to CTAs that are currently silent no-ops.

### Motion/Haptic Implication

See Framework 6 (Material/Fluent Motion) for `prefers-reduced-motion` requirements.

### A11y Safeguard

No new CTA may be shipped without: an `aria-label` when the visible label is ambiguous, a focus state defined in CSS, and a disabled-state variant with `aria-disabled` and descriptive text.

### Safety Rule

Color alone must never be the only differentiator between success and error states. Always pair color with an icon, text prefix ("Error:", "Success:"), or ARIA role.

### Acceptance Criteria

- Publish-blocked snackbar uses a semantic error/warning panelClass (not `success-snackbar`).
- Pipeline bar chart segments each have `aria-label` with stage name and count.
- All employer panel route navigations move keyboard focus to the page H1 or main landmark.
- Match signal column header has tooltip and `aria-describedby` explaining signal semantics.

---

## 8. Modern SaaS Command Center

### Principle

Modern B2B SaaS platforms (Greenhouse, Lever, Workable, HubSpot) design their employer/recruiter dashboards as command centers: a single-screen summary of what needs attention right now, with direct drill-down actions from that screen. The key design principles: surfaced urgency, reduced navigation depth, data-forward layout, and progressive task completion from the summary view.

### GetHired Current State

The dashboard (`company-dashboard.component`) implements a command center pattern with:
- KPI cards: `activeJobs`, `applicants/month`, `interviews/month`, `needsReview`
- Action center: conditional CTAs based on live data (review applicants if `needsReviewCount > 0`, manage jobs always, complete company profile if fields missing)
- Hiring pipeline bar chart (real data from `/company/dashboard/pipeline-overview`)
- Applicants-needing-review list with direct drill-down

Gaps vs. best-in-class command centers:
- Pipeline bar click goes to generic job list (not filtered by stage).
- No cross-job applicant inbox.
- No urgency indicators (e.g., applications older than 7 days flagged).
- No quick action (approve/reject/message) from the dashboard needs-review list.

### Decision

Preserve and extend the command center pattern. Fix the pipeline drill-down bug. Defer cross-job inbox and urgency flags to a post-V4 backlog.

### Frontend Implication

`company-dashboard.component` needs: (1) pipeline bar click -> correct filtered route; (2) needs-review list items with inline CTA to open applicant detail; (3) empty state for each KPI card when value is 0.

### Motion/Haptic Implication

KPI card entry uses `@animate` trigger (fade+scale). Dashboard load sequence: hero skeleton -> KPI skeleton -> pipeline skeleton -> content. Each skeleton-to-content transition uses a staggered fade, not a simultaneous pop.

### A11y Safeguard

KPI cards must not use color alone to convey positive/negative trends. If a delta indicator (up/down arrow) is added in a future phase, it must include `aria-label="Increased by X"` or equivalent text.

### Safety Rule

KPI card values must come exclusively from `/company/dashboard` API response. Do not use placeholder or mock numbers in any state (including loading — use skeleton blocks, not "0" or "--").

### Acceptance Criteria

- Dashboard KPI cards show skeleton blocks during load, not zero values.
- Pipeline bar chart clicks navigate to a scoped applicant view (or the generic list with a clear "Filter by stage" UX if scoped view is not yet built).
- Needs-review list items have a "Review" CTA that navigates to the applicant detail for that item.

---

## 9. Progressive Disclosure

### Principle

Progressive disclosure presents only the information and actions relevant to the user's current task, revealing complexity on demand. It reduces cognitive load for new users while preserving power-user access.

### GetHired Current State

The job create stepper (4 steps: Job Details -> Rates and Roles -> Create Interview -> Preview) applies progressive disclosure well: complex fields (interview questions, badge arrays, requirements, goodToHave, certifications, skills, tags) are spread across steps rather than presented as a single form. However:
- Step 3 (Create Interview) requires at least one question to publish, but the stepper does not communicate this requirement until the employer attempts to publish at step 4.
- The action center on the dashboard shows "Complete Company Profile" only when `companyProfileMissingFields()` returns true (checks `companyLogoUrl`, `companyDetails`, `companyCity`) — this is a good example of progressive disclosure working correctly.
- Match signals in the applicant list are a separate API call (`matchSignalsByUserId$`) surfaced only when available — also correctly implemented.

### Decision

Enforce progressive disclosure consistently: block-level validation in the stepper should surface per-step completion requirements before the user advances, not at publish time.

### Frontend Implication

Add a step-completion indicator to the job create stepper. Step 3 should show: "0 / 1 interview questions required to publish" with a count badge updating as questions are added. The "Next" button on step 3 should be available (saving progress) but a warning should appear if no questions exist before the employer reaches step 4 preview.

### Motion/Haptic Implication

When a step's required fields are first satisfied, fire `HapticFeedbackService.selection()` to signal readiness. When the employer advances a step, use the `@animate` fade-scale transition on the incoming step content.

### A11y Safeguard

Step completion requirements must be communicated in text, not only via visual color or a progress bar fill. Use `aria-required="true"` on required form fields and step-level hint text for screen readers.

### Safety Rule

Do not gate step advancement (disable the "Next" button) for optional fields. Only gate at the publish action for publish-required fields. Saving a draft must always be possible regardless of step completion state.

### Acceptance Criteria

- Step 3 shows a live "X interview question(s) added" count.
- Reaching step 4 with zero interview questions shows an inline warning: "Add at least 1 interview question to publish. You can still save as draft."
- The publish-blocked snackbar is only the final fallback, not the first notification of the requirement.

---

## 10. No-Fake-Data Trust

### Principle

In platforms that display data about other humans (applicants, candidates), every number, signal, and indicator must accurately reflect real system state. Displaying fabricated counts, placeholder percentages, or mock pipeline data destroys employer trust and leads to bad hiring decisions. This is a zero-tolerance safety constraint.

### GetHired Current State

The V4 employer dashboard is built on real data:
- KPI cards: `activeJobs`, `applicants/month`, `interviews/month`, `needsReview` all sourced from `/company/dashboard` API response.
- Pipeline chart: from `/company/dashboard/pipeline-overview` — real stages with real counts.
- Match signals: from `/job/applicants/signals` — a real signal set, with a disclaimer when displayed.
- Snapshot summary: from `/job/applicant/snapshot-summary?applicationId=` — real completeness % and match level.

The match signal disclaimer ("Match Signals are decision-support indicators...") is present and must be preserved exactly. It prevents employers from treating signals as deterministic screening criteria.

The existing code does not appear to use hardcoded mock data in production-facing components based on the documented behavior. Skeleton loaders (not zero values) are used during loading.

### Decision

Enforce no-fake-data as an absolute rule for all V4 additions. Any new metric, indicator, or count added to the employer panel must be sourced from a real API endpoint. Skeleton loaders (not placeholder numbers) must be used during loading.

### Frontend Implication

Any future addition of new KPI cards, score badges, or applicant indicators must be backed by a corresponding backend endpoint before the frontend component is shipped. Do not ship with hardcoded values intended to be "replaced later."

### Motion/Haptic Implication

Skeleton loading animations (existing: `emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`) are the correct mechanism. No "simulated loading" delays (artificial `setTimeout` before showing fake data) are permitted.

### A11y Safeguard

Skeleton loaders must have `aria-busy="true"` on their container and a visually hidden label such as "Loading dashboard data" for screen readers.

### Safety Rule

**No hardcoded counts, no mock percentages, no placeholder names.** If an API call fails, show an error state with a retry CTA. Do not fall back to a fabricated value.

### Acceptance Criteria

- All dashboard KPI values are explicitly loaded from `/company/dashboard` — no inline default values of non-zero numbers.
- Skeleton loader containers have `aria-busy="true"` and a visually hidden loading label.
- Match signal disclaimer text is preserved verbatim in any UI refactor of the applicant table.
- Pipeline chart shows a clear error state (not zero bars) when `/company/dashboard/pipeline-overview` fails.

---

## 11. Summary Gap Table

| # | Framework | Key Gap in GetHired | Priority |
|---|-----------|---------------------|----------|
| 1 | NN/g Service Blueprint | Backstage failures surface as silent dead ends, not recoverable errors | High |
| 2 | NN/g Journey Map | "Employer Branding" label mismatch; no mobile nav; company-not-setup broken | High |
| 3 | Greenhouse Structured Hiring | No pipeline stage advancement UI; inviteApplicant() is empty | High |
| 4 | Workable Pipeline | Pipeline bar chart drill-down goes to generic list, not stage-filtered view | High |
| 5 | Google JobPosting | PublicDetailsComponent has no confirmed JSON-LD schema.org injection | Medium |
| 6 | Material/Fluent Motion | prefers-reduced-motion not confirmed in motion.scss | Medium |
| 7 | WCAG 2.2 | Publish-blocked snackbar uses wrong color; no pipeline bar aria-labels; no focus management on route change | High |
| 8 | Modern SaaS Command Center | No urgency flags; pipeline drill-down broken; no quick actions on needs-review list | Medium |
| 9 | Progressive Disclosure | Interview question requirement not communicated until publish step | Medium |
| 10 | No-Fake-Data Trust | Skeleton loaders need aria-busy; signals disclaimer must be preserved | Low |

---

*End of Document 2*
