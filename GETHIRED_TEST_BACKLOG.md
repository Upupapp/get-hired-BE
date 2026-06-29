# GETHIRED TEST BACKLOG — RECENT DEPLOYMENT

## TB-001 · Add unit tests for isPrivacyBoilerplate()
Priority: P1 | Effort: S | File: job-posts-details.component.spec.ts
Acceptance: positive/negative/edge/null cases all pass

## TB-002 · Add unit tests for TableControlModalComponent
Priority: P1 | Effort: M | File: table-control-modal.component.spec.ts
Acceptance: status derivation, canView/canShare, delete flow all covered

## TB-003 · Add integration test for GET /job/action-summary
Priority: P1 | Effort: M | File: tests/jobs/getJobActionSummary.test.js
Acceptance: 400/403/404/200 cases + DTO shape validated

## TB-004 · Add E2E test for JAC modal open → delete flow
Priority: P2 | Effort: L | Tool: Cypress or Playwright
Acceptance: full user flow from job list → modal → delete confirmed
