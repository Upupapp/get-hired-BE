# GETHIRED_JOB_READINESS_CERTIFICATION_LICENSE_PRESERVATION_LOG_V1

## Rule
"Certifications/licenses NEVER block publish (not a current product rule)"

## Evidence of Preservation

### 1. JobReadinessService.evaluate()
`certificationRequirements` is NOT evaluated anywhere in the service.
Not in `pushRequired()` and not in `pushRec()`.
It appears only in the static `optionalItems` array as "Certifications optional".

### 2. publishJobPost() — untouched
The existing publish gate in job-create.component.ts has no certification check.
B13 mirrors this exactly.

### 3. job.model.ts
`JobCertificationRequirement` interface preserved. No changes.

### 4. job-post-detail-step.component.ts
`certificationRequirements` FormArray preserved. Add/remove methods unchanged.
B13 does not add any certification validators.

### 5. preview-job-post-step.component.html
Certifications & Licenses section in the preview unchanged:
- Still shows when `preview.certificationRequirements && preview.certificationRequirements.length > 0`
- Badge (required/preferred) and type display unchanged

### 6. Optional chip
"Certifications optional" chip in JobReadinessChipsComponent (optional grey group)
gives the employer a clear signal that this field is available but not required.

## No "Missing certifications lower match" copy
Zero instances of this or any similar phrase anywhere in B13 code.
Search confirmed: no match in job-readiness-bar/chips templates or SCSS.
