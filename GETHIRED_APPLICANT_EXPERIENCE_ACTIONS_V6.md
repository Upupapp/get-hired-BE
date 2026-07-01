# GETHIRED APPLICANT EXPERIENCE ACTIONS — V6
**Date:** 2026-07-01 | **Scope:** All applicant-facing features — dashboard, profile, CV, job search, apply flow, match

---

## Open Actions — Applicant Experience

### AX-ACT-001 (= ACT-004): Wire ProfileQualityService into Applicant Dashboard
**Action ID:** GH-ACT-004
**Priority:** P1
**Category:** Applicant UX / Product
**Problem:** `ProfileQualityService` is fully built and calculating profile completeness scores, but no UI component surfaces this data to applicants.
**Why it matters:** Applicants with incomplete profiles get fewer matches and lower employer visibility. Without visible prompts, completion rates stay low.
**User/business impact:** Increased profile completion → more qualified applications → better employer satisfaction → retention.
**Technical impact:** Read-only wiring — no new service required. Add quality card/progress bar to `ApplicantDashboardComponent`.
**Scope:** Wire `ProfileQualityService` into `ApplicantDashboardComponent`. Display overall score, incomplete field indicators, and next-step CTAs.
**Non-scope:** Redesigning the dashboard layout; server-side score storage.
**Affected repo:** FE
**Affected files:** `src/app/applicant/applicant-dashboard/applicant-dashboard.component.ts/html`, `src/app/applicant/services/profile-quality.service.ts`
**Affected roles:** Applicants / Job seekers
**Dependencies:** ProfileQualityService must be injected correctly (service already exists)
**Risk level:** Low (read-only wiring)
**Priority:** P1
**MoSCoW:** Must
**Estimated effort:** ~1 day
**Suggested owner:** FE developer
**Acceptance criteria:** Applicant dashboard shows profile completeness percentage; incomplete fields listed with links; updates reactively when profile fields are saved.
**Test requirements:** Manual QA — incomplete profile vs complete profile shows different UI states.
**Status:** OPEN

---

### AX-ACT-002 (= ACT-015): Applicant Profile Grading UI
**Action ID:** GH-ACT-015
**Priority:** P2
**Category:** Applicant UX / Product
**Problem:** `ProfileQualityService` results exist but are not surfaced as a rich grading UI (e.g., A/B/C grade badge, section-by-section breakdown).
**Why it matters:** A rich grade display motivates applicants to improve their profile and differentiates GetHired from basic job boards.
**Scope:** Build a profile grading card component. Display letter grade, section scores, improvement suggestions. Link from dashboard (AX-ACT-001) and from applicant profile page.
**Non-scope:** Employer-visible grade display; AI-generated improvement copy.
**Affected repo:** FE
**Affected files:** `src/app/applicant/` (new grading component), `src/app/applicant/applicant-profile/`
**Dependencies:** AX-ACT-001 (ProfileQualityService wiring)
**Risk level:** Low
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~1 day (after AX-ACT-001)
**Suggested owner:** FE developer
**Acceptance criteria:** Profile page shows grade badge and section breakdown. Clicking a failing section takes user to the relevant profile tab.
**Status:** OPEN

---

### AX-ACT-003 (= ACT-014): CV Doctor FE Wiring
**Action ID:** GH-ACT-014
**Priority:** P2
**Category:** Applicant Product / CV
**Problem:** CV Doctor backend services and analysis pipeline exist but FE upload flow and display are incomplete.
**Why it matters:** CV Doctor is a key differentiator for applicants seeking coaching. Without FE wiring, the feature is invisible.
**Scope:** Wire CV upload → analysis trigger → result display. Show CV Health Score, flagged issues, improvement suggestions.
**Non-scope:** AI-generated rewrite of CV sections; employer-facing CV view.
**Affected repo:** FE
**Affected files:** `src/app/applicant/cv-doctor/` (audit and wire remaining components)
**Dependencies:** BE CVCOACH services (confirmed wired per session 2026-06-24)
**Risk level:** Medium (upload flow + async analysis result polling)
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~2 days
**Suggested owner:** FE developer
**Acceptance criteria:** Applicant can upload CV → see analysis progress state → see CV Health Score + improvement list. On re-upload, previous result is replaced.
**Status:** OPEN

---

### AX-ACT-004 (= ACT-019): Video CV Public Display
**Action ID:** GH-ACT-019
**Priority:** P3
**Category:** Applicant Product / CV
**Problem:** Video CV upload works but public display to employers is incomplete.
**Why it matters:** Video CV differentiates GetHired and increases applicant-to-employer engagement.
**Scope:** Display uploaded video CV on applicant profile page (employer view). Respect privacy toggle — only show if applicant has enabled video CV visibility.
**Affected repo:** FE
**Affected files:** `src/app/applicant/applicant-profile/` (employer-facing view), video display component
**Dependencies:** Upload working (confirmed); privacy toggle state
**Risk level:** Low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~2 days
**Status:** OPEN

---

### AX-ACT-005 (= ACT-020): Job Seeker Match Score Display
**Action ID:** GH-ACT-020
**Priority:** P3
**Category:** Applicant Product / Match
**Problem:** `JobCompatibilityService` exists and calculates match scores, but no FE component shows a job seeker their compatibility score for a job.
**Why it matters:** Transparent match scores help job seekers self-select and apply only to well-matched roles, improving application quality.
**Scope:** Show match score badge on job listings (search results + job detail). Wire to `JobCompatibilityService`.
**Non-scope:** Match score explanation panel (separate feature).
**Affected repo:** FE
**Affected files:** `src/app/jobs/job-posts-details/`, `src/app/jobs/public-search/`
**Dependencies:** MATCH command services (confirmed wired per session 2026-06-24)
**Risk level:** Low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** ~1 day
**Status:** OPEN

---

### AX-ACT-006 (= P3-REUSABLE-TABLE-MOBILE): Mobile Card Fallback for Reusable Table
**Action ID:** P3-REUSABLE-TABLE-MOBILE
**Priority:** P3
**Category:** Mobile / Applicant UX
**Problem:** `reusable-table.component` hides the data table on mobile (`d-none d-md-inline`) but provides no card-view fallback. Authenticated panel users on mobile see empty space.
**Scope:** Add a mobile card-view slot in `reusable-table.component.html` that renders when `d-none d-md-inline` hides the table. Cards should show the same data in a stacked format.
**Affected repo:** FE
**Affected files:** `src/app/shared/components/reusable-table/reusable-table.component.html/ts`
**Risk level:** Low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** M (~3-4 hours)
**Status:** OPEN

---

### AX-ACT-007: LinkedIn Unlink UI — Account Settings
**Action ID:** GH-ACT-088
**Priority:** P2
**Category:** Auth / Account Settings
**Problem:** LinkedIn OIDC sign-in is complete, but there is no UI for users to see their LinkedIn link status or unlink their LinkedIn account in account settings.
**Why it matters:** Users need control over their connected accounts. Without an unlink option, support burden increases and trust is damaged.
**Scope:** Add a "Connected Accounts" section to account settings page. Show LinkedIn linked/unlinked status. Provide "Unlink LinkedIn" button that calls `DELETE /api/auth/linkedin/unlink` (BE endpoint to be planned separately).
**Non-scope:** Google account linking/unlinking (deferred).
**Affected repo:** FE (UI) + BE (unlink endpoint)
**Affected files:** `src/app/auth/account-settings/` (or equivalent account settings component); BE: new route
**Dependencies:** LinkedIn OIDC complete (done)
**Risk level:** Low
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~1 day (FE + BE)
**Suggested owner:** FE developer + BE developer
**Acceptance criteria:** Settings page shows "LinkedIn: Connected [email]" with "Unlink" button when linked. Shows "LinkedIn: Not connected" with "Connect" link when not linked. Unlink button removes association and shows confirmation.
**Status:** OPEN

---

## Closed Applicant Experience Items (History)

| Item | Closed | Detail |
|---|---|---|
| Spurious SAVE_CONTACT dispatch in candidate add | 21657a5 | Unintentional cross-dispatch removed |
| Single candidate add duplicate toast | 2ff6358 | Correct branch + copy fix |
| Import dialog mobile config | 5ea4466 | maxWidth/maxHeight added |
| PROFILE/CVCOACH/MATCH services wired | 2026-06-24 | All confirmed end-to-end (session checkpoint) |

---

## Top 5 Applicant Experience Actions (Priority Order)

1. AX-ACT-001 — Wire ProfileQualityService into dashboard (P1, immediate UX win)
2. AX-ACT-007 — LinkedIn unlink UI (P2, account control)
3. AX-ACT-002 — Profile grading UI (P2, depends on AX-ACT-001)
4. AX-ACT-003 — CV Doctor FE wiring (P2, key differentiator)
5. AX-ACT-006 — Mobile card fallback for table (P3, mobile completeness)
