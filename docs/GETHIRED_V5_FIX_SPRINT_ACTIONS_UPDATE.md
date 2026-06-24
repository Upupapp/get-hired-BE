# GetHired V5 Fix Sprint — ACTIONS Update

**Generated:** 2026-06-24
**Scope:** Post-fix-sprint backlog reconciliation, next sprint definition, and production readiness assessment
**Source docs:** GETHIRED_V5_ACTIONS_BACKLOG.md, GETHIRED_V5_FIX_SPRINT_LOG.md

---

## Executive Summary

The fix sprint closed all 15 specified fixes across P0–P3 with zero new build errors. The employer panel is now substantively functional: the post-publish navigation dead end (B05) is resolved, the BOLA on deleteAccountById (P1-4) is patched, XSS in the signup error display is fixed, and the mobile nav is corrected and accessible. The backend updateJob race condition (missing await on mappedJob) is resolved.

Four new issues were surfaced during the sprint that were not in the original backlog:

- **NEW-01 (P1-security):** BE error leak pattern `"ERROR: " + error` exists in controllers beyond jobsController — only jobsController was fixed in P2-8.
- **NEW-02 (P1-security):** `deleteJob` has no caller-owns-job ownership check — any authenticated employer can delete any job by ID.
- **NEW-03 (P2-UX):** Subscription is now inaccessible on mobile — it was displaced from the 5-item mobile nav cap when Candidates was added.
- **NEW-04 (P3-quality):** No unit specs exist for any of the 15 changed components/files.

**What is done:** All 15 fix sprint items. The highest-value remaining feature (B01 global messages inbox) was never in scope for this sprint and remains the top priority for the next sprint.

**What is open:** B01, B03, B06, B07-extended, B08, B09, B10, B10-subs, B10-invite, B11, B11-profile, B12, B13, B13-SEO, B13-sharing, B14, B14-roleintent, B15, B15-publicpreview, B16, NEW-01 through NEW-04.

---

## Updated Backlog

### Priority definitions
- **P0** — Launch blocker; do not ship to new users without resolving
- **P1** — Blocking meaningful employer use or a security issue; fix before next push
- **P2** — Significant friction or accessibility gap; fix in next sprint
- **P3** — Enhancement or quality improvement; fix when capacity allows
- **P4** — Nice-to-have; schedule when roadmap permits

### Effort key
- **XS** — < 2 hours | **S** — 2–8 hours | **M** — 1–3 days | **L** — 3–7 days | **XL** — 7+ days

---

### P0 — Launch Blockers

None. All auth/guard P0s were resolved in the V3 P0/P1 sprint. No new P0s introduced by the fix sprint.

---

### P1 — High priority / next push

---

#### B01: Global Messages Inbox
**Status:** OPEN (not in fix sprint scope)
**Priority:** P1 | **Effort:** M
**Depends on:** Backend GET `/messages/threads` employer-level endpoint (does not yet exist)

Employers cannot check messages without navigating into a specific applicant detail. Unread messages are invisible from any top-level view. Messaging is a core employer-applicant communication channel; without a global inbox, employers miss replies and move communication off-platform.

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
**Status:** OPEN (not in fix sprint scope; sidebar link confirmed removed in V5)
**Priority:** P1 | **Effort:** XL
**Depends on:** Product decision on MVP scope

`/recruiter/interview` renders `<app-under-construction>`. The route is preserved but the sidebar link was removed in V5. Use minimum viable scope only: list of jobs with interview questions + link to job edit step 3. Do not attempt scheduling or video review.

**Acceptance criteria:**
- `/recruiter/interview` renders real content (no under-construction placeholder)
- Employer sees a list of their jobs with configured interview questions
- Clicking a job's interview section links to step 3 of job edit
- Sidebar item re-added when real content is shipped

**Recommended command:** `GETHIRED_EMPLOYER_INTERVIEW_MODULE_MVP_V5`

---

#### NEW-01: BE Error Leak — Other Controllers
**Status:** NEW (surfaced by fix sprint P2-8; out of scope for fix sprint)
**Priority:** P1 | **Effort:** S

The fix sprint patched all three `"Operation was not successful. Error: " + error` patterns in `jobsController.js`. The same raw exception leak pattern exists in other BE controllers (userController, companiesController, and likely others). Any controller that concatenates the raw `error` object into an HTTP response body leaks internal stack traces and schema hints to clients.

**Acceptance criteria:**
- All BE controllers audited for `"ERROR: " + error` and `"Error: " + error` response patterns
- Each instance replaced with a safe generic message + `console.error('[fn] error:', error)` for server-side logging only
- No raw `error.message`, `error.stack`, or `error.toString()` returned in any response body
- Fix verified by grep: zero matches for `+ error` inside `res.json` or `res.send` calls

**Recommended command:** SECURE pass or direct grep-and-fix

**Key files to audit:**
- `get-hired-BE/controllers/userController.js`
- `get-hired-BE/controllers/companiesController.js`
- All remaining files under `get-hired-BE/controllers/`

---

#### NEW-02: deleteJob Missing Ownership Check (BOLA)
**Status:** NEW (surfaced by fix sprint; out of scope for fix sprint)
**Priority:** P1 | **Effort:** XS

`deleteJob` in `jobsController.js` (and its route handler) does not verify that the authenticated employer owns the job being deleted. Any authenticated employer can delete any job by supplying a valid jobId. This is the same BOLA pattern fixed in P1-4 for `deleteAccountById`.

**Acceptance criteria:**
- Before deleting, `deleteJob` fetches the job's `companyId` and compares it against `req.user.companyId` (or equivalent ownership field on the authenticated user)
- If the caller does not own the job, return `403 Forbidden` with no further action
- The check must run before any database write (not after)
- Existing error handling and `console.error` patterns follow the pattern established in P1-4

**Recommended command:** Direct implementation or SECURE pass

**Key files to modify:**
- `get-hired-BE/controllers/jobsController.js` — `deleteJob` function

---

### P2 — Next sprint

---

#### B06: Pipeline Bar Click to Filtered Applicant List
**Status:** OPEN
**Priority:** P2 | **Effort:** S | **Depends on:** None

Pipeline stage bars on the employer dashboard are visual-only. Clicking a stage does not navigate to the filtered applicant list — it routes to the jobs list.

**Acceptance criteria:**
- Clicking any pipeline stage bar navigates to `/recruiter/jobs/applicants?id=[jobId]&stage=[stageName]`
- Applicant list component filters by the `stage` query param when present
- Back navigation returns to dashboard without resetting the filter
- Empty state shown when no applicants exist for a stage

**Recommended command:** Direct implementation or STITCH

**Key files to modify:**
- `company-dashboard.component.html` — click handler on pipeline stage bar
- `company-dashboard.component.ts` — `navigateToPipelineStage(jobId, stage)` method
- `job-applicants.component.ts` — read and apply `stage` query param as filter

---

#### B08: Angular Animations Reduced-Motion Support
**Status:** OPEN
**Priority:** P2 | **Effort:** S | **Depends on:** None

CSS component animations have `@media (prefers-reduced-motion: reduce)` fallbacks. However, Angular `mainAnimations.ts` fires `trigger`/`state`/`transition` animations unconditionally — the Angular animation engine does not check OS reduced-motion preference automatically.

**Acceptance criteria:**
- `mainAnimations.ts` checks `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before returning animation definitions
- When reduced-motion is enabled, Angular animations use `0ms` duration or equivalent no-ops
- No motion-only state changes remain

**Recommended command:** Direct implementation or OPTIMIZE

**Key files to modify:**
- `get-hired-FE/src/app/shared/animations/main-animations.ts`

---

#### B10: Dashboard Draft Job CTA
**Status:** OPEN
**Priority:** P2 | **Effort:** S
**Depends on:** Backend: `draftJobsCount` in GET `/company/dashboard` response

The dashboard does not surface draft jobs. An employer who started a job and returned to the dashboard has no visible prompt to continue it.

**Acceptance criteria:**
- When `draftJobs > 0` in dashboard API response, action card appears: "You have [N] draft job(s). Continue where you left off."
- CTA routes to `/recruiter/jobs/list`
- Card not shown when `draftJobs === 0`

**Recommended command:** STITCH or direct implementation

---

#### B11: Post-Publish jobId in Edit Flow Verification
**Status:** OPEN (B05 shipped in V5; edit-mode path needs manual verification)
**Priority:** P2 | **Effort:** XS
**Depends on:** B05 (shipped in V5)

B05 navigates to `/recruiter/jobs/applicants?id=jobId` after publish. The fix reads jobId from the store in create mode. Edit mode (`/recruiter/jobs/edit?id=123`) may source the jobId differently — needs verification.

**Acceptance criteria:**
- In edit mode, after publishing, employer is routed to `/recruiter/jobs/applicants?id=[correct id]`
- Fallback to `/recruiter/jobs` (not blank navigate) if jobId unavailable

**Recommended command:** Direct QA

---

#### B12: aria-live on Panel Loading State
**Status:** OPEN
**Priority:** P2 | **Effort:** XS | **Depends on:** None

`#panelLoading` in `employer-panel.component.html` does not have `aria-live`. Screen readers may not announce the loading-to-loaded transition.

**Acceptance criteria:**
- `#panelLoading` has `aria-live="polite"` and `aria-busy="true"` while loading
- `aria-busy` removed or set to `false` after content loads

**Recommended command:** Direct implementation

---

#### B13: Job Readiness Progress Bar in Job Create Step 4
**Status:** OPEN
**Priority:** P2 | **Effort:** S | **Depends on:** None

Job create step 4 (preview) has no visual indicator of job quality or completeness. Employers have no nudge to fill optional fields.

**Acceptance criteria:**
- Step 4 shows a progress bar or section chip list (e.g., "7/10 sections complete")
- Optional fields shown as "Recommended" chips — green if filled, grey if empty
- No fake AI copy or estimated scores — factual field-fill counts only (D8 constraint)

**Key files to modify:**
- `get-hired-FE/src/app/job/job-create/job-create.component.html` — step 4 template
- `get-hired-FE/src/app/job/job-create/job-create.component.ts` — readiness score method

---

#### B13-SEO: Public Job Detail JSON-LD
**Status:** OPEN
**Priority:** P2 | **Effort:** S
**Depends on:** Audit confirming all required Google JobPosting fields are present in API response

No JSON-LD structured data on the public job detail page. Google cannot rich-snippet GetHired jobs.

**Acceptance criteria:**
- Valid `<script type="application/ld+json">` with JobPosting schema on public-details.component
- Only fields confirmed in live API response used; no hardcoded or guessed values

---

#### B16: Mobile Nav aria-current
**Status:** OPEN (B16 was listed as open in V5 backlog; P2-2 fixed aria-label mismatches but did not add aria-current)
**Priority:** P2 | **Effort:** XS | **Depends on:** None

Active mobile nav item has no `aria-current="page"`. Screen readers have no programmatic way to identify the current nav item.

**Acceptance criteria:**
- Active mobile nav item has `[attr.aria-current]="isActive ? 'page' : null"` binding
- Post Job item (transient action) correctly has no `aria-current`

**Key files to modify:**
- `get-hired-FE/src/app/employer-panel/employer-panel.component.html`

---

#### NEW-03: Subscription Inaccessible on Mobile
**Status:** NEW (introduced by fix sprint P2-1 to stay within 5-item mobile nav cap)
**Priority:** P2 | **Effort:** S
**Depends on:** None (or B09 if Subscription is folded into Company subtabs)

The Subscription nav item was removed from mobile nav to add Candidates while respecting the 5-item cap (D3 constraint). Employers on mobile can no longer access subscription management without using a desktop browser or deep-linking directly to `/recruiter/subscription`.

**Two resolution paths:**

**Path A (quick):** Add a "Settings" or "More" overflow item to mobile nav that links to a minimal settings page containing the Subscription link. Does not require B09.

**Path B (correct):** Move Subscription to a subtab under Company (B10-subs). The Company item already occupies a mobile nav slot — Subscription becomes a tab within it. Requires B09 (company subtabs) first.

**Acceptance criteria (Path A):**
- `/recruiter/subscription` is reachable on mobile within two taps from any employer panel screen
- A fallback link exists somewhere in the mobile-accessible Company or Settings area

**Acceptance criteria (Path B):**
- Subscription is a subtab under Company; old `/recruiter/subscription` route redirects to new location
- Old deep links do not 404

**Recommended command:** Direct implementation (Path A) or STITCH after B09 (Path B)

---

### P3 — Enhancement

---

#### B07-extended: Full Guided Onboarding Wizard
**Status:** OPEN (B07 inline checklist shipped in V5)
**Priority:** P3 | **Effort:** M
**Depends on:** B07 inline checklist (shipped)

Full separate-route onboarding wizard (`/recruiter/onboarding`) with multi-step progress indicator, richer copy, and one-time dismissal. The V5 inline checklist remains the persistent reference.

---

#### B09: Company Profile Subtabs
**Status:** OPEN
**Priority:** P3 | **Effort:** M | **Depends on:** None

`/recruiter/company/details` currently shows all fields on one long form. Subtab structure (Profile | Employer Brand | Benefits & Culture) improves organisation and employer brand mental model.

**Note:** Do not change the canonical `/recruiter/company/details` route. Future subtab work must use sub-routes or query params (D6 constraint).

---

#### B10-subs: Subscription Subtab under Company
**Status:** OPEN
**Priority:** P3 | **Effort:** S
**Depends on:** B09 (Company subtabs)

Once Company has subtabs, Subscription is a natural fourth subtab. Reduces sidebar length and fixes NEW-03 (Path B) simultaneously.

---

#### B10-invite: inviteApplicant() Implementation
**Status:** OPEN
**Priority:** P3 | **Effort:** M
**Depends on:** B01 (global messages, partial overlap)

`inviteApplicant()` stub exists in `job-applicants.component.ts` but is not implemented.

---

#### B11-profile: Company Profile Completeness Backend Score
**Status:** OPEN
**Priority:** P3 | **Effort:** M | **Depends on:** None

Dashboard onboarding checklist derives missing fields on the frontend. A dedicated backend completeness score (0–100) would support richer UI.

---

#### B13-sharing: Job Sharing CTA
**Status:** OPEN
**Priority:** P3 | **Effort:** XS
**Depends on:** Backend GET `/job/sharelink` (confirmed existing per V4 audit)

Employers cannot easily share job links from within the employer panel. Backend share link endpoint already exists.

---

#### B14: Draft Auto-Save and Unsaved Warning
**Status:** OPEN
**Priority:** P3 | **Effort:** M | **Depends on:** None

Job create form has no auto-save or navigate-away warning. Form data is silently lost on navigation.

---

#### B15: Analytics Instrumentation
**Status:** OPEN — blocked on analytics provider selection
**Priority:** P3 | **Effort:** S
**Depends on:** Analytics provider decision (PostHog recommended; see original backlog)

14 funnel events defined in GETHIRED_EMPLOYER_ACTIVATION_METRICS_PLAN_V5.md, none instrumented. Unblocked only after infrastructure decision. Privacy constraints non-negotiable (no applicant PII or protected attributes in employer-side events).

---

#### NEW-04: Unit Specs for Changed Components
**Status:** NEW
**Priority:** P3 | **Effort:** M

No unit specs exist for any of the 15 changed files. The most regression-prone changes (publish gate logic, post-publish navigation, BOLA ownership check, step 3 done-condition) have no automated test coverage. A manual build pass is the only gate currently.

**Acceptance criteria:**
- `job-create.component.spec.ts`: specs for `isReadyToPublish()` with null/empty/valid field combinations; spec for `afterSubmit('published')` navigating to correct applicants URL in both create and edit mode
- `company-dashboard.component.spec.ts`: spec for step 3 `done` condition; spec for `candidateName?.charAt(0)` null safety
- `userController.test.js` (BE): spec for `deleteAccountById` returning 403 when userId !== req.user.uid
- `jobsController.test.js` (BE): spec for `deleteJob` returning 403 when caller does not own the job (once NEW-02 is fixed)

**Recommended command:** Direct implementation or TEST pass

---

### P4 — Nice-to-have

---

#### B14-roleintent: Employer Signup Role Intent Persistence
**Status:** OPEN
**Priority:** P4 | **Effort:** XS | **Depends on:** None

Persist `role=2` intent in `sessionStorage` across signup navigation so employer-specific copy is not lost on page refresh.

---

#### B15-publicpreview: Company Profile Public Preview
**Status:** OPEN
**Priority:** P4 | **Effort:** S
**Depends on:** Public `/companies/:id` route confirmed to exist

"Preview as applicant" CTA on company profile admin page.

---

### DONE (fix sprint, 2026-06-24)

| ID | Item | Notes |
|----|------|-------|
| P0-1 | EmployerApplicantsComponent delegation | Confirmed already correct; delegation pattern to `<app-job-applicants>` is architecturally correct |
| P0-2 | Post-publish navigation reads jobId from store | `jobFacade.jobDetails$.pipe(take(1))` in create-mode `else` branch |
| P0-3 | BE updateJob missing await on mappedJob | `const dbResponse = await mappedJob(rows[0])` |
| P1-1 | candidateName null crash | `applicant.candidateName?.charAt(0) \|\| '?'` |
| P1-2 | Step 3 done-condition inverted | Fixed to `byStage.reduce` total > 0 |
| P1-3 | `[innerHtml]` XSS in signup error | Changed to `{{ error }}` |
| P1-4 | deleteAccountById BOLA | Ownership check: `userId !== req.user.uid → 403` |
| P2-1 | Mobile nav missing Candidates | Added Candidates; removed Subscription to stay within 5-item cap |
| P2-2 | Mobile nav aria-label mismatches | Dashboard "Home"→"Dashboard"; Company aria-label corrected; routerLinkActive on Post Job |
| P2-3 | `.btn-submit` SCSS conflict | Merged to one block with V5 motion tokens; removed conflicting `!important` transition |
| P2-4 | "Create Interview" appearing required | Title changed to "Create Interview (Optional)" |
| P2-5 | Null-unsafe publish gate | Added `!= null &&` guards to jobCity, jobCountry, jobDescription |
| P2-6 | companyId missing from isReadyToPublish | Added `&& job.companyId`; wrapped in `!!()` for TypeScript boolean constraint |
| P2-7 | 7 console.log calls in job-create | Removed; all console.error calls preserved |
| P2-8 | BE error leak in jobsController | All 3 instances fixed: `createJobs`, `deleteJob`, `updateJob` catch blocks |
| P3-1 | `overflow-y: none` invalid CSS | Changed to `overflow-y: hidden` (both instances) |
| P3-2 | routerLinkActive on Post Job mobile nav | Added (combined with P2-2) |
| P3-3 | Pipeline/avatar accent colors | Added `$color-pipeline-accent` and `$color-teal-accent` to colors.scss; replaced 3 hardcoded values in dashboard SCSS |
| P3-4 | Manrope font comment | Added comment block to fonts.scss documenting CDN load + fallback stack |

---

## Recommended Next Sprint

**Sprint goal:** Close the two remaining P1 security items and ship the highest-value unshipped employer feature (global messages inbox).

### Sprint order

1. **NEW-02 — deleteJob BOLA** (P1-security, XS)
   Single ownership check in `jobsController.js`. Pattern already established by P1-4. Do this first — it is the fastest P1 close and unblocks a clean SECURE verification.

2. **NEW-01 — BE error leak in other controllers** (P1-security, S)
   Grep all controllers for `"Error: " + error` and `"ERROR: " + error` patterns inside response paths. Apply the same fix as P2-8 across all matches. Can be combined with NEW-02 in a single focused BE session.

3. **NEW-03 — Subscription mobile accessibility** (P2-UX, S)
   Path A (quick): Add a "More" or "Settings" overflow item to the mobile nav linking to subscription. Path B (deferred): fold into B09/B10-subs. Choose Path A for this sprint — it restores access without requiring B09's M-effort subtab work.

4. **B01 — Global Messages Inbox** (P1, M)
   Highest-value unshipped employer feature. Start by auditing whether the BE has an employer-level thread list endpoint or whether `GET /messages/threads?companyId=` needs to be added. Frontend route + component follows. Estimate: 2–3 days total including backend.

5. **B16 + B12 accessibility micro-fixes** (P2, XS each)
   `aria-current` on mobile nav (B16) and `aria-live` on panel loading (B12). Bundle these — they are under 3 hours combined.

**Defer from this sprint:**
- B03 (Interview page MVP — XL effort; do after B01 is shipped)
- B06 (Pipeline bar click — S; quick win but not blocking anything)
- B08 (Reduced-motion Angular animations — no regression; address in next OPTIMIZE pass)
- B09 (Company subtabs — M effort; lower urgency than security items)
- NEW-04 (Unit specs — bundle into a dedicated TEST pass after security is clean)
- B15 (Analytics — blocked on provider decision)

---

## Updated Decision Log

Adds to the V5 decision log in GETHIRED_V5_ACTIONS_BACKLOG.md.

| # | Decision | Rationale | Constraint |
|---|----------|-----------|------------|
| D1 | Interview questions are not required to publish (B04) | Removed friction | Interview questions are fully optional. Any future "job quality score" must not re-add them as blocking. |
| D2 | Interviews tab removed from sidebar (route preserved) | `/recruiter/interview` still under-construction; prevents dead-end nav | B03 must re-add the sidebar item when real content ships. Do not remove the route. |
| D3 | Mobile nav capped at 5 items; Post Job is the accent center item | Action-bias mobile nav pattern | Any new top-level mobile nav item must be evaluated against this budget. The 5-item cap is the hard limit; displacing an item requires justification. |
| D4 | No analytics instrumentation added in V5 | No analytics backend/provider confirmed | B15 is unblocked only after provider selection. |
| D5 | JSON-LD / Google JobPosting deferred | Not all required fields confirmed in API response | B13-SEO must be preceded by a dedicated field audit. Do not add JSON-LD by guessing field names. |
| D6 | Company profile subtabs deferred (B09) | Single-form layout preserved | `/recruiter/company/details` is the canonical route. Subtab work must use sub-routes or query params, not a new top-level route. |
| D7 | Dashboard 8-state machine partially implemented | All 8 states handled in dashboard component | State F (messages) shows "no messages" empty state until B01 ships. |
| D8 | No AI copy, auto-optimization, or fake quality scores | Fair-hiring and trust guardrails | B13 (job readiness bar) must use factual field-fill counts only. |
| D9 | Sidebar "Contacts" label renamed to "Candidates"; route unchanged | Employer clarity | `/recruiter/contacts/**` is the real route. Label is "Candidates" in V5+. Do not change the route. |
| D10 | ng build passes with zero errors; 2 pre-existing warnings unchanged | V5 policy: no new build errors | All future V5+ work must maintain: `ng build --configuration production` with zero new errors. |
| D11 | Interview step labelled "(Optional)" in job create stepper | Interview questions confirmed non-blocking for publish; step title must reflect this | The word "Optional" in the step title is now load-bearing UX copy — do not remove it without re-evaluating the publish gate. |
| D12 | All BE error messages to clients are now generic in jobsController; debugging via server console.error only | Prevents stack trace and schema leakage from the most-called controller | Any new catch block in BE controllers must follow this pattern: safe generic response to client + `console.error('[fn] error:', error)` to server logs. Never concatenate the raw error object into an HTTP response body. |
| D13 | Subscription removed from mobile nav to stay within 5-item cap (D3); Subscription is now mobile-inaccessible | Adding Candidates (core employer workflow) was higher priority than Subscription (low-frequency admin) | NEW-03 must be resolved before mobile nav is considered production-ready. Path A (overflow item) or Path B (B09/B10-subs) are both acceptable. Do not add Subscription back to the primary 5 without removing a different item. |

---

## Production Readiness Assessment

### Current state (post-fix-sprint)

The employer panel has resolved all its P0 critical bugs and one P1 BOLA (deleteAccountById). The build is clean. The core employer workflow (onboard → post job → view applicants) now runs end-to-end with correct routing. XSS in the signup error display is fixed. The mobile nav is functional and accessible (labels correct, aria-labels match visible text, Candidates accessible).

### What remains before a recommended production deploy

The following items should be resolved before pushing to production for a general employer rollout:

| Item | Severity | Estimated time |
|------|----------|---------------|
| NEW-02: deleteJob BOLA | P1-security: any employer can delete any job | XS (< 2 hours) |
| NEW-01: BE error leak in other controllers | P1-security: stack traces leak to clients | S (2–4 hours with grep-and-fix approach) |
| NEW-03: Subscription mobile inaccessible | P2-UX: employers on mobile cannot manage their plan | S (Path A: 2–4 hours) |

### Minimum production gate

A deploy to production is appropriate once:

1. NEW-02 is fixed and verified (deleteJob returns 403 if caller does not own the job).
2. NEW-01 is fixed: all BE controllers audited; zero instances of raw error concatenation in HTTP response bodies.
3. NEW-03 is addressed at minimum by Path A (Subscription is reachable on mobile within two taps).

Items that do NOT need to block the production deploy:
- B01 (global messages inbox) — missing feature, not a regression; current messaging is still accessible via applicant detail panels
- B03 (interview page MVP) — sidebar link already removed; route is a dead end but not reachable from normal navigation
- NEW-04 (unit specs) — quality debt, not a correctness block; build passes cleanly
- B16, B12 (accessibility micro-fixes) — improvements, not regressions; existing behaviour was already present before the fix sprint

### Summary verdict

**Not production-ready yet.** Two P1 security items (NEW-01, NEW-02) and one P2 UX regression (NEW-03) must be resolved first. Combined estimated time: 6–10 hours of focused backend + frontend work. After those three items close, the employer panel is ready for a production deploy of the full fix sprint.

---

## Suggested Next Commands (in priority order)

1. **Direct implementation — NEW-02 + NEW-01 (BE security fixes)**
   Fix `deleteJob` BOLA (ownership check), then grep all remaining controllers for raw error leak pattern and apply same fix. Both are contained BE changes with no FE impact. Fastest path to clearing the production gate. Estimated: 1 focused session (3–5 hours).

2. **Direct implementation — NEW-03 (Subscription mobile accessibility, Path A)**
   Add a minimal overflow or settings link to the mobile nav so Subscription is reachable. Do not redesign the nav — Path A only. Estimated: 2–4 hours.

3. `GETHIRED_EMPLOYER_GLOBAL_MESSAGES_INBOX_V5`
   Build B01: backend thread-list endpoint + frontend route + component + sidebar badge. Highest-value unshipped employer feature. Start with an audit of whether `GET /messages/threads?companyId=` exists or needs to be created. Estimated: 2–3 days.

4. **Direct implementation — B16 + B12 (accessibility micro-fixes)**
   `aria-current="page"` on active mobile nav items (B16) and `aria-live="polite"` on panel loading container (B12). Bundle into one short session. Estimated: 2–3 hours.

5. **TEST pass — NEW-04 (unit specs for changed files)**
   Write specs for the most regression-prone changes: `isReadyToPublish` publish gate, `afterSubmit` post-publish navigation, `deleteAccountById` BOLA guard, step 3 done-condition, and (after NEW-02) `deleteJob` BOLA guard. Estimated: 1–2 days.

6. `GETHIRED_EMPLOYER_INTERVIEW_MODULE_MVP_V5`
   Replace under-construction stub with minimum viable interview page. Re-add sidebar item. MVP scope only — no scheduling, no video review. Estimated: 2–3 days.

7. **Direct implementation — B06 + B10 (dashboard quick wins)**
   Pipeline bar click to filtered applicant list (B06) and draft job CTA on dashboard (B10). Both are contained, no new routes required. Bundle into one session after B01 ships. Estimated: half day.
