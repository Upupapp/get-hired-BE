# GetHired Employer Journey — Navigation Architecture V4

**Date:** 2026-06-24
**Scope:** Complete analysis of the employer navigation system including sidebar structure, missing nav items, header behavior, mobile gap, recommended navigation structure, active state behavior, breadcrumb patterns, and frontend polish needed.

---

## Table of Contents

1. Current Sidebar Structure
2. Missing Navigation Items
3. Header Behavior
4. Mobile Navigation Gap
5. Recommended Navigation Structure (V4)
6. Settings Button Behavior
7. Active State Behavior (subRouteActive Logic)
8. Breadcrumb Patterns
9. Frontend Polish Needed

---

## 1. Current Sidebar Structure

The employer panel sidebar is implemented in `employer-sidebar.component`. The sidebar is contained within `employer-panel.component.html` with a class of `d-none d-md-block`, which hides it on screens narrower than the Bootstrap `md` breakpoint (approximately 768px).

The sidebar contains 6 top-level items. Two items (Jobs, Contacts) have expandable sub-navigation.

### Current Sidebar Tree

```
employer-sidebar.component
|
├── [LOGO / Brand Mark]
|
├── Dashboard
|   Route: /recruiter/dashboard
|   Sub-items: none
|
├── Jobs (expandable)
|   Sub-items:
|   ├── Job Posts        -> /recruiter/jobs/list
|   └── Expired Jobs     -> /recruiter/jobs/expired
|
├── Contacts (expandable)
|   Sub-items:
|   ├── Contact List     -> /recruiter/contacts/list
|   ├── Contact Group    -> /recruiter/contacts/groups
|   └── Candidates       -> /recruiter/contacts/candidates
|
├── Interviews
|   Route: /recruiter/interview
|   Note: Renders <app-under-construction> — stub page, no functionality
|
├── Subscription
|   Route: /recruiter/subscription
|
└── Employer Branding  [LABEL MISMATCH]
    Route: /recruiter/company/details
    Note: Label says "Employer Branding" but destination is company profile/details
    Sub-items (accessible but not in sidebar):
    └── Settings         -> /recruiter/company/settings (via sidebar Settings button)
```

### What Is Not in the Sidebar

The following employer-relevant routes exist in the `EmployerPanelModule` but have no sidebar entry:

| Route | Why Not in Sidebar |
|-------|--------------------|
| `/recruiter/messages` | Does not exist — no global messages route at all |
| Applicant list | No top-level link; only reachable via job list -> action modal |
| `/recruiter/company/settings` | Accessible via a "Settings" button — separate from the "Employer Branding" item |
| `/recruiter/jobs/create` | Reachable only from the job list "Create Job" CTA |
| `/recruiter/jobs/applicants?id=` | Reachable only from job list action modal |

---

## 2. Missing Navigation Items

### 2.1 Messages

**Status:** Missing entirely. No `/recruiter/messages` route exists. The `<app-message-thread>` component is fully functional (8s polling, send with retry, error handling) but is only accessible inline within the applicant detail panel of `/recruiter/jobs/applicants?id=`.

**Impact:** Employers cannot see all their message threads in one place. A reply from an applicant is only visible if the employer navigates to: Jobs -> Job Posts -> (find the job) -> action modal -> Applicants -> (find the applicant) -> click row to open detail. Missed replies are a significant risk to the hiring relationship.

**V4 Recommendation:** Add "Messages" to the sidebar as a top-level item. Mark it as unavailable or disabled until a `/recruiter/messages` inbox route is built, with a tooltip: "Message threads are accessible within each job's applicant list." This acknowledges the limitation without pretending the feature is working.

### 2.2 Applicants as Top-Level Nav Item

**Status:** Missing. Applicants are job-scoped and accessed only through the job list action modal. There is no way for an employer to see "all applicants across all my jobs" or navigate to applicants without first finding the right job.

**Impact:** Employers who are reviewing multiple jobs must navigate into each job's applicant list separately. There is no cross-job applicant view.

**V4 Recommendation:** Add "Applicants" as a sidebar item (under Jobs or as top-level). This can navigate to a page that prompts the employer to select a job, or to a cross-job applicant view if/when that API endpoint is built.

### 2.3 Company Profile vs. Employer Branding Label

**Status:** The sidebar item labeled "Employer Branding" navigates to `/recruiter/company/details`, which is the company profile and details page, not a dedicated branding module. There is no "Employer Branding" page. The label creates a mismatch between what the employer expects to see and what they find.

**V4 Recommendation:** Rename sidebar label from "Employer Branding" to "Company Profile". Route and destination unchanged. This is a one-line change in `employer-sidebar.component`.

---

## 3. Header Behavior

The employer panel header (`EmployerHeaderComponent` or `employer-header.component`) is rendered within `employer-panel.component.html` alongside the sidebar. Based on documented structure, the header appears on all employer panel routes.

**Documented header content:** Not fully specified in provided codebase facts. Expected contents of a standard employer panel header:
- Greeting / employer name (from `localStorage['user'].firstName`)
- Company name (from `localStorage['user'].companyName`)
- Notifications bell (not confirmed)
- Avatar / profile dropdown (not confirmed)
- Logout action (not confirmed in header — may be in sidebar or separate)

**V4 Note:** The header does not contain navigation to messages, making the global inbox gap even more severe — there is no secondary navigation surface that compensates for the sidebar omission.

---

## 4. Mobile Navigation Gap

### The Gap

`employer-panel.component.html` wraps the sidebar with Bootstrap class `d-none d-md-block`. This class applies `display: none` on screens smaller than the `md` breakpoint (~768px) and `display: block` on `md` and above.

**Result:** On any device narrower than 768px (all phones, small tablets), the entire employer sidebar disappears with no replacement. There is no:
- Hamburger menu
- Bottom navigation bar
- Slide-in drawer
- Any other mobile navigation pattern

The employer panel header remains visible (assuming it is not also wrapped in a responsive hide class — not confirmed). The route content (`<router-outlet>`) renders. But the employer has no mechanism to navigate between sections.

### Severity

This is a complete mobile usability failure. An employer who logs in on a mobile device can see the dashboard but cannot navigate to Jobs, Applicants, Company, Subscription, or any other section without manually typing routes into the browser URL bar.

### V4 Recommendation

At minimum, add a hamburger-triggered slide-in drawer that mirrors the current sidebar structure. The sidebar component (`employer-sidebar.component`) can be reused as the drawer content.

Implementation approach (Angular 13):
1. Add a `menuOpen: boolean` to `employer-panel.component.ts`.
2. Add a hamburger button in `employer-panel.component.html` visible only on mobile (`d-block d-md-none`).
3. Render `<employer-sidebar>` in a slide-in overlay (Bootstrap off-canvas or custom Angular overlay) when `menuOpen === true`.
4. Close the drawer on route navigation (subscribe to `Router.events` and set `menuOpen = false` on `NavigationEnd`).

This is a high-impact, low-risk change that does not affect the desktop sidebar.

---

## 5. Recommended Navigation Structure (V4)

The following table documents the V4 recommended sidebar structure. Items marked "(CURRENT — keep)" reflect the current sidebar. Items marked "(RENAME)", "(ADD)", "(MARK DISABLED)", or "(STUB + note)" reflect recommended changes.

| Sidebar Item | Sub-Items | Route | Action | Priority |
|-------------|-----------|-------|--------|----------|
| Dashboard | — | `/recruiter/dashboard` | (CURRENT — keep) | — |
| Jobs (expandable) | Job Posts, Expired Jobs | `/recruiter/jobs/list`, `/recruiter/jobs/expired` | (CURRENT — keep) | — |
| Applicants | — | `/recruiter/jobs/list` (with prompt to select a job, pending cross-job view) | (ADD — new top-level item) | HIGH |
| Contacts (expandable) | Contact List, Contact Group, Candidates | existing routes | (CURRENT — keep, consider consolidating with Applicants) | LOW |
| Messages | — | (no route yet) | (ADD — show as disabled with tooltip: "Available within applicant profiles") | HIGH |
| Interviews | — | `/recruiter/interview` | (STUB + add "Coming Soon" badge to label) | MEDIUM |
| Subscription | — | `/recruiter/subscription` | (CURRENT — keep) | — |
| Company Profile | — | `/recruiter/company/details` | (RENAME from "Employer Branding") | HIGH |
| Settings | — | `/recruiter/company/settings` | (CURRENT — keep; move to bottom or under Company Profile) | — |

### V4 Sidebar Visual Layout (Recommended)

```
[GetHired Logo]

PRIMARY NAVIGATION:
- Dashboard
- Jobs
  - Job Posts
  - Expired Jobs
- Applicants            [NEW]
- Messages              [NEW — disabled state with tooltip]

MANAGEMENT:
- Interviews            [COMING SOON badge]
- Contacts
  - Contact List
  - Contact Group
  - Candidates

ACCOUNT:
- Subscription
- Company Profile       [RENAMED from "Employer Branding"]
- Settings
```

---

## 6. Settings Button Behavior

The sidebar contains a "Settings" item at the bottom (separate from the "Employer Branding" / company details item). This item navigates to `/recruiter/company/settings`.

**Current state:** Works correctly. `AuthGuard` protects the route. The settings page renders.

**Label clarity issue:** The sidebar has both an "Employer Branding" item (-> company details) and a "Settings" item (-> company settings). These two items are adjacent or close in the sidebar, and both relate to company configuration. The distinction between "Employer Branding" (company profile, logo, description) and "Settings" (company settings, team members) is not self-evident from the labels.

**V4 Recommendation:**
- Rename "Employer Branding" to "Company Profile" for the details route.
- Consider grouping "Company Profile" and "Settings" as sub-items under a "Company" parent, similar to how "Jobs" groups "Job Posts" and "Expired Jobs":

```
- Company (expandable)
  - Company Profile    -> /recruiter/company/details
  - Settings          -> /recruiter/company/settings
```

---

## 7. Active State Behavior (subRouteActive Logic)

Angular's `RouterLinkActive` directive (or equivalent custom logic in `employer-sidebar.component`) determines which sidebar item is highlighted as active based on the current route.

### Expected Active State Behavior

| Current Route | Expected Active Sidebar Item |
|--------------|------------------------------|
| `/recruiter/dashboard` | Dashboard |
| `/recruiter/jobs/list` | Jobs + Job Posts sub-item |
| `/recruiter/jobs/expired` | Jobs + Expired Jobs sub-item |
| `/recruiter/jobs/create` | Jobs + Job Posts sub-item (or Jobs only) |
| `/recruiter/jobs/edit?id=` | Jobs + Job Posts sub-item (or Jobs only) |
| `/recruiter/jobs/applicants?id=` | Jobs + Job Posts sub-item (applicants are accessed from the job list, so Jobs is the logical parent) |
| `/recruiter/contacts/list` | Contacts + Contact List sub-item |
| `/recruiter/contacts/candidates` | Contacts + Candidates sub-item |
| `/recruiter/contacts/groups` | Contacts + Contact Group sub-item |
| `/recruiter/interview` | Interviews |
| `/recruiter/subscription` | Subscription |
| `/recruiter/company/details` | Employer Branding (or Company Profile after rename) |
| `/recruiter/company/settings` | Settings |

### subRouteActive Consideration

For routes with query parameters (`/recruiter/jobs/applicants?id=`), `RouterLinkActive` uses `[routerLinkActiveOptions]="{exact: false}"` or equivalent to match the base path. If the sidebar link for "Job Posts" points to `/recruiter/jobs/list` but the employer is on `/recruiter/jobs/applicants`, the "Jobs" parent should be active but "Job Posts" sub-item may or may not be — depending on whether `routerLinkActive` checks query params.

**V4 Recommendation:** Use `[routerLinkActiveOptions]="{exact: false}"` on all sidebar links and parent groups to ensure parent items are active when the user is on any child route. Verify that `?id=` query params do not break active state on the "Job Posts" link.

### Visual Active State Polish

The current sidebar active state is not explicitly documented beyond the routing behavior. V4 recommends:
- Active item: left border accent (coral `#FF7062`), slightly increased font-weight, coral text color.
- Active sub-item: left border indent, coral text.
- Hover state: subtle background tint, scale micro-animation via `.gh-pressable`.
- Focus state: visible outline (2px coral or high-contrast) that satisfies WCAG 2.2 focus visibility.

---

## 8. Breadcrumb Patterns

### Current Usage

The `JobApplicantsComponent` is documented with a breadcrumb:

```
Jobs / {jobId} / Applicants / {applicantProfileId}
```

This breadcrumb indicates that `job-applicants.component` renders a hierarchical path display. The breadcrumb shows raw IDs (`jobId`, `applicantProfileId`) rather than human-readable names, which is a UX gap.

### Other Pages

Breadcrumbs are not documented for other employer panel pages. The sidebar provides wayfinding via active state, and the header may provide a page title, but no other route-level breadcrumbs are confirmed.

### V4 Recommendations

| Route | Recommended Breadcrumb |
|-------|------------------------|
| `/recruiter/dashboard` | None (top-level) |
| `/recruiter/jobs/list` | None (top-level section) |
| `/recruiter/jobs/expired` | Jobs > Expired Jobs |
| `/recruiter/jobs/create` | Jobs > Create Job |
| `/recruiter/jobs/edit?id=` | Jobs > {job title} > Edit |
| `/recruiter/jobs/applicants?id=` | Jobs > {job title} > Applicants (replacing raw jobId with actual job title) |
| `/recruiter/company/details` | Company Profile |
| `/recruiter/company/settings` | Company > Settings |
| `/recruiter/interview` | Interviews |
| `/recruiter/subscription` | Subscription |

### Breadcrumb ID-to-Name Resolution

The breadcrumb on `job-applicants.component` uses raw `jobId`. To show a human-readable job title instead:
1. Load the job title from `localStorage` cache or a brief API call when the applicant list initializes.
2. Bind the job title to the breadcrumb template: `Jobs / {job.jobTitle} / Applicants`.
3. Fallback: if the job title is not yet loaded, show "Jobs / Loading... / Applicants" or use the raw ID with a loading shimmer.

---

## 9. Frontend Polish Needed

The following navigation-specific frontend polish items are identified for V4. All are non-breaking enhancements to the existing navigation system.

### 9.1 Active Glow / Left-Border Indicator

**Current state:** Not explicitly confirmed in codebase facts.
**Recommended:** CSS `border-left: 3px solid #FF7062` on active sidebar item. Background: `rgba(255, 112, 98, 0.08)`. Text color: `#FF7062`. Transition: `border-color 150ms ease, background 150ms ease`.
**File:** `employer-sidebar.component.scss` (or shared `styles.scss`)

### 9.2 Subnav Expand/Collapse Transition

**Current state:** Not explicitly documented.
**Recommended:** Angular `@trigger` animation for subnav expand/collapse. `height: 0 -> auto` with `overflow: hidden`. Duration: 200ms ease. Respect `prefers-reduced-motion: reduce` (instant transition).
**File:** `employer-sidebar.component.ts` (add animation trigger), `employer-sidebar.component.scss`

### 9.3 Hover and Focus States on Sidebar Items

**Current state:** `.gh-pressable` class exists and applies press micro-scale. Focus state not confirmed.
**Recommended:** 
- Hover: background `rgba(255, 112, 98, 0.06)`, transition 100ms.
- Focus: `outline: 2px solid #FF7062; outline-offset: 2px` (visible focus ring for keyboard nav).
- Ensure focus ring is not obscured by adjacent elements (WCAG 2.2 criterion 2.4.11).
**File:** `employer-sidebar.component.scss` or `motion.scss`

### 9.4 "Coming Soon" Badge on Interviews

**Current state:** "Interviews" sidebar item navigates to `<app-under-construction>` with no visual indicator.
**Recommended:** Add a small "Coming Soon" pill badge (`<span class="badge-coming-soon">Soon</span>`) next to the "Interviews" label in the sidebar. Style: small font, muted color (not coral), pill shape. This sets correct expectations before the employer clicks.
**File:** `employer-sidebar.component.html`

### 9.5 Disabled State for Missing Messages

**Current state:** "Messages" is not in the sidebar at all.
**Recommended (V4 addition):** Add "Messages" sidebar item in a visually disabled state (grayed text, `cursor: not-allowed`, no navigation on click). Tooltip on hover: "Message threads are available within each job's applicant list." `aria-disabled="true"` on the element. Include `aria-label` explaining the limitation.
**File:** `employer-sidebar.component.html`, `.scss`

### 9.6 Mobile Hamburger Button

**Current state:** No mobile navigation.
**Recommended:** Add a hamburger button (`<button class="d-block d-md-none sidebar-toggle" aria-label="Open navigation menu">`) in `employer-panel.component.html`. Trigger a slide-in overlay containing `<employer-sidebar>`. Close on route change and on backdrop click.
**File:** `employer-panel.component.html`, `employer-panel.component.ts`, `employer-panel.component.scss`

### 9.7 Breadcrumb Human-Readable Names

**Current state:** `job-applicants.component` breadcrumb shows raw `jobId`.
**Recommended:** Resolve job title from job data on component init. Replace `jobId` with `job.jobTitle` in the breadcrumb template. Add loading shimmer while title resolves.
**File:** `job-applicants.component.html`, `job-applicants.component.ts`

### 9.8 Sidebar Scroll for Overflow

**Current state:** Sidebar layout on desktop is not confirmed to handle overflow when many sub-items are visible simultaneously.
**Recommended:** Add `overflow-y: auto` and `max-height: calc(100vh - header-height)` to the sidebar container to ensure it scrolls on shorter screens. Do not clip the main content to fit the sidebar.
**File:** `employer-sidebar.component.scss`

---

*End of Document 9*
