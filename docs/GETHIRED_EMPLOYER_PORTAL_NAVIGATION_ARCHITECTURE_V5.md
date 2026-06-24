# GetHired Employer Portal Navigation Architecture V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** IMPLEMENTED

---

## Top-Level Navigation Structure V5

### Desktop Sidebar (d-none d-md-block, visible >= 768px)

**5 items (down from 6 in V4):**

```
employer-sidebar.component
|
├── [LOGO] -> /jobs
|
├── Dashboard
|   Route: /recruiter/dashboard
|   V5 change: unchanged
|
├── Jobs (expandable)
|   Route: /recruiter/jobs (expanded when active)
|   Sub-items:
|   ├── Job Posts        -> /recruiter/jobs/list
|   └── Expired Jobs     -> /recruiter/jobs/expired
|   V5 change: unchanged
|
├── Candidates (expandable)
|   Route: /recruiter/contacts (expanded when active)
|   Sub-items (unchanged):
|   ├── Contact List     -> /recruiter/contacts/list
|   ├── Contact Group    -> /recruiter/contacts/groups
|   └── Candidates       -> /recruiter/contacts/candidates
|   V5 change: RENAMED from "Contacts" to "Candidates" (same route, employer clarity)
|
├── Company
|   Route: /recruiter/company/details
|   V5 change: RENAMED from "Company Profile" to "Company" (same route, brevity)
|
└── [Subscription label from i18n]
    Route: /recruiter/subscription
    V5 change: Moved from position 5 to position 5 (Interviews tab removed from above)
```

**Removed from top-level:**
- Interviews (was item 4) — still accessible via `/recruiter/interview` but removed from sidebar as it is under-construction with no real content. Route preserved in routing module.

**Never in sidebar (per V4/V5 design):**
- `/recruiter/jobs/create` — always accessible via "Post a job" CTA (dashboard hero, mobile nav, job list button)
- `/recruiter/jobs/applicants` — accessed from job list row action
- `/recruiter/company/settings` — accessible via "Settings" button in sidebar user card

---

### Mobile Bottom Nav Bar (d-flex d-md-none, visible < 768px)

**5 items:**

```
.gh-mobile-nav
├── Home (Dashboard)     -> /recruiter/dashboard     [routerLinkActive]
├── Jobs                 -> /recruiter/jobs/list      [routerLinkActive]
├── Post Job (accent)    -> /recruiter/jobs/create    [no routerLinkActive]
├── Company              -> /recruiter/company/details [routerLinkActive]
└── Account              -> /recruiter/subscription   [routerLinkActive]
```

**Design decisions:**
- "Post Job" is center item with accent color (FF7062) to draw attention as the primary activation CTA
- No routerLinkActive on Post Job (create is transient, not a persistent section)
- Mobile nav has no animations — only color state changes
- safe-area-inset-bottom padding for notched device compatibility
- Min-width + min-height 44px per item (WCAG 2.5.5)

---

## Active State Behavior

### Desktop sidebar
- `subRouteActive(route)` method in employer-sidebar.component.ts
- Sidebar item gets `sidebar-title-active` class when location matches route
- Sub-route gets `sub-label-active` class when `subRouteActive(sub_route.route)` is true
- `aria-current="page"` set on active items

### Mobile nav
- `routerLinkActive="gh-mobile-nav-item--active"` on Dashboard, Jobs, Company, Account
- Active state: color changes to `#FF7062`
- Not applied to Post Job (transient action)

---

## Route Preservation

All V4 routes preserved:
- `/recruiter/dashboard` — unchanged
- `/recruiter/jobs/list` — unchanged
- `/recruiter/jobs/expired` — unchanged
- `/recruiter/jobs/create` — unchanged
- `/recruiter/jobs/edit?id=` — unchanged
- `/recruiter/jobs/applicants?id=` — unchanged
- `/recruiter/contacts/**` — unchanged (Candidates label is sidebar-only rename)
- `/recruiter/interview` — unchanged (route preserved, not in sidebar)
- `/recruiter/subscription` — unchanged
- `/recruiter/company/details` — unchanged
- `/recruiter/company/settings` — unchanged (via Settings button)

No routes were removed. No redirects needed. Old deep links work.

---

## Guard Behavior

- All `/recruiter/**` routes: `AuthGuard` with role `'2'` (unchanged)
- Wrong-role users: redirected (fixed in P0/P1 V3 sprint)
- Mobile nav links are within the employer panel section — guard applies to all

---

## "Create Job" Persistent CTA

"Create Job" is NOT a sidebar tab. It is accessible from:
1. Dashboard hero "Post a job" button
2. Dashboard onboarding checklist step 2 CTA
3. Job list "New Job" button (top right)
4. Mobile nav "Post Job" center item (V5 new)
5. Job list empty state "Post your first job" button

---

## Mobile Behavior

- Below 768px: sidebar is `d-none` (hidden)
- Mobile nav bar appears as `d-flex d-md-none` fixed to bottom
- Content padding-bottom: 72px added on mobile to prevent nav bar overlap
- No horizontal overflow (overflow-x: hidden on main content)
