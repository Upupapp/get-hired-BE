# GETHIRED DELETE JOB — Fix Log V1 (Comprehensive)

**Date:** 2026-06-25
**Sprint:** P2 Security Fix — deleteJob BOLA

---

## Summary of All Changes

### Backend Changes

**`routes/jobsRoute.js`**
- Uncommented and registered `router.delete("/job/delete", verifyAuth, deleteJob)`
- Note: path is `/job/delete` (not `/jobs/delete` from the old comment) to match existing `/job/*` prefix

**`controllers/jobsController.js` — deleteJob function**
- Removed `companyId` from `req.body` destructuring
- Added `RETURNING job_id` to DELETE query
- Changed `rowCount === 0` response from 403 to 404
- Changed `getJobList(companyId)` → `getBasicJobList(callerCompany.companyId, 0)`
- Updated comments to document the P2 fix

### Frontend Changes

**`src/app/job/state/job.actions.ts`**
- Added enum values: `DeleteJob`, `DeleteJobSuccess`, `DeleteJobFail`
- Added action creators: `deleteJob`, `deleteJobSuccess`, `deleteJobFail`

**`src/app/job/state/job.effects.ts`**
- Added `deleteJob$` effect calling `jobService.deleteJobPost(action.jobId)`
- Error handling normalises 404 `{ error }` and 403 `{ message }` to string

**`src/app/job/state/job.reducer.ts`**
- Added handlers: `deleteJob` (loading), `deleteJobSuccess` (list + succesMsg='deleted'), `deleteJobFail` (error)

**`src/app/job/state/job.facade.ts`**
- Added `deleteJobPost(jobId)` dispatching `JobAction.deleteJob({ jobId })`

**`src/app/job/job.service.ts`**
- Added `deleteJobPost(jobId)` calling `DELETE /job/delete` with `{ body: { jobId } }`
- Never sends companyId

**`src/app/job/job-list/job-list.component.ts`**
- `deleteRow()`: replaced `changeJobStatus(4, jobId)` with `jobFacade.deleteJobPost(jobId)`
- `deleteRow()`: updated confirmation dialog data to include `message: 'This action cannot be undone.'`
- `afterChange()`: added `'deleted'` branch — shows "Job deleted." snackbar
- `ngOnInit` error subscription: improved message handling for delete-specific errors

**`src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html`**
- Body text: shows `data.message` when present, otherwise falls back to original text
- Backward-compatible change — no existing callers break

---

## Files Changed: 9 total

BE: 2 files
FE: 7 files
