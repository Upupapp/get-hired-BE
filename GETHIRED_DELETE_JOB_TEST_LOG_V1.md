# GETHIRED DELETE JOB — Test Log V1

**Date:** 2026-06-25

---

## Backend Tests (Static Code Review — No Live DB Available)

| Test | Method | Result |
|------|--------|--------|
| Route registered with verifyAuth | Code review: `router.delete("/job/delete", verifyAuth, deleteJob)` | PASS |
| req.body.companyId not destructured | Code review: `const { jobId } = req.body` | PASS |
| callerCompany derived from JWT | Code review: `getUserCompany(req.user.uid)` | PASS |
| DELETE uses AND company_id=$2 | Code review: `WHERE job_id=$1 AND company_id=$2 RETURNING job_id` | PASS |
| rowCount check before success | Code review: `if (!rowCount || rowCount === 0) { 404 }` | PASS |
| Response list uses callerCompany.companyId | Code review: `getBasicJobList(callerCompany.companyId, 0)` | PASS |
| No getJobList() (obsolete) call | Code review: not present in fixed function | PASS |
| SQL injection protection | Parameterized query ($1, $2) | PASS |

---

## Frontend Tests (Static Code Review)

| Test | Method | Result |
|------|--------|--------|
| deleteJob action created | Code review: job.actions.ts | PASS |
| deleteJobSuccess updates list | Code review: reducer `list: action.basicList` | PASS |
| deleteJobFail updates error | Code review: reducer `error: action.payload` | PASS |
| Effect calls deleteJobPost service | Code review: job.effects.ts | PASS |
| Effect normalises error shape | Code review: `body.error || body.message || fallback` | PASS |
| Facade dispatches deleteJob | Code review: `this.store.dispatch(JobAction.deleteJob({ jobId }))` | PASS |
| Service sends jobId only (no companyId) | Code review: `{ body: { jobId } }` | PASS |
| job-list dispatches deleteJobPost | Code review: `this.jobFacade.deleteJobPost(jobId)` | PASS |
| Success shows 'Job deleted.' snackbar | Code review: afterChange branch for 'deleted' | PASS |
| Error shows error message snackbar | Code review: jobError$ subscription | PASS |
| Dialog copy "This action cannot be undone." | Code review: data.message field | PASS |
| Confirmation dialog backward compat | Code review: `data.message ? ... : 'Would you like...'` | PASS |

---

## Live Test Instructions

To verify on production Linode server:

```bash
# 1. Pull and restart
cd /var/www/_work/get-hired-BE && git pull && pm2 restart gethired

# 2. Test with a real employer Firebase token:
curl -X DELETE https://api.gethired.com/job/delete \
  -H "Authorization: Bearer <FIREBASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JB_OWN_JOB_ID"}'
# Expected: 200 with refreshed list

# 3. BOLA test — supply another company's jobId:
curl -X DELETE https://api.gethired.com/job/delete \
  -H "Authorization: Bearer <FIREBASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JB_OTHER_COMPANY_JOB_ID"}'
# Expected: 404 "Job not found or you do not have access."

# 4. Verify response list does not contain other company's jobs:
# Check that 'data' array only contains jobs matching the caller's company_id
```
