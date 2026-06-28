# GETHIRED F-08 — SECURITY TEST MATRIX (50 SCENARIOS)
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Category 1: Authentication (10 tests)

| # | Test | Input | Expected |
|---|------|-------|----------|
| T01 | No Authorization header | PUT /job/updatejobs without Bearer | 403 |
| T02 | Malformed token | Bearer invalid_token_xyz | 403 |
| T03 | Expired Firebase token | PUT with expired token | 403 "Token Expired" |
| T04 | Valid token, valid job, own company | Normal update | 200 |
| T05 | Valid token, job belongs to other company | jobId from company B | 403 |
| T06 | Valid token, jobId that does not exist | Random nonexistent jobId | 403 |
| T07 | changestatus — no auth | PUT /job/changestatus without Bearer | 403 |
| T08 | changestatus — valid own job | Own job status change | 200 |
| T09 | changestatus — other company job | Other company jobId | 403 |
| T10 | deleteinterviewquestion — no auth | DELETE without Bearer | 403 |

---

## Category 2: BOLA / IDOR Vectors (15 tests)

| # | Test | Input | Expected |
|---|------|-------|----------|
| T11 | Sequential ID guess | jobId+1 from another company | 403 |
| T12 | Body-spoofed company_id | req.body.company_id from different company | 200 — body value ignored, JWT used |
| T13 | Body-spoofed companyId (camel case) | req.body.companyId different | Ignored — same result as own company job |
| T14 | employer_id in body | req.body.employer_id | Ignored — no such column in SET |
| T15 | created_by in body | req.body.created_by | Ignored — not in SET |
| T16 | user_id in body | req.body.user_id | Ignored — not in SET |
| T17 | Admin user updating employer job | Admin JWT | 403 if admin not in company_employees |
| T18 | Applicant user token | Applicant JWT | 403 (no company_employees row) |
| T19 | Cross-company job child skills update | Same attack as T05 | 403 (never reaches saveJobArray) |
| T20 | Cross-company interview question update | Other company's questionId via updatejobs | 403 (parent gate) |
| T21 | question update with own company ID but other company question | companyId valid but questionId foreign | 0 rows from subquery → throws |
| T22 | changestatus — body company_id spoofed | Different companyId in body | 403 (getUserCompany never reads body) |
| T23 | Valid job, user removed from company | uid no longer in company_employees | 403 (getUserCompany returns []) |
| T24 | Archived job update (own company) | jobStatusId=4 job | 200 (update allowed) |
| T25 | Published job update (own company) | jobStatusId=2 job | 200 |

---

## Category 3: Mass Assignment (10 tests)

| # | Test | Input | Expected |
|---|------|-------|----------|
| T26 | is_featured in body | req.body.is_featured = true | Ignored — not in SET |
| T27 | is_deleted in body | req.body.is_deleted = true | Ignored |
| T28 | payment fields in body | req.body.subscription_id | Ignored |
| T29 | MATCH score in body | req.body.match_score | Ignored |
| T30 | id in body | req.body.id = 1 | Ignored |
| T31 | created_at in body | req.body.created_at = '2020-01-01' | Ignored |
| T32 | Extra unknown fields | req.body.foo = 'bar' | Ignored |
| T33 | Status upgrade via body override | req.body.jobStatusId = 2 (publish) in updatejobs | Accepted (intentional — updatejobs allows status change) |
| T34 | company_id in URL param | ?company_id=OTHER | Ignored — not read by controller |
| T35 | Multiple ownership fields in body | company_id + employer_id + created_by | All ignored |

---

## Category 4: Child-Table Hardening (10 tests)

| # | Test | Input | Expected |
|---|------|-------|----------|
| T36 | Skills update for own job | Legitimate skills array | 200 |
| T37 | Skills update for other company job | Attack via updatejobs | 403 (parent gate) |
| T38 | Interview question update for own job | Valid questionId, own company | 200 |
| T39 | Interview question update for other company question | Other company's questionId + own jobId | 0 rows from company_id subquery → error |
| T40 | Certification requirements update own job | Valid certs | 200 |
| T41 | Blank-name certification item | name="" or name=null | Filtered, not inserted (existing guard) |
| T42 | Delete interview question own company | Valid questionId | 200 |
| T43 | Delete interview question other company | Foreign questionId | 403 (subquery gate) |
| T44 | Interview questions not supplied | interviewQuestions omitted | saveJobArray only, no question update |
| T45 | interviewTemplateId null | No existing template | New template created in company context |

---

## Category 5: Regression (10 tests)

| # | Test | Expected |
|---|------|----------|
| T46 | Create job → works for authorized employer | 200 |
| T47 | Publish job (status=2) via updatejobs | 200 — status_id=2 stored |
| T48 | Save draft (status=1) via updatejobs | 200 — status_id=1 stored |
| T49 | Public job detail (GET /job/details) unaffected | 200 — no auth required |
| T50 | Applicant application submission unaffected | Application flow untouched |
| B04 | Publish without interview questions | Allowed — B04 rule preserved |
| B05 | Post-publish navigation to dashboard | /recruiter/jobs/dashboard?id=<jobId> |
| B13 | Job readiness bar shown in builder | Visible on all steps except preview |
| R01 | changestatus archive → job becomes archived | 200 — status_id=4 |
| R02 | MATCH signals endpoint unaffected | GET /job/applicants/signals returns data |

---

## Test Verification Status

Tests T01–T25 (Auth + BOLA): Verified via code review — ownership gate confirmed in source.  
Tests T26–T35 (Mass assignment): Verified via code review — explicit destructuring, no spread.  
Tests T36–T45 (Child tables): Verified via code review — implicit + explicit gates confirmed.  
Tests T46–R02 (Regression): Verified via code review — no changes to create/public/applicant flows.  

Manual/integration test execution: Deferred (no test framework with live DB available). See TEST_LOG file.
