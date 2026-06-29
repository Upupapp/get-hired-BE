# GETHIRED SWEEP REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` (V7 Job Detail) + `fa8865a` (Job Action Command Center) | BE `8caa558` (action-summary)
**Date:** 2026-06-29 | **Command:** SWEEP RECENT DEPLOYMENT

## Executive Summary

| Item | Value |
|---|---|
| FE commits audited | 2 (`5c01c2a`, `fa8865a`) |
| BE commits audited | 1 (`8caa558`) |
| Files changed (FE) | 9 |
| Files changed (BE) | 2 |
| New endpoints | 1 (`GET /job/action-summary`) |
| Critical bugs found | 1 (double-confirmation UX) |
| Security issues | 0 new |
| Build status | PASS (Angular 13 strict) |
| Deploy status | local = GitHub = prod (synced) |

## Phase 2: FE Commit `5c01c2a` — Public Job Detail V7

### Files changed:
- `job-posts-details.component.html` — privacy boilerplate guard + fallback notice
- `job-posts-details.component.scss` — `.gh-content-quality-notice` styles
- `job-details-sidecard.component.html` — `*ngIf="company?.companyRating > 0"` guard

### Bug fixes verified (6/6):
1. FIXED: Duplicate breadcrumb removed — single `<nav aria-label="Breadcrumb">` only
2. FIXED: Old coral hero replaced with CSS gradient `#cssHeroBanner` template
3. FIXED: Salary dash — `nJob.salaryDisplay` handles missing with "Not specified"
4. FIXED: Sticky rail top — `gh-detail-rail` uses `top: 84px` (68px nav + 16px gap)
5. FIXED: Boilerplate guard — `isPrivacyBoilerplate()` wraps "About this role" section
6. FIXED: Fake 0-rating — `*ngIf="company?.companyRating > 0"` on sidecard rating

## Phase 3: FE Commit `fa8865a` — Job Action Command Center

### Files changed:
- `table-control-modal.component.ts` — complete rewrite (192 lines)
- `table-control-modal.component.html` — complete rewrite (243 lines)
- `table-control-modal.component.scss` — complete rewrite (445 lines)
- `job-list.component.ts` — viewMenu(): 560px width, panelClass `gh-jac-dialog`
- `job.service.ts` — `getJobActionSummary(jobId)` method
- `styles.scss` — `.gh-jac-dialog` MatDialog panel + mobile bottom-sheet

### Feature inventory:
- Header: Deep Navy bg (#1a1830), job ID chip, status badge (published/draft/expired/archived), work setup, title, close button
- Summary strip: applicant count chip, interview questions count chip, live/draft status; skeleton shimmer while loading
- Action groups: Manage job | Applicants & interviews | Promote & share | Danger Zone
- Status-aware primary: "View public job post" (published) / "Preview job post" (draft/other)
- Count badge on Review Applicants (real data from BE)
- Copy link: disabled with reason when not published; clipboard + 8ms haptic on copy
- Delete flow: in-modal confirm panel (role=alertdialog), applicant count warning, cancel-first
- Mobile: bottom sheet on ≤600px

## Phase 4: BE Commit `8caa558` — action-summary Endpoint

### Files changed:
- `controllers/jobsController.js` — `getJobActionSummary` function
- `routes/jobsRoute.js` — `GET /job/action-summary` route

### Endpoint spec:
- Route: `GET /api/job/action-summary?jobId=xxx`
- Auth: `verifyAuth` (Firebase ID token)
- Authz: `getUserCompanyForRequest()` → `WHERE j.job_id=$1 AND j.company_id=$2`
- Returns: job metadata, applicant COUNT only (no PII), interview question count, action flags
- Node 14 safe: zero `?.` or `??` operators

## Phase 5: Data Flow

```
User clicks action button on job row
  → job-list: viewMenu(event)
    → MatDialog.open(TableControlModalComponent, { data: jobRow })
      → ngOnInit: loadSummary(jobId)
        → GET /api/job/action-summary?jobId=xxx [verifyAuth]
          → getUserCompanyForRequest → company.companyId
          → SELECT jobs WHERE job_id=$1 AND company_id=$2
          → SELECT COUNT(*) FROM job_applicants WHERE job_id=$1
          → SELECT COUNT(*) FROM interview_template_question JOIN job_interview_template
          → return DTO {job, summary, actions}
```

## Phase 6: Findings

### FINDING-01 · LOW · Double delete confirmation (UX friction)
- User confirms delete inside JAC modal, modal closes returning this.job
- Parent job-list.deleteRow() opens a SECOND ConfirmationDialogComponent
- Recruiter asked to confirm twice — confusing
- Status: DEFERRED → ACTIONS backlog

### FINDING-02 · LOW · Nested role="dialog"
- .gh-jac has role="dialog" aria-modal="true"
- MatDialog already wraps in role="dialog" on mat-dialog-container
- Screen readers may announce dialog twice
- Fix: remove role="dialog" from inner div, rely on MatDialog's container
- Status: DEFERRED → MOBILEVIEW/a11y backlog

### FINDING-03 · LOW · createInterview() loses job context
- Navigates to /recruiter/interview without ?jobId=xxx query param
- Recruiter must manually associate interview with job
- Status: DEFERRED → ACTIONS backlog

### FINDING-04 · INFO · isPrivacyBoilerplate() method
- Template calls isPrivacyBoilerplate() — must exist in component TS
- Build passed, so it does exist — verify behavior in TEST
- Status: TEST to verify

## Phase 7: Security Surface Summary

| Check | Status |
|---|---|
| New endpoint has verifyAuth | PASS |
| Endpoint scoped to caller company | PASS (WHERE company_id=$2) |
| No SQL injection (parameterized) | PASS |
| No applicant PII returned | PASS (COUNT only) |
| No optional chaining in BE | PASS |
| window.open uses noopener | PASS |
| No unsafe innerHTML in FE | PASS |

## Recommended Next Commands
1. TEST — verify isPrivacyBoilerplate, JAC behavior, endpoint contract
2. SECURE — full authorization chain verification
3. MOBILEVIEW — bottom-sheet behavior on mobile
4. ACTIONS — track FINDING-01 and FINDING-03 in backlog
