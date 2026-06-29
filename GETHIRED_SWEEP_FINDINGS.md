# GETHIRED SWEEP FINDINGS — RECENT DEPLOYMENT

## FINDING-01 · Severity: LOW · Double delete confirmation
**File:** table-control-modal.component.ts:183 + job-list.component.ts:241
**Description:** User sees in-modal confirm panel, clicks "Delete job post", modal closes returning this.job. Parent job-list.deleteRow() then opens a second ConfirmationDialogComponent.
**Impact:** Recruiter asked to confirm deletion twice — confusing UX, anti-pattern.
**Fix options:**
  A) In job-list.component.ts deleteRow(), call this.jobFacade.deleteJobPost(jobId) directly when result (this.job) is truthy from JAC modal, skipping ConfirmationDialogComponent.
  B) Remove the in-modal confirm panel and keep only ConfirmationDialogComponent.
**Recommendation:** Option A — minimal change, JAC confirm panel already provides appropriate friction.
**Priority:** P2 | Status: DEFERRED

## FINDING-02 · Severity: LOW · Nested role="dialog" (a11y)
**File:** table-control-modal.component.html:7
**Description:** .gh-jac div has role="dialog" aria-modal="true". MatDialog's own mat-dialog-container also has role="dialog". Screen readers may announce "dialog" twice on open.
**Fix:** Remove role="dialog" and aria-modal="true" from .gh-jac. Move aria-labelledby to MatDialogConfig or keep as is (most screen readers handle the inner one gracefully; this is minor).
**Priority:** P2 | Status: DEFERRED

## FINDING-03 · Severity: LOW · createInterview() loses job context
**File:** table-control-modal.component.ts:158
**Description:** `this.router.navigate(['/recruiter/interview'])` has no jobId query param. The interview creation flow won't know which job to associate.
**Fix:** `this.router.navigate(['/recruiter/interview'], { queryParams: { jobId: this.jobId } })` — IF the interview route/form reads this param.
**Dependency:** Requires verifying that /recruiter/interview reads ?jobId from queryParams.
**Priority:** P2 | Status: DEFERRED

## FINDING-04 · Severity: INFO · isPrivacyBoilerplate() verification needed
**File:** job-posts-details.component.html:176
**Description:** Template calls isPrivacyBoilerplate(). Build passed (method must exist), but behavior should be tested:
- 14-item keyword list
- threshold: 2+ markers → returns true
- uses indexOf not includes
- no ?. or ?? (Node 14 consideration doesn't apply to FE, but consistency noted)
**Priority:** P3 | Status: TEST to verify

## FINDING-05 · Severity: INFO · Salary display in JAC modal
**File:** jobsController.js — getJobActionSummary
**Description:** Salary is pre-formatted as a label string on the BE. The FE doesn't use this label — it shows salary from the job-list row data already passed as `data`. The salary DTO field (salary.label, salary.isVisible) exists in the response but is unused in the FE template.
**Impact:** None currently — salary shown from pre-mapped list row. Future: if JAC template ever shows salary, the label field is available.
**Priority:** P3 | Status: INFO
