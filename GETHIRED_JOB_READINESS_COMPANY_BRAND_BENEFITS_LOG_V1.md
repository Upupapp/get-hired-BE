# GETHIRED_JOB_READINESS_COMPANY_BRAND_BENEFITS_LOG_V1

## B09 context
B09 Company Profile subtabs (Profile | Brand | Benefits) at `/recruiter/company/details`.
Brand tab surfaces `company_details` + `company_logo`.
Benefits tab surfaces `work_setup_id` + `numberOfEmployee`.
Other brand/benefits fields (mission, values, perks, health, leave, learning) do NOT exist in DB.
These fields NEVER block publish per spec.

## What B13 does

### Company logo (companyLogoUrl)
- RECOMMENDED check (not required)
- Checked in `pushRec()` → goes to `recommendationItems` if missing
- Chip: "Company logo" (amber)

### Company overview (companyDetails)
- RECOMMENDED check (not required)
- Checked in `pushRec()` → goes to `recommendationItems` if missing
- Chip: "Company overview" (amber)

### Company ID (companyId)
- REQUIRED check — mirrors publishJobPost() which checks `job.companyId`
- This ensures employer has a company linked (not that the profile is complete)
- NOT the same as brand/profile completeness

### Benefits
- NOT checked at all
- Static optional chip: "Benefits optional"

### Brand details
- NOT checked at all
- Static optional chip: "Brand details optional"

### Mission / values / perks / health / leave / learning
- NOT in the DB, NOT in the job model, NOT checked anywhere in B13.
- No reference to these fields in service or components.

## Verdict
Brand/benefits NEVER block publish. Only companyId (which indicates the company account
exists and is linked) is required — and only because the existing publish gate requires it.
All brand/benefits UI signals are optional-only.
