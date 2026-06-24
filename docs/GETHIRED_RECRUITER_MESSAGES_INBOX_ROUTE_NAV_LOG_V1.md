# GETHIRED_RECRUITER_MESSAGES_INBOX_ROUTE_NAV_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Route Registration

### File: get-hired-FE/src/app/employer-panel/employer-panel.module.ts
- Before: routes array had no messages path
- After: added { path: 'messages', component: RecruiterMessagesComponent }
- Position: after subscription, before empty path redirect
- Guard: inherits parent EmployerPanelComponent's EmployerGuard (confirmed: parent route in app routing uses EmployerGuard)
- Wrong role behavior: EmployerGuard redirects non-employers to appropriate dashboard or login
- Expired session: EmployerGuard catches and redirects to login with return intent
- No company: resolveCallerCompany returns null → getRecruiterThreads returns 403 → inbox shows error state with retry/dashboard CTA
- Import added: RecruiterMessagesComponent from ./recruiter-messages/recruiter-messages.component
- Declaration added: RecruiterMessagesComponent in @NgModule declarations

## Sidebar Navigation

### File: get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts
- Before: 5 sidebar items — Dashboard, Jobs, Candidates, Company, Subscription
- After: 6 sidebar items — Dashboard, Jobs, Candidates, Messages (NEW), Company, Subscription
- Position: after Candidates, before Company (item 4 of 6)
- Route value: 'messages' → navigates to /recruiter/messages
- Icon: uses jobs.png as placeholder (no dedicated messages icon asset exists)
- Icon class: 'messages' (new .messages class added to sidebar SCSS)
- Active state: sidebar-title-active applied when location.match('messages')
- No sub_routes (Messages is a flat top-level destination)

### File: get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.scss
- Added: .messages { width: 14px; height: 17px; margin-top: -2px; }
- Same dimensions as .jobs (reuses icon size since no dedicated asset)

## Mobile Bottom Navigation

### File: get-hired-FE/src/app/employer-panel/employer-panel.component.html
- Before: 5 mobile nav items — Dashboard, Jobs, Candidates, Post Job, Company
- After: 5 mobile nav items — Dashboard, Jobs, Candidates, Messages (REPLACED Post Job), Company
- Decision rationale: Post Job is accessible from dashboard hero CTA ("Post a job") and from Jobs list. Messages is a new primary destination with no alternative entry point on mobile. Keeping 5 items preserves visual balance.
- Messages icon: SVG chat bubble (inline, no asset dependency)
- routerLink: /recruiter/messages
- routerLinkActive: gh-mobile-nav-item--active
- Aria-label: "Messages"
- Touch target: min-width:44px min-height:44px (inherits .gh-mobile-nav-item rules)
- Reduced-motion: bottom nav has no animations (only color/border state changes)

A linter also added a "Subscription & Billing" compact bar above the bottom nav (fixed, z-index 999) so subscription is accessible from mobile without a 6th item in the main nav bar.

## Dashboard Cross-Link

### File: get-hired-FE/src/app/company/company-dashboard/company-dashboard.component.html
- Before: no Messages action card in action center
- After: emp-dash-action-card button added for Messages, always visible in action center grid
- Calls: goToMessages() → router.navigate(['/recruiter/messages'])
- Icon: inline SVG chat bubble (no asset dependency)
- Copy: "Messages" / "View all candidate conversations in one place."
- No fake unread count in card

### File: get-hired-FE/src/app/company/company-dashboard/company-dashboard.component.ts
- Added: goToMessages() method → this.router.navigate(['/recruiter/messages'])

## Route Guard Behavior (Unchanged — Inherited)

| Scenario | Behavior |
|---|---|
| Authenticated employer/recruiter | Access granted to /recruiter/messages |
| Guest (no auth) | EmployerGuard redirects to /signin with return URL |
| Applicant (role != 2) | EmployerGuard redirects to applicant dashboard |
| Admin | EmployerGuard redirects to admin dashboard |
| Employer but no company | Route loads; BE returns 403 for thread list; inbox shows error state |
| Unknown threadId in URL | Not applicable (no /recruiter/messages/:threadId route — thread detail inline) |

## Frontend Navigation Effects

- Active sidebar item: sidebar-title-active class applies on location match
- Route transition: rm-page-reveal animation (220ms fade+slide, reduced-motion respected)
- Mobile: selecting thread shows detail panel with rm-detail-slide animation
- Back button: rm-back-btn visible on mobile only, returns to list
- Focus: sidebar items have :focus-visible outline; mobile nav items have :focus-visible outline
