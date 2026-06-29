# GETHIRED ACTIONS DECISION LOG — RECENT DEPLOYMENT

## D-001: Double delete confirmation (ACT-004)
Decision: Deferred — not fixed in this deployment
Why: Double confirmation is friction but not harmful; fixing requires careful dispatch chain testing
Impact: Recruiter sees two "are you sure?" dialogs with different styling — confusing but functional
Next action: Fix in next dev pass by removing ConfirmationDialogComponent from deleteRow() when result from JAC is truthy

## D-002: createInterview() job context (ACT-005)
Decision: Deferred — depends on interview route verification
Why: Need to verify /recruiter/interview accepts ?jobId queryParam before adding it
Next action: Audit interview creation component, then add queryParams

## D-003: Salary DTO field unused (salary.label computed but not rendered)
Decision: Accepted — INFO level, not a bug
Why: FE already shows salary from list row; BE computes label as future-proofing

## D-004: role=dialog double-nesting (ACT-006)
Decision: Deferred — minor a11y issue
Why: Most screen readers handle this gracefully; MatDialog's outer dialog role is primary
Next action: Remove role=dialog from .gh-jac div in next a11y pass
