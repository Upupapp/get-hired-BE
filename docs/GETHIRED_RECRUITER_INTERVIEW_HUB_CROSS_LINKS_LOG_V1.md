# GetHired Recruiter Interview Hub — Cross-links Log V1

**Date:** 2026-06-25

---

## Inbound Links to the Hub

| Source | Link | Condition |
|--------|------|-----------|
| Sidebar "Interviews" nav item | `route: 'interview'` | Always visible to employers |

## Outbound Links from the Hub

| Destination | Angular Route | Button/Label | Condition |
|-------------|---------------|--------------|-----------|
| Candidate list for job | `/recruiter/contacts/candidate-list/:jobId` | "View applicants" | Always shown per card |
| Video review | `/recruiter/contacts/candidate-list/:jobId` | "Review responses" | Only if `hasVideoAnswers` |
| Messages inbox | `/recruiter/messages` | "Message" | Always shown per card |
| Dashboard | `/recruiter/dashboard` | "Back to dashboard" | Error state only |
| Candidates list | `/recruiter/contacts/candidates` | "Review applicants" | Empty state only |
| Jobs list | `/recruiter/jobs` | "View jobs" | Empty state only |

---

## Existing Routes These Link To

All destination routes already exist and are guarded:

- `/recruiter/contacts/**` → `employer-contacts.module.ts` (lazy-loaded, EmployerGuard via parent)
- `/recruiter/messages` → `RecruiterMessagesComponent` in `employer-panel.module.ts`
- `/recruiter/dashboard` → `EmployerDashboardComponent` in `employer-panel.module.ts`
- `/recruiter/jobs` → `employer-jobs.module.ts` (lazy-loaded)

No new routes were created. No links to non-existent routes.

---

## Cross-link Risks

None identified:
- All linked routes are auth-protected by `EmployerGuard` at parent level
- No deep-linking into `/recruiter/contacts/candidate-list/:jobId` exposes another company's data — the candidate-list component queries by jobId and the BE verifies company ownership
