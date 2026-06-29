# GETHIRED NOTIFY BACKLOG — RECENT DEPLOYMENT

## NB-001 · Fix double delete confirmation messaging
Priority: P2 | Source: NOTIFY-01 = ACT-004
Files: job-list.component.ts
Problem: Two separate "are you sure?" flows with different copy/styling — contradictory

## NB-002 · Add apply CTA to boilerplate fallback notice
Priority: P3 | Source: NOTIFY-02
Files: job-posts-details.component.html
Problem: Boilerplate notice doesn't guide applicant to apply anyway
Risk: Only add if confirmed job can be applied to without description

## NB-003 · JAC modal empty-state when summary fails to load
Priority: P2 | Source: OPTIMIZE
Files: table-control-modal.component.html
Problem: summaryError=true has no visible error state in template (only summaryLoading handled)
Recommendation: Add error notice when summaryError=true
