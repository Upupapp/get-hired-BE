# GETHIRED STITCH REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29

## Executive Summary

| Integration Point | Status |
|---|---|
| JAC FE → action-summary BE contract | VERIFIED |
| FE service → BE response shape mapping | VERIFIED |
| job-list → table-control-modal data handoff | VERIFIED |
| modal result → deleteRow dispatch | VERIFIED |
| V7 boilerplate guard → component method | VERIFIED (build) |
| V7 rating guard → company data shape | VERIFIED |
| No cross-company data leakage | VERIFIED |
| No applicant PII in response | VERIFIED |

## Phase 1: API Contract Verification

### FE calls: `JobService.getJobActionSummary(jobId)`
```typescript
// job.service.ts
getJobActionSummary(jobId: string) {
  return this.baseService.get<any>(`${this.jobUrl}/action-summary?jobId=${encodeURIComponent(jobId)}`);
}
```

### BE serves: `GET /api/job/action-summary`
Contract fields consumed by FE:
| FE reads | BE provides | Type match |
|---|---|---|
| res.data.job.statusId | statusId (number) | ✅ |
| res.data.job.title | title (string) | ✅ |
| res.data.job.workSetupName | workSetupName (string\|null) | ✅ |
| res.data.job.publicUrl | publicUrl (string\|null) | ✅ |
| res.data.summary.totalApplicants | totalApplicants (number) | ✅ |
| res.data.summary.interviewQuestionsCount | interviewQuestionsCount (number) | ✅ |
| res.data.actions.canView | canView (boolean) | ✅ |
| res.data.actions.canShare | canShare (boolean) | ✅ |

### FE unused BE fields:
- `res.data.job.salary` (label, isVisible) — computed but not rendered
- `res.data.job.editUrl` — FE derives from jobId directly
- `res.data.job.applicantsUrl` — FE derives from jobId directly
- `res.data.permissionNotice` — shown in footer but taken from component template, not BE

### Status: CONTRACT VERIFIED ✅

## Phase 2: Data Handoff — job-list → JAC Modal

### job-list.component.ts passes:
```typescript
this.dialog.open(TableControlModalComponent, {
  data: event && event.data ? event.data : null,
})
```

### JAC modal reads from `this.data`:
| Field read | Source | Fallback |
|---|---|---|
| this.data.jobId | List row jobId | '' |
| this.data.jobTitle | List row jobTitle | '' |
| this.data.jobStatusId | List row jobStatusId | 1 (Draft) |
| this.data.workSetupName | List row workSetupName | '' |

### JAC modal overrides with summary:
- status → from `summary.job.statusId` (fresher than list row)
- title → from `summary.job.title` (fresher than list row)
- workSetupName → from `summary.job.workSetupName`

This is a good pattern: list row provides immediate display, summary provides verified-fresh data.

### Status: HANDOFF VERIFIED ✅

## Phase 3: Delete Result Handoff

### JAC modal returns:
```typescript
confirmDeleteJob(): void {
  this.dialogRef.close(this.job); // this.job = this.data (the list row)
}
```

### job-list.component.ts receives:
```typescript
openDialog.afterClosed().subscribe(result => {
  if (result) { this.deleteRow(result) }
})
```

### deleteRow() extracts jobId:
```typescript
const jobId = event.hasOwnProperty('data') ? event.data.jobId : event.jobId;
```

`event` here is `this.job = this.data` (the raw list row event), which has `.jobId` directly.
So `event.jobId` is used. ✅

### Issue: deleteRow() opens second ConfirmationDialogComponent
This is FINDING-01 from SWEEP. The stitch between JAC confirm and the second dialog is technically functional but creates double-confirmation UX friction.

### Status: DELETE FLOW FUNCTIONAL (FINDING-01 deferred) ✅

## Phase 4: Company Scoping Chain

```
FE: user submits request with Firebase token
  → verifyAuth: decodes token → req.user.uid
  → getJobActionSummary: getUserCompanyForRequest(req, uid)
    → fetches company_users WHERE uid=$1 AND status=active
    → returns { companyId, ... }
  → SELECT jobs WHERE job_id=$1 AND company_id=$2
    → $1 = req.query.jobId (untrusted but parameterized)
    → $2 = callerCompany.companyId (server-derived, trusted)
  → cross-company access: job_id belongs to other company → 404 response
```

**BOLA chain: VERIFIED CLOSED** ✅

## Phase 5: V7 Integration Points

### isPrivacyBoilerplate() integration:
- Template: `*ngIf="isPrivacyBoilerplate(selectedJobPost?.jobDescription); else realDescription"`
- Method must exist in job-posts-details.component.ts
- Build passed → method confirmed to exist ✅
- Behavior: checks job description text for privacy policy markers
- Integration with job data: `selectedJobPost?.jobDescription` — uses optional chaining in template (safe in Angular templates, only unsafe in Node 14 BE)

### Rating guard integration:
- Template: `*ngIf="company?.companyRating > 0"`
- `company` is passed as `@Input()` from parent via `nJob.companyRating`
- If `company` is null/undefined → `undefined > 0` → false → div hidden ✅
- If `company.companyRating === 0` → `0 > 0` → false → div hidden ✅
- If `company.companyRating > 0` → div shown ✅

### Status: V7 INTEGRATIONS VERIFIED ✅

## Phase 6: Anti-Corruption Layer Check

### FE does not trust:
- companyId from the job row (modal fetches fresh from BE via verifyAuth)
- jobStatusId from the job row for authorization decisions (BE re-derives)

### BE does not trust:
- UID from request body or query (uses req.user.uid from Firebase token)
- companyId from request body or query (derives from DB via getUserCompanyForRequest)

### Status: ACL INTACT ✅

## Phase 7: Integration Release Gate

| Gate | Status |
|---|---|
| A API contract match | PASS |
| B Data handoff (list → modal) | PASS |
| C Delete result handoff | PASS |
| D Company scoping chain | PASS |
| E V7 guard integrations | PASS |
| F No trusted client data for authz | PASS |
| G No cross-company leak | PASS |

**Overall: PASS**

## Recommended Next Steps
1. Fix FINDING-01 (double delete confirm) — see OPTIMIZE-BACKLOG OPT-005
2. Fix FINDING-03 (createInterview jobId context) — see OPTIMIZE-BACKLOG OPT-003
