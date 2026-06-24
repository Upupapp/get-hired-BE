# GetHired Employer Activation Metrics Plan V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Analytics Infrastructure Status

**Current state:** A `PublicPortalAnalyticsService` exists and is used for talent proof viewed events. No general employer funnel event tracking infrastructure was found in scope.

**V5 decision:** Document the plan. Do not add instrumentation that requires a new analytics backend, new API endpoints, or unconfirmed third-party analytics dependencies. Minimal safe hooks only.

---

## Recommended Funnel Events

| Event Name | Trigger | Infrastructure Required |
|-----------|---------|------------------------|
| employer_landing_viewed | /employers page load | Frontend route event or page view |
| employer_signup_started | SignupComponent ngOnInit with role=2 | Frontend event |
| employer_account_created | Successful signup POST | Backend: POST /auth/signup success |
| employer_onboarding_started | Dashboard load (first time, no company) | Frontend: derived from company state |
| company_basics_started | Company profile form first interaction | Frontend event |
| company_basics_completed | Company form save success | Backend: PUT /company success |
| employer_brand_started | Logo/description form interaction | Frontend event |
| employer_brand_minimum_completed | Logo + description + city all present | Frontend: derived from company fields |
| first_job_started | JobCreateComponent ngOnInit (no jobId) | Frontend event |
| first_job_draft_saved | afterSubmit('asDraft') | Frontend: existing afterSubmit hook |
| first_job_previewed | stepper = 4 | Frontend: changeStep(4) |
| first_job_published | afterSubmit('published') | Frontend: existing afterSubmit hook |
| job_dashboard_viewed | JobApplicantsComponent load after publish | Frontend route event |
| returning_employer_loop | Dashboard load (has published jobs) | Frontend: derived from dashboard state |

---

## Activation Metrics to Define

| Metric | Formula |
|--------|---------|
| Signup completion rate | employer_account_created / employer_signup_started |
| Company basics completion rate | company_basics_completed / employer_onboarding_started |
| First job started rate | first_job_started / employer_account_created |
| Draft save rate | first_job_draft_saved / first_job_started |
| First job publish rate | first_job_published / employer_account_created |
| Draft-to-publish conversion rate | first_job_published / first_job_draft_saved |
| Time from signup to first draft | timestamp(first_job_draft_saved) - timestamp(employer_account_created) |
| Time from signup to first publish | timestamp(first_job_published) - timestamp(employer_account_created) |

---

## Safe Minimal Hooks Already in Place

The `PublicPortalAnalyticsService.trackTalentProofViewed()` is called on publish success:
```typescript
this.talentProofAnalytics.trackTalentProofViewed('publish_success', this.talentProof.isVerified());
```

This is the closest existing analytic event to `first_job_published`. It can serve as a proxy until a dedicated event is implemented.

---

## Privacy Rules

Do NOT collect:
- Protected attributes (race, gender, age, disability, religion, national origin)
- Applicant salary expectations, benefits preferences
- Face, voice, accent, emotion, personality data
- Precise geolocation without explicit consent
- Applicant browsing behavior outside GetHired

Safe to collect (employer-side):
- Job post count per employer
- Draft vs published rate
- Time-to-first-publish
- Login frequency
- Company profile completion percentage

---

## Implementation Plan (When Ready)

1. Add analytics service that wraps a real analytics provider (e.g. Mixpanel, Segment, or custom backend endpoint)
2. Inject service into SignupComponent, JobCreateComponent, CompanyDashboardComponent
3. Fire events at the trigger points listed above
4. Add employer_id and event_timestamp to all events
5. Do NOT log applicant IDs, applicant names, or applicant personal data in employer events

---

## Files to Change (When Implementing)

- New `EmployerActivationAnalyticsService` in `shared/services/`
- `signup.component.ts`: fire employer_signup_started on ngOnInit when role=2
- `job-create.component.ts`: fire first_job_started, first_job_draft_saved, first_job_published
- `company-dashboard.component.ts`: fire employer_onboarding_started, returning_employer_loop
