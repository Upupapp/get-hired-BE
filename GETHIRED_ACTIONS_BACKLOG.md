# GETHIRED ACTIONS BACKLOG — RECENT DEPLOYMENT

## ACT-001
ID: ACT-001
Title: Add unit tests for isPrivacyBoilerplate()
Problem: No automated tests for the privacy boilerplate detection logic
Files: src/app/jobs/job-posts-details/job-posts-details.component.spec.ts
Priority: P1 | Effort: S | Status: OPEN
Acceptance: positive/negative/null/edge cases all pass

## ACT-002
ID: ACT-002
Title: Add unit tests for TableControlModalComponent
Problem: Complete rewrite of modal has zero automated test coverage
Files: src/app/job/job-list/dialogs/table-control-modal/table-control-modal.component.spec.ts
Priority: P1 | Effort: M | Status: OPEN
Acceptance: status derivation, canView/canShare, delete flow, close behavior all covered

## ACT-003
ID: ACT-003
Title: Add integration test for action-summary endpoint
Problem: New BE endpoint has no automated test
Files: tests/jobs/getJobActionSummary.test.js
Priority: P1 | Effort: M | Status: OPEN
Acceptance: 400/403/404/200 responses + DTO shape validated

## ACT-004
ID: ACT-004
Title: Fix double delete confirmation
Problem: Recruiter asked to confirm deletion twice (JAC modal + ConfirmationDialogComponent)
Files: job-list.component.ts (remove ConfirmationDialogComponent from deleteRow when result from JAC)
Priority: P2 | Effort: S | Status: OPEN
Acceptance: Single confirmation only; delete still dispatches correctly

## ACT-005
ID: ACT-005
Title: Fix createInterview() — pass jobId in query params
Problem: Navigates to /recruiter/interview without job context; recruiter must manually select job
Files: table-control-modal.component.ts:158
Priority: P2 | Effort: XS | Status: OPEN (depends on interview route verification)
Acceptance: /recruiter/interview?jobId=JBxxx pre-selects the job

## ACT-006
ID: ACT-006
Title: Remove nested role=dialog from JAC inner div
Problem: .gh-jac has role=dialog; MatDialog container also has role=dialog — screen readers announce twice
Files: table-control-modal.component.html:7
Priority: P2 | Effort: XS | Status: OPEN
Acceptance: Only one dialog role announced by screen readers

## ACT-007
ID: ACT-007
Title: Increase .gh-jac-btn to 44px touch target
Problem: Cancel/Delete buttons in confirm panel have ~40px height (slightly under WCAG 2.5.5)
Files: table-control-modal.component.scss
Priority: P2 | Effort: XS | Status: OPEN
Acceptance: min-height: 44px on .gh-jac-btn

## ACT-008
ID: ACT-008
Title: Add JSON-LD JobPosting schema to public job detail
Problem: No structured data on /jobs/details/:id — Google Job Search eligibility missed
Files: job-posts-details.component.ts (add @HostListener or service to inject JSON-LD)
Priority: P3 | Effort: M | Status: OPEN
Acceptance: Valid schema.org/JobPosting JSON-LD in page head

## ACT-009
ID: ACT-009
Title: Show salary in JAC summary strip
Problem: Salary DTO field (salary.label) computed by BE but not rendered in modal
Files: table-control-modal.component.html, .component.ts (add salaryLabel getter)
Priority: P3 | Effort: XS | Status: OPEN
Acceptance: Salary displayed in summary strip when salary.isVisible=true

## ACT-010
ID: ACT-010
Title: Add E2E test for full JAC user flow
Problem: No end-to-end test covering job list → modal open → delete
Files: cypress/e2e/employer/job-action-center.cy.ts (new)
Priority: P3 | Effort: L | Status: OPEN
