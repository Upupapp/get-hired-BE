# GETHIRED BRAND BACKLOG — RECENT DEPLOYMENT

## BB-001 · Show salary in JAC summary strip
Priority: P3 | Effort: XS
Problem: salary.label from BE is computed but not displayed in summary strip
Files: table-control-modal.component.html, .ts (salaryLabel getter)

## BB-002 · Add WCAG 2.5.5 compliant touch targets to .gh-jac-btn
Priority: P2 | Effort: XS
Problem: .gh-jac-btn is ~40px height; WCAG 2.5.5 minimum is 44px
Files: table-control-modal.component.scss

## BB-003 · Add updatedAt "Posted N days ago" to JAC summary strip
Priority: P3 | Effort: S
Problem: JAC DTO includes updatedAt but it's not displayed
Files: table-control-modal.component.html, .ts (dateRelative getter)

## BB-004 · Error state in JAC summary when load fails
Priority: P2 | Effort: XS
Problem: summaryError=true → no visible error notice to recruiter (silent degradation to list row data)
Files: table-control-modal.component.html (add *ngIf="summaryError" notice)
