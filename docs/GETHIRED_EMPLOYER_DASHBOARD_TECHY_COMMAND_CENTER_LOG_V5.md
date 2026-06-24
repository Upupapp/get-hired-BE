# GetHired Employer Dashboard Techy Command Center Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** V4 command center preserved + V5 onboarding checklist added

---

## Command Center Architecture (V4 + V5)

### Hero Section
- Gradient mesh background: linear-gradient(135deg, #1a1830, #2a2348, #1e1b3a) + SVG overlay (portal-gradient-mesh.svg)
- Real company name in headline (dashboard.company?.companyName)
- Real active job count + real applicant count in subtitle
- Real "N applicants to review" chip (only when needsReviewCount > 0)
- CTAs: "Post a job" (always), "Review applicants" (always)
- Hero reveal animation: emp-hero-reveal (0.5s fade+translateY)
- Reduced-motion: animation: none

### Action Center (Priority CTAs)
- Skeleton loading while pipeline data fetches
- Error + retry when pipeline API fails
- Grid of action cards based on real state:
  - Urgent "Review new applicants" card (when needsReviewCount > 0) — accent color
  - "Manage your jobs" card (always)
  - "Complete your company profile" card (when missing fields)
  - "You're all caught up" empty state (when no urgent actions and profile complete)

### KPI Cards
- Active jobs count (real)
- Applicants this month (real)
- Video answers this month (real)
- Needs review count (real, from pipeline data)
- Skeleton loading while dashboard$ fetches

### Hiring Pipeline
- Bar chart showing real applicant counts per stage
- Empty section: "No applicants yet" (real empty state)
- Error + retry
- Skeleton loading
- Stage bars: height animated via `[style.height.%]` binding (smooth fill)
- Clickable stages (currently route to jobs list; B06 drill-down deferred)

### Applicants Needing Review List
- Only shown when needsReview.length > 0
- Real candidate names, job titles, dates, statuses
- "Review" CTA per row -> goToApplicants(applicant.jobId)

### V5 Onboarding Checklist (new)
- Only shown when at least one of 3 steps is incomplete
- Steps derived from real company + job data
- Collapses when all steps done

### Analytics Section
- Pre-existing app-dashboard-banner, app-dashboard-charts, app-dashboard-statistics components
- Wrapped in white card with border
- Preserved and restyled

---

## Frontend Effects Catalog

| Effect | Element | Implementation | Reduced-Motion |
|--------|---------|----------------|----------------|
| Gradient mesh hero | .emp-dash-hero | background gradient + SVG opacity | Not animated — safe |
| Hero content reveal | .emp-dash-hero-inner | emp-hero-reveal 0.5s | animation: none |
| Skeleton shimmer | .emp-dash-*-skeleton | emp-shimmer 1.4s infinite | animation: none, solid background |
| Action card hover lift | .emp-dash-action-card | translateY(-2px) + shadow | transition: none |
| Action card focus ring | .emp-dash-action-card:focus-visible | outline 2px red-buttons | Always shown (not animated) |
| KPI card hover lift | .emp-dash-kpi-card | translateY(-2px) + shadow | transition: none |
| Review card reveal | .emp-dash-review-card | emp-card-reveal 0.35s | animation: none |
| Pipeline bar height | .emp-dash-pipeline-bar | [style.height.%] binding + transition | transition: none |
| Pipeline bar hover color | .emp-dash-pipeline-stage:hover .bar | background color change | Not affected |
| Urgent badge count | .emp-dash-action-count | real count, no animation | N/A |
| Onboarding step reveal | .emp-dash-onboarding-step | emp-card-reveal 0.35s | animation: none |
| CTA press feedback | .gh-pressable | transform scale(0.985) | transition: none |
| Check pulse complete | .emp-dash-onboarding-step--done | class toggle + green border | Class change always |

---

## No Fake Data Anywhere

Verified real-data-only checks:
- Company name: dashboard.company?.companyName || 'Your company'
- Active jobs: dashboard.charts?.activeJobs || 0
- Applicants this month: dashboard.charts?.applicants || 0
- Video answers: dashboard.charts?.interviews || 0
- Needs review count: computed from pipeline API
- Review list: from pipeline API
- Pipeline stages: from pipeline API
- Onboarding steps: from company fields + charts.activeJobs + needsReviewCount

---

## Files Changed in V5

| File | Change | Risk |
|------|--------|------|
| `company-dashboard.component.html` | Added onboarding checklist section | Low |
| `company-dashboard.component.ts` | Added `onboardingSteps()` method | Low |
| `company-dashboard.component.scss` | Added onboarding SCSS block + reduced-motion block extended | Low |
