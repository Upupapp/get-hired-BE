# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — VISIBILITY RULES V5
**Date:** 2026-07-01

---

## Core Visibility Matrix

| Surface | Draft Job | Published Job (empty) | Published Job (populated) |
|---|---|---|---|
| Employer create form | ✅ Show/edit | ✅ Show/edit | ✅ Show/edit |
| Employer preview | ✅ Show preview | ✅ Show preview (empty state) | ✅ Show preview |
| Draft Review Center | ✅ Show/review | ✅ Show/review | ✅ Show/review |
| Public jobs portal | ❌ Hidden | ❌ Hidden (section not shown) | ✅ Show section |
| Public job detail | ❌ Hidden | ❌ Hidden (section not shown) | ✅ Show section |
| Applicant job detail | ❌ Hidden | ❌ Hidden (section not shown) | ✅ Show section |
| Public company pages | ❌ Never | ❌ Never | ❌ Never (too granular) |
| JobPosting JSON-LD | ❌ Never | ❌ Skip | ✅ Include if populated |
| Sitemap | ❌ Never | N/A | N/A (job-level, not req-level) |
| Public search | ❌ Never | ❌ Never | ❌ Never (not a search filter) |

---

## Draft Job Rules

- Credential requirements are private employer data when job is in draft state
- BE: Draft job's certification requirement endpoint must require employer auth
- FE: Cannot show draft job credential requirements on public routes
- API: Public job detail endpoint must JOIN `jobs.job_status_id` and filter to `published` / `open` only before returning `certificationRequirements`
- Test: Public request for draft job `?include=certificationRequirements` must return `null` or empty array

---

## Published Job Rules

- If `certificationRequirements` list is empty or null: **hide section entirely**
- No empty heading. No "No credentials required" placeholder on public pages
- If list has one or more valid rows: show the full section
- Sort order: Required items first, then Preferred; within each group, sort by `displayOrder` if set, else creation order

---

## Employer Preview Rules

- Show the credential section exactly as it will appear to applicants
- Show a notice: "Applicants will see this section on the live job post"
- Show a fair-hiring reminder: "Only include credentials that are directly relevant to this role"
- Employer preview MUST show requirements even for draft jobs (it is an authenticated employer view)
- Employer preview must NOT say "GetHired Verified" or "AI Verified"

---

## Public DTO Stripping Rules

When the BE returns `certificationRequirements` on a public/applicant route:

**Strip (do not include):**
- `id` (internal DB row ID)
- `canonicalKey` (internal taxonomy)
- `displayOrder` (internal sort metadata)
- `deleted_at` (soft-delete marker)
- `created_at`, `updated_at` (internal timestamps)

**Include (public-safe):**
- `name`
- `type`
- `importance`
- `issuingAuthority` (if not null)
- `expiryRequired`
- `verificationRequired`

---

## Application Flow Visibility Rules

- Show requirements as informational context on applicant job detail
- Do NOT block application submission based on credential requirements
- Do NOT add new application validation based on credentials (unless existing system separately requires document upload — which it does not in V1)
- Do NOT auto-reject applicant
- Do NOT auto-score applicant
- Do NOT show "matched/missing" per requirement

**Acceptable applicant notice (if populated):**
> "This job lists required credentials. The employer may ask for proof during the application or interview process."

---

## Team & Access (RBAC) Visibility Rules

If Team & Access is implemented:
- View-only recruiter users: can see requirements in employer view
- Edit-job recruiter users: can edit requirements on their assigned jobs
- Assigned-job-only users: can only see/edit requirements on assigned jobs

---

## Publish Checklist Visibility Rules

- Credentials are **optional** — publish checklist must NOT block publish when no credentials are set
- Publish checklist may warn if a partially-filled row exists (e.g., name present but type missing)
- Publish checklist may warn on unsafe fair-hiring language in a credential name
- Publish checklist must NOT say credentials are required for all jobs

**Acceptable publish checklist behavior:**
> "Optional: Certifications & Licenses — Add specific credential requirements if this role requires them"

**Unacceptable:**
> "Required: Add certifications before publishing"
