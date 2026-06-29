# GETHIRED STITCH INTEGRATION MATRIX — RECENT DEPLOYMENT

## Integration Points

| Consumer | Provider | Method | Contract | Status |
|---|---|---|---|---|
| table-control-modal.ts | JobService.getJobActionSummary | RxJS subscribe | res.data.{job,summary,actions} | VERIFIED |
| JobService | BE /job/action-summary | HTTP GET | Query: jobId, Header: Bearer | VERIFIED |
| jobsRoute | verifyAuth middleware | Express route | req.user.uid populated | VERIFIED |
| getJobActionSummary | getUserCompanyForRequest | Controller call | returns {companyId} | VERIFIED |
| getJobActionSummary | dbQuery.query | Parameterized SQL | $1=jobId, $2=companyId | VERIFIED |
| job-list.afterClosed | table-control-modal.dialogRef.close | MatDialog | result = this.job or null | VERIFIED |
| deleteRow | jobFacade.deleteJobPost | NgRx dispatch | jobId extracted from result | VERIFIED |
| job-posts-details template | isPrivacyBoilerplate() | Template call | string arg, boolean return | VERIFIED (build) |

## Anti-Corruption Boundaries

| Boundary | Rule | Enforced |
|---|---|---|
| FE→BE auth | Only Firebase token accepted for identity | YES (verifyAuth) |
| FE→BE company | companyId never trusted from client | YES (getUserCompanyForRequest) |
| BE→FE PII | No applicant names/emails in response | YES (COUNT only) |
| FE→template | No unsafe innerHTML binding | YES (all interpolation safe) |
