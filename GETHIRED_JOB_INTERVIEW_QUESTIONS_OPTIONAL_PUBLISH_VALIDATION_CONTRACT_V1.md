# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — VALIDATION CONTRACT V1

## Date: 2026-06-25

---

## PUBLISH VALIDATION CONTRACT (POST B04)

A job can be published (`jobStatusId = 2`) when ALL of the following are present:

| Field | Required | Notes |
|---|---|---|
| `jobTypeId` | YES | e.g. Full-time / Part-time |
| `jobLevelId` | YES | e.g. Entry / Mid / Senior |
| `jobCity` | YES | Non-empty string |
| `jobCountry` | YES | Non-empty string |
| `jobDescription` | YES | Non-empty string |
| `workSetupId` | YES | e.g. Remote / On-site / Hybrid |
| `jobBanner` or `bannerFile[0]` | YES | Image URL or uploaded file |
| `companyId` | YES | Derived from JWT via `getUserCompany` (never caller-supplied) |
| `interviewQuestions` | **NO** | Optional. Zero questions is valid. |

## VALIDATION LOCATION

- **Frontend**: `publishJobPost()` in `job-create.component.ts` — `isReadyToPublish` boolean
- **Backend**: No publish-gate validation. `jobStatusId` is accepted as-is. Questions saved only when provided.

## STEPPER GATE CONTRACT

| Step | "Next" button condition |
|---|---|
| Step 1 → 2 | `initialFormValid` (initialData form VALID) |
| Step 2 → 3 | `jobInfoValid` (jobInfo form VALID) |
| Step 3 → 4 | `interviewValid` — wired to `jobInfo.statusChanges`, NOT to interview question count |
| Step 4 → Publish | `isAllowedToPublish` (subscription limit check only) + `isReadyToPublish` (field check above) |

## WHAT THIS CONTRACT DOES NOT CHANGE

- Applicant validation when submitting answers to configured questions: unchanged
- Video answer upload validation in the record-interview component: unchanged
- Employer review authorization: unchanged (company ownership via `getUserCompany`)
