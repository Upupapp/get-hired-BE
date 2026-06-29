# GETHIRED ACTIONS REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29

## Executive Summary

This ACTIONS report converts all SWEEP/TEST/OPTIMIZE/STITCH findings from the recent deployment into a prioritized backlog. No blockers found. All P0/P1 items are already resolved by the deployment itself. Remaining items are P2/P3 polish and test additions.

## Backlog — Prioritized

### P1 — High Value, Low Risk

| ID | Title | Source | Files | Effort |
|---|---|---|---|---|
| ACT-001 | Add unit tests for isPrivacyBoilerplate() | TEST | job-posts-details.spec.ts | S |
| ACT-002 | Add unit tests for TableControlModalComponent | TEST | table-control-modal.spec.ts | M |
| ACT-003 | Add integration test for action-summary endpoint | TEST | tests/jobs/actionSummary.test.js | M |

### P2 — Important, Moderate Risk

| ID | Title | Source | Files | Effort |
|---|---|---|---|---|
| ACT-004 | Fix double delete confirmation (FINDING-01) | SWEEP | job-list.component.ts | S |
| ACT-005 | Fix createInterview() — pass jobId query param | SWEEP/OPTIMIZE | table-control-modal.ts | XS |
| ACT-006 | Remove nested role=dialog from JAC inner div | OPTIMIZE/a11y | table-control-modal.html | XS |
| ACT-007 | Increase .gh-jac-btn to 44px touch target | OPTIMIZE | table-control-modal.scss | XS |

### P3 — Nice to Have

| ID | Title | Source | Files | Effort |
|---|---|---|---|---|
| ACT-008 | Add JSON-LD JobPosting schema to job detail | OPTIMIZE/SEO | job-posts-details.ts | M |
| ACT-009 | Use salary DTO field in JAC summary strip | STITCH | table-control-modal.html | XS |
| ACT-010 | Add E2E test for full JAC → delete user flow | TEST | cypress or playwright | L |
| ACT-011 | Verify isPrivacyBoilerplate() handles null input | TEST | job-posts-details.ts | XS |

## Decision Log

### D-001: Why we kept in-modal confirm panel AND second ConfirmationDialogComponent
**Decision:** Deferred fix (ACT-004) — not removed in this deployment
**Rationale:** Removing the second dialog is safe but requires careful testing of the delete dispatch chain. The double-confirm is friction but not harmful.
**Recommendation:** Fix in next dev pass (remove ConfirmationDialogComponent from deleteRow when result comes from JAC modal).

### D-002: Why createInterview() doesn't pass jobId
**Decision:** Deferred (ACT-005) — depends on whether /recruiter/interview route accepts queryParams
**Rationale:** Navigating to a route with unexpected queryParams is safe, but the interview form must read them. This needs verification of the interview creation component.
**Recommendation:** Audit /recruiter/interview component for queryParams handling before fixing.

### D-003: Why salary label is computed in BE but not used in FE
**Decision:** INFO — not a bug
**Rationale:** FE already shows salary from the pre-mapped job list row. The BE salary label is future-proofing — if JAC ever adds a salary row, the field is available.

## Recommended Execution Order

1. ACT-001 → ACT-002 → ACT-003 (test suite — safe, additive)
2. ACT-006 → ACT-007 (tiny a11y fixes — XS effort)
3. ACT-005 (interview jobId — verify route first)
4. ACT-004 (double confirm — test carefully after fix)
5. ACT-008 (JSON-LD — SEO value, medium effort)
6. ACT-009 (salary in strip — low effort, nice UX)
