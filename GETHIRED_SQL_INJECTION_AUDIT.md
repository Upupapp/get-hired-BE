# GETHIRED SQL INJECTION AUDIT — RECENT DEPLOYMENT

## Queries in getJobActionSummary

### Query 1: Job lookup
```sql
SELECT j.job_id, j.job_title, ... FROM schema.jobs j
LEFT JOIN ... WHERE j.job_id = $1 AND j.company_id = $2
```
Parameters: [jobId, callerCompany.companyId]
jobId is req.query.jobId — UNTRUSTED but parameterized → SAFE ✅

### Query 2: Applicant count
```sql
SELECT COUNT(*) AS total FROM schema.job_applicants WHERE job_id = $1
```
Parameters: [jobId]
SAFE ✅

### Query 3: Interview questions count
```sql
SELECT COUNT(*) AS total FROM schema.interview_template_question itq
JOIN schema.job_interview_template jit ON jit.template_id = itq.template_id
WHERE jit.job_id = $1
```
Parameters: [jobId]
SAFE ✅

**Result: NO SQL INJECTION VECTORS IN RECENT DEPLOYMENT ✅**
