# GETHIRED_JOB_READINESS_BAR_CHIPS_CURRENT_STATE_AUDIT_V1

## Scope
Audit of the GetHired FE codebase prior to B13 implementation (2026-06-25).

## Job Create Flow Structure
- Component: `JobCreateComponent` (`src/app/job/job-create/job-create.component.ts`)
- 4-step stepper: Job Details → Rates and Roles → Create Interview (Optional) → Preview Job Post
- Publish gate in `publishJobPost()`: checks jobTypeId, jobLevelId, jobCity, jobCountry, jobDescription, workSetupId, banner, companyId
- B04 rule in effect: interview/video questions are OPTIONAL, stepper comment confirms "Made Interview Optional"
- No readiness bar/chips existed before B13

## Existing Services (NOT touched)
- `JobCompatibilityService` — applicant-job match, untouched
- `JobMatchabilityService` — job post matchability for MATCH v3, untouched
- `PublicJobNormalizerService` — job normalizer for public portal, untouched

## Form Structure (job-create.component.ts `setFormGroup`)
### initialData group (step 1 — required):
- jobTitle [Validators.required]
- jobTypeId, jobLevelId
- jobAddress, jobCity [Validators.required], jobCountry [Validators.required]
- jobDescription, jobDuties
- jobCategoryId, workSetupId, jobBanner
- bannerFile, badges, requirements, goodToHave, educationalBackground, certificationRequirements

### jobInfo group (step 2 — optional):
- industryId, jobRoleId
- skills, tags
- rate, salaryMinimum, salaryMaximum, salaryCurrency

### interview group (step 3 — optional per B04):
- interviewQuestions, interviewTemplateId

## Actual publish validation (publishJobPost()):
```
isReadyToPublish = !!(
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

NOTE: jobTitle has `Validators.required` on the form, so a blank title prevents `initialFormValid` from being true, which blocks step progression. But technically the publish gate doesn't check `jobTitle` directly. B13 service includes jobTitle as a required check since it's form-required and logically mandatory.

## Module: job.module.ts
- Declares all job-create components
- JobModule is imported by EmployerJobsModule

## B09 Company Profile (preserved)
- Brand/Benefits fields (mission, values, perks, health, leave, learning) do NOT exist in DB
- B13 readiness treats company brand/benefits as NEVER blocking publish

## Pre-existing warnings (not B13)
- autoprefixer: add-contact-group.component.scss lines 344-345 (start value mixed support) — pre-existing, not from B13

## Verdict
No readiness bar, chips, or deterministic quality signals existed before B13.
MATCH v3 matchability card exists in preview step — B13 adds a separate readiness section above it.
