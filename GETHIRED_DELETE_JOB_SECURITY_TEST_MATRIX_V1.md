# GETHIRED DELETE JOB — Security Test Matrix V1

**Date:** 2026-06-25

---

## Test Matrix

| # | Test Case | Method | Expected | Verify |
|---|-----------|--------|----------|--------|
| T1 | Delete own job | DELETE /job/delete with valid token, valid jobId owned by caller | 200 + refreshed list | Job gone from list |
| T2 | Delete job belonging to another company | Valid token, jobId from Company B while caller is Company A | 404 "Job not found or you do not have access." | Job not deleted |
| T3 | Attempt to leak another company's list via companyId | Include companyId: "OTHER_CO" in req.body | Response list scoped to caller's company only | Cannot see OTHER_CO jobs |
| T4 | Delete with no auth token | No Authorization header | 403 "Unauthorized" (verifyAuth) | Request rejected before controller |
| T5 | Delete with expired token | Expired Firebase token | 403 "Token Expired. Login again." | Request rejected |
| T6 | Delete non-existent job | Valid token, made-up jobId | 404 "Job not found or you do not have access." | No crash |
| T7 | Delete with empty jobId | req.body.jobId = "" | DELETE WHERE job_id='' AND company_id=... → 0 rows → 404 | No crash, no leak |
| T8 | Delete with null jobId | req.body.jobId = null | rowCount=0 → 404 | No crash |
| T9 | SQL injection in jobId | req.body.jobId = "'; DROP TABLE jobs;--" | Parameterized query — no injection | Query param treated as string |
| T10 | Double-delete race | Two simultaneous DELETE requests for same job | First succeeds (200), second returns 404 | Idempotent, no error |
| T11 | Authenticated attacker, spoofed companyId in body | companyId from req.body completely ignored | Response list is always caller's company | Confirmed by code review |
| T12 | Verify response list is correct | After delete, list should not contain deleted jobId | 200 data array does not include deleted job | Verified against DB |

---

## BOLA Attack Surface (Post-Fix)

| Attack Vector | Blocked By |
|---------------|------------|
| Supply different companyId in body | req.body.companyId not read |
| Supply jobId from another company | AND company_id=callerCompany.companyId in WHERE |
| No token | verifyAuth middleware |
| Expired token | verifyAuth middleware (Firebase verifyIdToken) |
| SQL injection via jobId | Parameterized query ($1 placeholder) |
| Information leak via error message | 404 for both "not found" and "wrong company" — no existence disclosure |
