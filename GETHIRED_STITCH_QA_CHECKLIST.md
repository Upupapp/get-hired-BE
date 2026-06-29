# GETHIRED STITCH QA CHECKLIST — RECENT DEPLOYMENT

## Contract Checks
- [x] FE JobService.getJobActionSummary URL matches BE route
- [x] FE reads res.data.job.statusId — BE provides it
- [x] FE reads res.data.summary.totalApplicants — BE provides as integer
- [x] FE reads res.data.summary.interviewQuestionsCount — BE provides as integer
- [x] FE reads res.data.actions.canView — BE provides as boolean
- [x] FE reads res.data.actions.canShare — BE provides as boolean

## Data Flow Checks
- [x] job-list passes event.data to MatDialog.data
- [x] JAC reads this.data on init
- [x] JAC calls getJobActionSummary(jobId) with this.job.jobId
- [x] Summary response overrides stale list row data
- [x] confirmDeleteJob() returns this.job to parent
- [x] Parent extracting jobId from result.jobId

## Authorization Chain
- [x] verifyAuth populates req.user.uid
- [x] getUserCompanyForRequest uses req.user.uid (not body/query)
- [x] Job query scoped to callerCompany.companyId
