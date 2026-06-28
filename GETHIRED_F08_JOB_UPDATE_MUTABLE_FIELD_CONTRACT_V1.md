# GETHIRED F-08 — MUTABLE FIELD / MASS ASSIGNMENT CONTRACT
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Route: PUT /job/updatejobs

### ALLOWLISTED — Mutable Fields (accepted from req.body and written to DB)

| Body Field | DB Column | Notes |
|------------|-----------|-------|
| `jobBanner` / `bannerFile` | `job_banner` | URL or file upload |
| `jobTitle` | `job_title` | |
| `industryId` | `industry_id` | |
| `jobRoleId` | `job_role_id` | |
| `jobTypeId` | `job_type_id` | |
| `jobLevelId` | `job_level_id` | |
| `jobDescription` | `job_description` | |
| `jobDuties` | `job_duties` | |
| `workSetupId` | `work_setup_id` | |
| `salaryMinimum` | `salary_minimum` | |
| `salaryMaximum` | `salary_maximum` | |
| `rate` | `rate` | |
| `jobAddress` | `job_address` | |
| `jobCity` | `job_city` | |
| `jobCategoryId` | `job_category_id` | |
| `jobCountry` | `job_country` | |
| `jobStatusId` | `job_status_id` | Status (draft/published) |
| `salaryCurrency` | `salary_currency` | |

### ALLOWLISTED — Child Array Fields (processed via saveJobArray)

| Body Field | Child Table | Notes |
|------------|-------------|-------|
| `badges` | `job_badges` | Delete-and-reinsert |
| `requirements` | `job_requirement` | Delete-and-reinsert |
| `goodToHave` | `job_goodtohave` | Delete-and-reinsert |
| `educationalBackground` | `job_educationalbackground` | Delete-and-reinsert |
| `skills` | `job_skills` | Delete-and-reinsert |
| `tags` | `job_tags` | Delete-and-reinsert |
| `certificationRequirements` | `job_certification_requirement` | Delete-and-reinsert; blank names filtered |
| `interviewQuestions` | `interview_template_question` | Update by questionId or create new |
| `interviewTemplateId` | `job_interview_template` | Template reference |

---

## PROTECTED — Never Written via updateJob

| Field | Reason |
|-------|--------|
| `company_id` | Ownership field — locked in WHERE, never in SET |
| `job_id` | Immutable identifier — only in WHERE |
| `created_at` | System timestamp — never in SET |
| `created_by` | Creator ID — never in SET |
| `is_featured` | Admin-only flag |
| `is_deleted` / deleted flags | Not in SET |
| `updated_at` | Should be server-set via trigger or now() — not in current SET (gap: deferred to backlog) |
| payment/subscription fields | Not in jobs table |
| MATCH scoring fields | Not in jobs table |
| applicant/application fields | Not in jobs table |
| `employer_id` / `recruiter_id` | No such column in jobs; ownership is company_id |

---

## Mass Assignment Risk Assessment

**Risk: NONE** — The controller uses explicit destructuring, not `req.body` spread:
```js
const {
  jobBanner, bannerFile, jobTitle, industryId, /* ... */
} = req.body;
```

Only named fields are extracted and only the explicitly listed parameters are passed to the parameterized query. Any extra fields in `req.body` (company_id, created_by, is_admin, etc.) are silently ignored.

---

## Route: PUT /job/changestatus

| Allowed | Blocked |
|---------|---------|
| `status` (new status ID) | All other fields |
| `jobId` (target job) | `company_id` (derived from JWT) |

---

## Route: DELETE /job/deleteinterviewquestion

| Allowed | Blocked |
|---------|---------|
| `questionId` (query param) | Company identity (derived from JWT) |
| `jobId` (for resequencing) | Template ownership (verified via subquery) |
