# GetHired Recruiter Interview Hub — Test Log V1

**Date:** 2026-06-25

---

## Build Verification

```
ng build --configuration production
Result: PASS
Errors: 0
Warnings: 2 (pre-existing autoprefixer warnings in add-contact-group.component.scss, unrelated)
New chunk: employer-interview-employer-interview-module  16.87 kB / 3.76 kB gzip
```

---

## Manual Test Checklist (to run against live environment)

### BE Endpoint
- [ ] `GET /api/interview/hub` — 401 without auth token
- [ ] `GET /api/interview/hub` — 403 with applicant-role token (no company)
- [ ] `GET /api/interview/hub` — 200 with employer token, returns `{ items: [], total: 0 }` for company with no applications
- [ ] `GET /api/interview/hub` — returns only applications for caller's company jobs
- [ ] `GET /api/interview/hub` — `videoAnswerCount` > 0 for applicants who submitted video answers
- [ ] `GET /api/interview/hub` — cross-company probe: employer A's token cannot see employer B's applications

### FE States
- [ ] Loading: skeleton shows on first load
- [ ] Error: network error shows error panel with retry
- [ ] Empty: company with no applications shows empty state with two CTAs
- [ ] Content: applications load and display correctly

### FE Filters
- [ ] "All applicants" shows all items
- [ ] "Video answers" shows only items where `hasVideoAnswers === true`
- [ ] "Under review" shows only items where `applicationStatusId === 3`
- [ ] Video answer count badge shows correct number
- [ ] Empty filter result: "No candidates match this filter." shown

### FE Links
- [ ] "View applicants" routes to `/recruiter/contacts/candidate-list/:jobId`
- [ ] "Review responses" only shows when `hasVideoAnswers === true`, routes correctly
- [ ] "Message" routes to `/recruiter/messages`
- [ ] Error state "Back to dashboard" links to `/recruiter/dashboard`
- [ ] Empty state CTAs link to correct destinations

### Nav
- [ ] "Interviews" sidebar item visible
- [ ] Active state applied when on `/recruiter/interview`
- [ ] No other nav items displaced

### Accessibility
- [ ] Keyboard: Tab through filters and cards
- [ ] Screen reader: loading → error/empty/content states announced
- [ ] `prefers-reduced-motion: reduce`: no animations, layout unchanged

---

## Unit Tests (backlog — not yet written)

- `RecruiterInterviewHubComponent`: test all 4 state transitions
- `RecruiterInterviewHubService`: test HTTP call and response mapping
- `getInterviewHub` controller: test 403 on no company, 200 on valid company, SQL scoping
