# GETHIRED TEST COVERAGE REPORT — RECENT DEPLOYMENT

## Coverage Status

| Area | Automated | Manual | Coverage |
|---|---|---|---|
| isPrivacyBoilerplate() | NONE | NONE | 0% |
| JAC component render | NONE | PARTIAL | 30% |
| JAC status derivation | NONE | YES | 70% |
| JAC delete flow | NONE | YES | 70% |
| action-summary endpoint | NONE | YES | 60% |
| V7 breadcrumb fix | NONE | YES | 80% |
| V7 rating guard | NONE | YES | 80% |
| V7 boilerplate guard | NONE | YES | 60% |

## Test Files Recommended

### FE: job-posts-details.component.spec.ts
```
describe('isPrivacyBoilerplate', () => {
  it('returns true for privacy policy text with 2+ markers', ...)
  it('returns false for real job description', ...)
  it('returns false for empty string', ...)
  it('returns false for null/undefined', ...)
})
```

### FE: table-control-modal.component.spec.ts
```
describe('TableControlModalComponent', () => {
  it('shows skeleton while summaryLoading=true', ...)
  it('shows real data when summaryLoading=false', ...)
  it('derives statusKey=published for statusId=2', ...)
  it('canView returns true only for statusId=2', ...)
  it('close() when confirmDelete=true resets confirmDelete, does not close dialog', ...)
  it('confirmDeleteJob() closes dialog with this.job', ...)
})
```

### BE: tests/jobs/getJobActionSummary.test.js
```
describe('GET /job/action-summary', () => {
  it('returns 400 when jobId missing', ...)
  it('returns 403 when unauthenticated', ...)
  it('returns 404 when jobId not in caller company', ...)
  it('returns 200 with full DTO for valid request', ...)
  it('returns totalApplicants as integer', ...)
})
```
