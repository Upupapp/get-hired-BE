# GETHIRED_JOB_READINESS_SERVICE_IMPLEMENTATION_LOG_V1

## File Created
`src/app/job/services/job-readiness.service.ts`

## Design Decisions

### Pure function
`evaluate()` is a pure function. No state, no subscriptions, no HTTP.
Can be called safely in every form-value-changes debounce without memory leaks.

### Interfaces exported
All interfaces (`JobReadinessResult`, `JobReadinessInput`, `JobReadinessItem`,
`JobReadinessSectionStatus`, `JobReadinessAction`) are exported so components
can import and type-check their inputs directly.

### providedIn: 'root'
Service is tree-shakeable and doesn't need NgModule registration.
Angular DI handles singleton instantiation.

### B04 preserved
`interviewQuestions` length check is in the RECOMMENDED bucket (`pushRec`),
not the blocking bucket. The comment explicitly notes "B04: NEVER blocking".

### Cert/license preserved
`certificationRequirements` is NOT checked at all — no required, no recommended.
Certification optional item is in the static `optionalItems` array only.

### Salary/benefits preserved
No salary check anywhere. No benefits check.

### Company brand preserved
`companyLogoUrl` and `companyDetails` are recommended only, never blocking.

### Helper methods
- `getLevelClass(level)` → CSS class string
- `getLevelLabel(level)` → display copy

## Required checks mirror
Checked against job-create.component.ts publishJobPost() (lines 361-375):
```
!!(
  job.jobTypeId &&
  job.jobLevelId &&
  job.jobCity != null && job.jobCity !== '' &&
  job.jobCountry != null && job.jobCountry !== '' &&
  job.jobDescription != null && job.jobDescription !== '' &&
  job.workSetupId &&
  (job.bannerFile[0] || job.jobBanner != "") &&
  job.companyId
)
```
B13 service required checks: jobTitle (form-required), jobTypeId, jobLevelId,
jobCity, jobCountry, jobDescription, workSetupId, banner, companyId — 1:1 match.

## Section IDs
Used for jump-to-scroll anchors in the job-create form:
- section-job-title
- section-employment
- section-location
- section-description
- section-work-setup
- section-banner
- section-company
- section-duties
- section-skills
- section-requirements
- section-interview
- section-education
