# GETHIRED OPTIMIZE BACKLOG — RECENT DEPLOYMENT

## OPT-001 · Resolve double role="dialog" nesting
Priority: P2 | File: table-control-modal.component.html
Fix: Remove role="dialog" aria-modal="true" from .gh-jac div; rely on MatDialog container

## OPT-002 · gh-jac-btn height for WCAG 2.5.5
Priority: P2 | File: table-control-modal.component.scss
Fix: Increase .gh-jac-btn padding to ensure min 44px touch target height (currently ~40px)

## OPT-003 · createInterview() — pass jobId in query params
Priority: P2 | File: table-control-modal.component.ts:158
Fix: navigate with { queryParams: { jobId: this.jobId } } to pre-associate interview with job

## OPT-004 · Add JSON-LD structured data to job detail page
Priority: P2 | File: job-posts-details.component.ts
Fix: Inject JobPosting schema.org JSON-LD for Google Job Search rich results

## OPT-005 · Resolve double delete confirmation (FINDING-01)
Priority: P2 | Files: job-list.component.ts:241, table-control-modal.component.ts:183
Fix: Remove second ConfirmationDialogComponent when result from JAC is truthy

## OPT-006 · Salary DTO field unused in FE
Priority: P3 | Files: jobsController.js (BE returns salary.label/isVisible), JAC template
Note: salary.label is computed but not rendered in JAC. Consider using it in the summary strip.
