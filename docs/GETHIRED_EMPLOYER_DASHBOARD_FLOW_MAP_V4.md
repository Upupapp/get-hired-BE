# GetHired Employer Dashboard Flow Map V4

**Document:** GETHIRED_EMPLOYER_DASHBOARD_FLOW_MAP_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Company dashboard states, real data sources, state detection, loading/error/empty states, action center logic, KPI cards, pipeline visualization, and routing CTAs.

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Dashboard States](#2-dashboard-states)
3. [Data Sources](#3-data-sources)
4. [Action Center Logic](#4-action-center-logic)
5. [KPI Cards](#5-kpi-cards)
6. [Pipeline Visualization](#6-pipeline-visualization)
7. [Needs Review List](#7-needs-review-list)
8. [Loading and Error States](#8-loading-and-error-states)
9. [CTA Routing Map](#9-cta-routing-map)
10. [Company Profile Missing Fields Detection](#10-company-profile-missing-fields-detection)
11. [Known Gaps](#11-known-gaps)

---

## 1. Dashboard Overview

**Route:** `/recruiter/dashboard`
**Component:** `EmployerDashboardComponent` -> `<app-company-dashboard>`
**Guard:** `AuthGuard` with `role:'2'`

The employer dashboard is the primary landing page after sign-in. It surfaces real data from two API calls:
1. `GET /company/dashboard` -- general dashboard data (KPIs, charts)
2. `GET /company/dashboard/pipeline-overview` -- pipeline stages and needs-review list

The dashboard adapts its content based on the employer's account state: whether a company is set up, whether jobs exist, and whether applicants are present.

---

## 2. Dashboard States

| State | Conditions | Dashboard Behavior |
|-------|-----------|-------------------|
| No company | `companyId` null in localStorage user | `CompanyNotSetupComponent` dialog shown. BUG: "Setup Company" button does not navigate. |
| Company set up, no jobs | Company exists, zero jobs in dashboard data | Action center shows "Create your first job" CTA. Pipeline is empty. KPI cards show zeros. |
| Company set up, drafts only | Jobs exist with `jobStatusId=1` only | Action center shows "Manage your jobs" (always shown). Pipeline is empty (no published jobs). |
| Published job, no applicants | At least one `jobStatusId=2` job, zero applicants | Pipeline shows empty state (`<app-empty-section>` "No applicants yet"). `needsReviewCount=0`. |
| Published job, applicants present | At least one job with applicants | Pipeline bars rendered. Action center shows relevant CTAs. KPI cards show real counts. |
| Pipeline data available, needs review | `needsReviewCount > 0` (statusId=1 or 3 applicants) | Pulsing urgent action card "Review new applicants" visible. Needs review list populated. |

---

## 3. Data Sources

### 3.1 General dashboard data

**Endpoint:** `GET /company/dashboard`
**Store selector:** `dashboard$` from `companyFacade`
**Data returned includes:**

| Field | KPI Card | Notes |
|-------|----------|-------|
| `activeJobs` | Active Jobs card | Count of `jobStatusId=2` jobs for this employer |
| Applicants per month | Applicants (month) card | Count of applications received in current month |
| Interviews per month | Interviews (month) card | Count of interview responses in current month |

**Company profile fields also in dashboard data:**
- `companyLogoUrl` -- checked by `companyProfileMissingFields()`
- `companyDetails` -- checked by `companyProfileMissingFields()`
- `companyCity` -- checked by `companyProfileMissingFields()`

### 3.2 Pipeline overview data

**Endpoint:** `GET /company/dashboard/pipeline-overview`
**Called in:** `company-dashboard.component.ts` via `companyService.getDashboardPipelineOverview()`

**Response shape:**

```typescript
{
  byStage: [
    { statusId: number, label: string, count: number }
  ],
  needsReview: [
    {
      applicationId: string,
      jobId: string,
      candidateName: string,
      jobTitle: string,
      statusId: number,
      submittedDate: string
    }
  ]
}
```

**`needsReviewCount`:** Computed from applicants where `statusId === 1` (Applied/Pending Review) or `statusId === 3` (Under Review). This represents the total urgent-review backlog for the employer.

---

## 4. Action Center Logic

The action center renders up to three CTA cards based on real data signals. Cards are ordered by priority.

### 4.1 Review new applicants (urgent)

**Condition:** `needsReviewCount > 0`
**Card style:** `.emp-dash-action-card--urgent` (pulsing animation)
**Card content:** "Review new applicants" with real count shown (e.g., "12 applicants need your review")
**CTA destination:** `goToApplicants(jobId)` -- routes to `/recruiter/jobs/applicants?id={jobId}` for the first job with pending applicants, or to a general applicants view if no specific jobId is available.

### 4.2 Manage your jobs (always present)

**Condition:** Always shown when company and jobs exist.
**Card style:** Standard action card (no pulsing)
**Card content:** "Manage your jobs" -- links to job list
**CTA destination:** `goToJobsList()` -> `/recruiter/jobs/list`

**Note:** This card also serves as the "Create your first job" entry point when no jobs exist yet.

### 4.3 Complete your company profile

**Condition:** `missingFields.length > 0` (from `companyProfileMissingFields()`)
**Card style:** Standard action card
**Card content:** "Complete your company profile"
**CTA destination:** `goToCompanyProfile()` -> `/recruiter/company/details`

---

## 5. KPI Cards

KPI cards are rendered as `.emp-dash-kpi-card.gh-pressable` elements. They display real counts from the dashboard API.

| Card | Data Field | Press Target | Notes |
|------|-----------|-------------|-------|
| Active Jobs | `activeJobs` | `goToJobsList()` | Count of published jobs |
| Applicants (this month) | Monthly applicants count | `goToApplicants()` | Applicants who applied in current calendar month |
| Interviews (this month) | Monthly interview count | (no confirmed routing) | Interview responses received this month |
| Needs Review | `needsReviewCount` | `goToApplicants()` | Combined statusId=1 and statusId=3 applicant count |

KPI cards use `.gh-pressable` for micro-scale press haptic feedback on tap/click.

---

## 6. Pipeline Visualization

**CSS class:** `.emp-dash-pipeline-rail`

The pipeline is a horizontal or vertical bar chart visualizing applicant counts by stage.

### 6.1 Bar rendering

Each stage in `byStage[]` is rendered as a bar:
- **Bar height:** `(count / max) * 100%` where `max` is the largest count across all stages
- **Bar color:** Coral (primary brand accent color, matches `btn-cta-primary`)
- **Label:** Stage label from `byStage[].label`
- **Count:** `byStage[].count` shown above or on bar
- **Accessible:** Each bar has `aria-label` describing stage and count

### 6.2 Pipeline interaction

**Current behavior:** Clicking a pipeline bar calls `goToJobsList()` -> `/recruiter/jobs/list`.

**Gap:** Bar click navigates to the general job list, not to an applicant list filtered by that pipeline stage. Stage-specific filtering of the applicant list is not yet implemented.

**Safe improvement (backlog):** When stage-specific applicant filtering is added to the applicant list route, update `goToJobsList()` in the pipeline bar click handler to pass a `statusId` query param.

### 6.3 Empty pipeline

When `byStage[]` is empty or all counts are zero, an `<app-empty-section>` component is rendered with:
- **Title:** "No applicants yet"
- **Subtitle/body:** Guidance to promote the job or wait for applications

---

## 7. Needs Review List

The needs-review list renders individual applicant cards requiring urgent action.

**Data:** `needsReview[]` from pipeline overview response.

**Per-entry display:**

| Element | Data | Notes |
|---------|------|-------|
| Avatar | Initials from `candidateName` | Initials avatar (no photo in this view) |
| Candidate name | `candidateName` | Full name |
| Job title | `jobTitle` | Which job they applied to |
| Submitted date | `submittedDate` | Formatted with Angular pipe `date:'mediumDate'` |
| Status label | Derived from `statusId` | e.g., "Pending Review" for statusId=1 |
| Review CTA | "Review" button | Calls `goToApplicants(applicationId or jobId)` |

---

## 8. Loading and Error States

### 8.1 Dashboard hero skeleton

While the main dashboard data is loading, a skeleton placeholder is shown for the hero section.

**CSS class:** `.emp-dash-hero-skeleton`

### 8.2 Action center skeleton

While the action center data is loading, skeleton placeholders are shown for action cards.

**CSS class:** `.emp-dash-action-skeleton` (3 cards shown as skeletons)

### 8.3 Pipeline skeleton

While pipeline overview is loading, a skeleton is shown for the pipeline rail and needs-review list.

**CSS class:** `.emp-dash-pipeline-skeleton`

**State variable:** `pipelineLoading` (boolean in component)

### 8.4 Pipeline error state

If `GET /company/dashboard/pipeline-overview` fails, an error panel is shown.

**State variable:** `pipelineError` (boolean in component)

**Error panel contents:**
- Error message (generic or from API response)
- Retry button calling `retryPipelineOverview()`

**`retryPipelineOverview()`:** Re-dispatches the pipeline overview fetch action. Clears `pipelineError` and sets `pipelineLoading=true` before the API call.

---

## 9. CTA Routing Map

| CTA Method | Destination | Trigger |
|-----------|-------------|---------|
| `goToCreateJob()` | `/recruiter/jobs/create` | "Create a job" action card |
| `goToApplicants(jobId?)` | `/recruiter/jobs/applicants?id={jobId}` (with jobId) or general applicants (without) | "Review new applicants" card, KPI card press, needs-review "Review" button |
| `goToJobsList()` | `/recruiter/jobs/list` | "Manage your jobs" card, pipeline bar click (gap: should be stage-filtered) |
| `goToCompanyProfile()` | `/recruiter/company/details` | "Complete your company profile" card |

---

## 10. Company Profile Missing Fields Detection

**Method:** `companyProfileMissingFields()` in `company-dashboard.component.ts`

**Logic:**
```typescript
companyProfileMissingFields(): string[] {
  const missing = []
  if (!this.dashboard?.companyLogoUrl) missing.push('logo')
  if (!this.dashboard?.companyDetails) missing.push('description')
  if (!this.dashboard?.companyCity) missing.push('city')
  return missing
}
```

(Exact implementation may vary; this represents the documented behavior.)

**Return value:** Array of missing field labels. Empty array if all fields are present.

**Used by:** Action center to conditionally render the "Complete your company profile" card.

**Limitations:**
- Only checks three fields. Company website, industry, employee count, and other profile fields are not checked.
- Detection is reactive per dashboard load. There is no persistent "profile complete" flag.
- If the dashboard API fails, `companyLogoUrl` etc. will be undefined, potentially triggering false-positive "missing" state.

---

## 11. Known Gaps

| # | Gap | Priority | Type |
|---|-----|----------|------|
| 1 | Company not setup redirect bug: "Setup Company" button does not navigate | High | Bug |
| 2 | Pipeline bar click goes to job list, not stage-filtered applicant list | Medium | UX gap |
| 3 | No job-level dashboard (clicking a job in dashboard context goes to list, not job view) | Medium | Missing feature |
| 4 | No messages snapshot card on dashboard | Low | Missing feature |
| 5 | `pipelineError` hides the full pipeline section including existing data on retry | Low | UX gap |
| 6 | Missing fields detection fires false-positive when dashboard API fails | Low | Bug (edge case) |
| 7 | No "Create your first job" distinct CTA -- first-time employer and returning employer see same "Manage your jobs" card | Medium | UX gap |
| 8 | No real-time count updates (dashboard refreshes only on page load, not during session) | Low | Enhancement |
