# GETHIRED_RECRUITER_MOBILE_SIDEBAR_NAV_CONTRACT_V1

## Phase 2 — Nav Contract
Date: 2026-06-25

---

## Source of Truth

Routes defined in `employer-panel.module.ts` routes array (children of `EmployerPanelComponent`).

---

## Canonical Mobile Drawer Nav Items

| # | Label | Route | Full Path | Exists in module? | Desktop visible? | Mobile drawer? | Guard | Badge | Active match |
|---|-------|--------|-----------|-------------------|-----------------|----------------|-------|-------|--------------|
| 1 | Dashboard | dashboard | /recruiter/dashboard | YES (EmployerDashboardComponent) | YES | YES | EmployerGuard (parent) | none | exact |
| 2 | Jobs | jobs | /recruiter/jobs | YES (lazy EmployerJobsModule) | YES | YES | EmployerGuard | none | prefix (covers /jobs/list, /jobs/:id, /jobs/expired) |
| 3 | Candidates | contacts | /recruiter/contacts | YES (lazy EmployerContactsModule) | YES | YES | EmployerGuard | none | prefix |
| 4 | Messages | messages | /recruiter/messages | YES (RecruiterMessagesComponent) | YES | YES | EmployerGuard | BACKLOG (thread count) | exact |
| 5 | Company | company/details | /recruiter/company/details | YES (lazy EmployerSettingsModule via path 'company') | YES | YES | EmployerGuard | none | prefix 'company' |
| 6 | Subscription | subscription | /recruiter/subscription | YES (lazy EmployerSubscriptionModule) | YES | YES (bottom of drawer) | EmployerGuard | none | exact |

---

## Items NOT included in mobile drawer

- Interview (`/recruiter/interview`) — not in bottom nav, accessible via job detail flow only; omit from drawer for now (BACKLOG)
- Post Job — accessible from Jobs section (/recruiter/jobs/create exists in EmployerJobsModule); NOT a top-level module route, no create path in main routes array. Reached from Jobs list. Do NOT add standalone route that doesn't exist.

---

## Active Route Match Rules

- **Dashboard**: `[routerLinkActiveOptions]="{exact: true}"` — only active on exact `/recruiter/dashboard`
- **Jobs**: `[routerLinkActiveOptions]="{exact: false}"` — active on any `/recruiter/jobs/*`
- **Candidates**: `[routerLinkActiveOptions]="{exact: false}"` — active on any `/recruiter/contacts/*`
- **Messages**: `[routerLinkActiveOptions]="{exact: false}"` — active on `/recruiter/messages`
- **Company**: `[routerLinkActiveOptions]="{exact: false}"` — active on any `/recruiter/company/*`
- **Subscription**: `[routerLinkActiveOptions]="{exact: false}"` — active on any `/recruiter/subscription/*`

---

## SVG Icons (inline, no external library)

All icons are inline SVG with `aria-hidden="true" focusable="false"` matching the existing bottom nav pattern.

- Dashboard: 4-square grid SVG
- Jobs: briefcase SVG
- Candidates: people SVG
- Messages: chat bubble SVG
- Company: building/house SVG
- Subscription: credit card SVG

---

## Badge Policy

- Real badge only on Messages if unread thread count is available from store
- Current state: `RecruiterMessagesComponent` loads threads on init, no store/facade
- Decision: NO badge on initial B02 implementation
- BACKLOG: wire message badge once MessagesService exposes unread count observable

---

## Fair Hiring / Label Policy

Labels used: Dashboard, Jobs, Candidates, Messages, Company, Subscription
- No AI claims
- No fake counts
- "Candidates" is factual (contacts who applied or are tracked)
