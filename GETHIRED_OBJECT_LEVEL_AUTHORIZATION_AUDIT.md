# GETHIRED OBJECT LEVEL AUTHORIZATION AUDIT — RECENT DEPLOYMENT

## New endpoint: GET /job/action-summary

| Parameter | Type | Trusted | Authorization Method |
|---|---|---|---|
| jobId (query) | string | NO — untrusted | Parameterized $1 in SQL |
| companyId | - | NOT FROM CLIENT | getUserCompanyForRequest (server-derived) |
| uid | - | NOT FROM CLIENT | req.user.uid from verifyAuth |

### Authorization flow:
1. verifyAuth → req.user.uid (trusted, from Firebase token)
2. getUserCompanyForRequest(req, uid) → callerCompany.companyId (trusted, from DB)
3. WHERE j.job_id = $1 AND j.company_id = $2
   - $1 = req.query.jobId (untrusted but parameterized — SQL safe, returns 404 if wrong)
   - $2 = callerCompany.companyId (trusted server-derived)
4. Cross-company access → job_id mismatch with company_id → 0 rows → 404

**Result: OBJECT-LEVEL AUTHORIZATION VERIFIED ✅**
No BOLA vulnerability in new endpoint.
