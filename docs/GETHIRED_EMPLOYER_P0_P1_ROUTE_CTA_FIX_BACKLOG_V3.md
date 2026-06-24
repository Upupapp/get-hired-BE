# GETHIRED EMPLOYER P0/P1 ROUTE CTA FIX BACKLOG V3

**Command:** GETHIRED_EMPLOYER_P0_P1_ROUTE_CTA_FIX_SPRINT_WORLD_CLASS_TECHY_V3  
**Date:** 2026-06-24

---

## Deferred Items (P1 — Not safely fixable in this sprint)

### B01 — Global messages route / inbox

**Severity:** P1  
**Area:** Messages  
**Reason deferred:** Requires a new route, a new component, and a backend endpoint that doesn't currently exist. Not a safe code-only fix.  
**Files likely involved:**
- `get-hired-FE/src/app/employer-panel/employer-panel.module.ts` (route addition)
- New: `employer-panel/employer-messages/employer-messages.component.ts` and `.html`
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts` (add sidebar item)
- Backend: new `GET /messages/threads` endpoint returning all threads for an employer's company  
**Recommended next command:** Backend feature sprint + frontend employer messages module  
**Acceptance criteria:**
- `/recruiter/messages` renders a thread list
- Sidebar shows "Messages" item
- Thread list links to individual applicant detail panels
- Empty inbox shows "No conversations yet" with link to applicants
- No fake unread counts

---

### B02 — Pipeline drill-down from dashboard

**Severity:** P1  
**Area:** Dashboard pipeline chart  
**Reason deferred:** `goToJobsList()` in `company-dashboard.component.ts` navigates to generic job list, not stage-filtered applicants. Fixing this requires query param design + backend support for stage-filtered applicant queries, plus a new URL pattern.  
**Files likely involved:**
- `get-hired-FE/src/app/company/company-dashboard/company-dashboard.component.ts` — replace `goToJobsList()` with stage-aware navigation
- `get-hired-FE/src/app/job/job-applicants/job-applicants.component.ts` — add `statusId` query param support  
**Recommended next command:** Pipeline drill-down feature sprint  
**Acceptance criteria:**
- Clicking a pipeline stage bar navigates to applicant list filtered to that stage
- URL includes both `jobId` (or all-jobs flag) and `statusId`
- Fallback if `statusId` is missing: show unfiltered list

---

### B03 — Interview page replacement

**Severity:** P1  
**Area:** `/recruiter/interview`  
**Reason deferred:** Currently renders `<app-under-construction>`. Replacing this requires defining what the interview management page does (schedule management? question banks? video response review?), which is a product decision before any implementation.  
**Files likely involved:**
- `get-hired-FE/src/app/employer-panel/employer-interview/employer-interview.component.html`
- New: backend endpoints for interview scheduling if needed  
**Recommended next command:** Product decision → interview feature sprint  
**Acceptance criteria:**
- Page is not a dead end
- If scheduling is not implemented: page explains current capability (interview questions are set during job creation; video responses are reviewed in applicant detail)
- If scheduling is implemented: calendar-based scheduling UI

---

### B04 — `inviteApplicant()` TODO

**Severity:** P1  
**Area:** Applicant detail panel  
**Reason deferred:** The method body is empty (`// TODO`). No backend endpoint confirmed for pipeline advancement. Implementing it requires: identifying the correct backend endpoint, designing the UI flow (which stage to advance to? confirmation modal?), and testing against real data.  
**Files likely involved:**
- `get-hired-FE/src/app/job/job-applicants/job-applicants.component.ts` — `inviteApplicant()` method
- `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html` — the commented-out "Invite Applicant" button  
**Recommended next command:** Pipeline advancement feature sprint  
**Acceptance criteria:**
- Invite/advance action calls the correct backend endpoint
- Button is visible in applicant detail panel
- Success shows confirmation; failure shows error with retry
- Action is stage-specific (not a generic "advance")

---

### B05 — Mobile sidebar / navigation

**Severity:** P1  
**Area:** Employer panel mobile  
**Reason deferred:** Sidebar is `d-none d-md-block` (hidden on mobile). No mobile navigation replacement exists. A correct fix requires a full responsive navigation redesign (drawer/hamburger/bottom nav) — not a safe one-file fix.  
**Files likely involved:**
- `get-hired-FE/src/app/employer-panel/employer-panel.component.html`
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.html`
- New: mobile nav component  
**Recommended next command:** Responsive design sprint  
**Acceptance criteria:**
- Employer can navigate all panel sections on a mobile device
- Navigation is keyboard and screen reader accessible
- No reliance on hover states

---

### B06 — `@animate` reduced-motion in Angular animations API

**Severity:** P2  
**Area:** All components using `@animate` trigger  
**Reason deferred:** Angular 13 does not support `@media (prefers-reduced-motion)` inside `trigger()` definitions. The correct solution (Angular CDK `Platform.BROWSER` detection + `AnimationBuilder` API or upgrade to Angular 16 with `provideAnimationsAsync()`) is an architectural change.  
**Workaround in place:** `_motion.scss` CSS utilities (`@include motion-safe`) handle reduced-motion for CSS transitions. Angular animation triggers remain un-suppressed.  
**Files likely involved:**
- `get-hired-FE/src/app/shared/animations/main-animations.ts` — comment documents this  
**Recommended next command:** Angular version upgrade sprint or CDK-based animation suppression  
**Acceptance criteria:**
- Under `prefers-reduced-motion: reduce`, `@animate` triggers either skip or use instant timing
- No visual flash or layout shift under reduced motion
