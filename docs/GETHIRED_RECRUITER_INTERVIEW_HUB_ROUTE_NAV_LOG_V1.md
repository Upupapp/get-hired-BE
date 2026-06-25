# GetHired Recruiter Interview Hub — Route & Nav Log V1

**Date:** 2026-06-25

---

## Route (unchanged path)

| Item | Before B03 | After B03 |
|------|-----------|-----------|
| Path | `/recruiter/interview` | `/recruiter/interview` (unchanged) |
| Module | `employer-interview.module.ts` (lazy) | same module file (rewritten) |
| Component | `EmployerInterviewComponent` → `<app-under-construction>` | `RecruiterInterviewHubComponent` |
| Guards | `EmployerGuard` via parent `EmployerPanelComponent` | unchanged |

---

## Module Change (employer-interview.module.ts)

The module file was rewritten to:
- Remove `EmployerInterviewComponent` from declarations (stub, no longer needed)
- Add `RecruiterInterviewHubComponent` to declarations
- Keep `SharedModule` import (provides `RouterModule`, `CommonModule`, `DatePipe` etc.)

---

## Sidebar Nav Item Added (employer-sidebar.component.ts)

Added to `sidebarItems` array between "Candidates" (index 2) and "Messages" (index 3):

```typescript
{
  title: 'Interviews', icon: 'applicants.png', class: 'interviews', route: 'interview'
}
```

**Position rationale:** Recruiter workflow flows left-to-right: post jobs → review candidates → review interviews → message candidates. Placing "Interviews" between "Candidates" and "Messages" matches this pipeline.

**Active state:** `subRouteActive('interview')` will return `true` when `location === '/recruiter/interview'` — handled by existing sidebar logic.

---

## Cross-links from Interview Hub

| Destination | Route | Purpose |
|-------------|-------|---------|
| Candidate list for job | `/recruiter/contacts/candidate-list/:jobId` | View all applicants for a job |
| Video review | `/recruiter/contacts/candidate-list/:jobId` | Same route — video answers visible in candidate detail panel |
| Messages | `/recruiter/messages` | Message a candidate |
| Dashboard | `/recruiter/dashboard` | Error state back link |
| Applicants | `/recruiter/contacts/candidates` | Empty state CTA |
| Jobs | `/recruiter/jobs` | Empty state CTA |
