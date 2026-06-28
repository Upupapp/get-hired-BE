# GETHIRED F-08 — SECURITY BEST PRACTICES APPLICATION PLAN
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## OWASP API1 — BOLA (Broken Object Level Authorization)

### Principle
Every endpoint that receives an object ID must verify that the caller is authorized for that exact object.

### Application to GetHired Job Update
- `PUT /job/updatejobs` receives `jobId` in body
- Controller calls `getUserCompany(req.user.uid)` — token-derived, never body-supplied
- UPDATE query uses `WHERE job_id=$19 AND company_id=$20` — company_id is the caller's JWT-derived company, not body input
- Zero affected rows → 403 (no data returned, no information leak)

**Status: APPLIED and VERIFIED**

---

## IDOR Prevention

### Principle
Prefer ownership-scoped mutation queries. Never trust client-supplied ownership fields.

### Application
```sql
UPDATE gethired.jobs SET ... WHERE job_id=$1 AND company_id=$2
```
- `$1` = caller-supplied jobId (valid — it's the target object)
- `$2` = server-derived companyId from getUserCompany(JWT uid) — never from body

**Status: APPLIED**

---

## Deny-by-Default

### Principle
Missing auth, missing company scope, unsupported role, invalid job ID, wrong company, missing job, or failed affected-row check must not update anything.

### Application
| Failure Condition | Response |
|-------------------|----------|
| Missing/invalid Bearer token | 403 "Unauthorized" from verifyAuth middleware |
| getUserCompany returns [] or null | 403 "You don't have permission to update this job." |
| Job ID not found OR company mismatch | 403 (zero rows from WHERE id=$19 AND company_id=$20) |
| DB error | 500 with generic message |

**Status: APPLIED**

---

## Trusted Server-Side Scope

### Principle
Never trust company_id, employer_id, user_id, created_by, role, or ownership fields from request body/query.

### Application
The updateJob controller ignores any `companyId` or `company_id` that might appear in `req.body`. It destructures only content fields (jobTitle, industryId, etc.) and uses `callerCompany.companyId` derived from JWT.

Protected fields that are destructured but NEVER updated in the SET clause:
- `job_id` (immutable)
- `company_id` (locked to WHERE, never SET)
- `created_at` (not in SET)

**Status: APPLIED**

---

## Mass Assignment Prevention

### Principle
Allowlist mutable update fields. All other fields are implicitly rejected.

### Application
The UPDATE query has an explicit field list in SET:
```
job_banner, job_title, industry_id, job_role_id, job_type_id,
job_level_id, job_description, job_duties, work_setup_id,
salary_minimum, salary_maximum, rate, job_address, job_city,
job_category_id, job_country, job_status_id, salary_currency
```

Protected/blocked from update:
- `company_id` — only in WHERE, never SET
- `job_id` — immutable
- `created_by`, `created_at` — not in SET
- `is_featured`, `is_deleted` — not in SET
- Any MATCH/applicant/payment fields — not in the jobs table's SET clause

**Status: APPLIED**

---

## Child-Table Authorization

### Principle
Any replacement/update of job child records must occur ONLY after parent job ownership is proven.

### Application

#### saveJobArray (badges, requirements, skills, tags, certifications, etc.)
- Called AFTER the ownership-scoped UPDATE (line 347 in jobsController.js)
- Only called if `rows.length > 0` — i.e., ownership was confirmed
- Deletes use `DELETE FROM job_badges WHERE job_id=$1` — job_id is the same ID that was verified by ownership check
- The jobId was confirmed to belong to callerCompany.companyId by the UPDATE WHERE clause

#### interviewQuestionsUpdate (per-question updates)
- Called AFTER saveJobArray, still inside the ownership-confirmed branch
- Now passes `callerCompany.companyId` through to `updateQuestionById`
- `updateQuestionById` now includes defence-in-depth: `WHERE template_question_id=$6 AND job_interview_template_id IN (SELECT ... WHERE company_id=$7)`

**Status: APPLIED with defence-in-depth hardening added this sprint**

---

## No Information Leakage

### Principle
Unauthorized and not-found cases must return safe 404/403 without leaking whether another company's job exists.

### Application
- Zero-row check returns 403 regardless of whether the job doesn't exist or belongs to another company
- Message is generic: "You don't have permission to update this job."
- No job data is returned in 403 responses

**Status: APPLIED**

---

## Frontend Security Principles

### No Fake Success
- Error states from backend clear the loading spinner but do not clear the form
- Success dialog is only shown after `saveJobSuccess` action (i.e., backend 200)
- Form data is never cleared before backend success

### Secure Copy
- Frontend displays user-safe messages: never exposes "company_id mismatch", "permission denied for company X", or internal field names
- 403 → "We couldn't update this job. It may no longer exist or you may not have access."
- 400 → "Please review the highlighted fields."
- 500 → "We couldn't update this job. Try again."

**Status: APPLIED**
