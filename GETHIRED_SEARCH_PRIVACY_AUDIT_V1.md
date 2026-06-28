# GETHIRED_SEARCH_PRIVACY_AUDIT_V1
_Generated: 2026-06-28_

## Public job result presenter (`presentPublicJob`)

Fields returned to **any** caller of `/api/search/public`:
- `jobId`, `title`, `companyName`, `companySlug`, `companyLogoUrl`
- `location`, `workSetup`, `employmentType`
- `salaryMin`, `salaryMax`, `salaryCurrency`
- `postedAt`

Fields explicitly **stripped** and never returned:
| Field | Why excluded |
|---|---|
| `job_description` (full) | Prevent scraping entire JD corpus; app links to detail page instead |
| `employer_contact_email` | Not a job-board standard; prevents recruiter spam harvesting |
| `employer_phone` | Same reason |
| Internal `company_id` UUID | Reduces BOLA attack surface from public API |
| `applicant_count` | Competitive intelligence; not for public |
| `view_count` | Not needed in public search result card |
| Draft / internal notes fields | Not for public |

## Applicant data in search results

`/search/public` returns **zero** applicant data. It returns job posts only.

`/search/applicant` returns a user's own saved/applied jobs. Fields returned:
- All public job fields (above) plus `savedAt`, `appliedAt`, `applicationStatus`

Fields never returned from applicant search:
- Other applicants' data (isolated by `uid` WHERE clause)
- CV URL, video URL, interview answers
- Protected characteristics (age, gender, nationality, marital status)

## Company result presenter (`presentPublicCompany`)

Returns: `companyId` (public slug, not internal UUID), `name`, `logoUrl`, `industry`, `description` (short), `jobCount`

Excluded: `contact_email`, `billing_info`, `subscription_tier`, `internal_notes`, raw `id` UUID.

## Employer applicant presenter (`presentEmployerApplicant`)

Returns: `applicantId`, `name`, `location`, `applicationStatus`, `appliedAt`, `matchScore` (if MATCH feature enabled), `skills[]`

Never returns: raw CV file URL (serves via signed URL instead in full detail view), video transcript, medical records, government IDs.

## Audit verdict
**PASS** — no PII, no raw CV/video URLs, no cross-user data, no draft jobs, no internal UUIDs leak through public search API.
