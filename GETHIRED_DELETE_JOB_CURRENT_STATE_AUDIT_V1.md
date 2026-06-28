# GETHIRED DELETE JOB — Current State Audit V1

**Date:** 2026-06-25
**Severity:** P2 (Authorization Gap — BOLA)

---

## Finding 1: Route Was Commented Out (CRITICAL)

**File:** `routes/jobsRoute.js` line 27
**Code before fix:**
```javascript
// router.delete("/jobs/delete", deleteJob);
```

The `deleteJob` controller existed but the HTTP route was never registered. No `DELETE /job/delete` endpoint existed on the server. The FE could never reach this controller.

## Finding 2: Frontend Fell Back to Archive-as-Delete

**File:** `job/job-list/job-list.component.ts` — `deleteRow()` method
```javascript
// TODO delete
this.jobFacade.changeJobStatus(4, event.hasOwnProperty('data') ? event.data.jobId : event.jobId);
```

Because no real delete endpoint existed, the FE "delete" button archived the job (status_id = 4) via `PUT /job/changestatus`. This is not a true destructive delete.

## Finding 3: deleteJob Controller Had Secondary companyId Leak

**File:** `controllers/jobsController.js` — `deleteJob` function
```javascript
const { jobId, companyId } = req.body;          // companyId read from body
// ... ownership-scoped DELETE (correct) ...
const jobs = await getJobList(companyId);       // used caller-supplied companyId
```

The DELETE query itself had `AND company_id=$2` (correct — used callerCompany.companyId). However, the post-delete `getJobList(companyId)` call used the attacker-supplied `req.body.companyId`. An attacker could thus receive another company's job list in the response body, even though their job was not deleted.

## Finding 4: deleteJob Used Obsolete getJobList() Function

`getJobList()` uses an old schema (`company_jobs` join) that does not match the current production schema. `getBasicJobList()` is the correct function used by all other authenticated list endpoints.

## Finding 5: RETURNING Clause Missing

The DELETE query had no `RETURNING job_id`, making `rowCount` the only way to detect 0-row results. Without `RETURNING`, some drivers may report `rowCount` unreliably. Adding `RETURNING job_id` makes the contract explicit.

## Finding 6: FE Had No NgRx Path for True Delete

No `deleteJob` / `deleteJobSuccess` / `deleteJobFail` actions, effects, or reducer handlers existed. The `deleteJobPost` facade method and `deleteJob` service method were absent.

## Finding 7: FE Confirmation Dialog Copy Was Misleading

Dialog showed: "Would you like to save your progress in Delete?" — incorrect framing for a permanent delete operation.

## Finding 8: No Delete-Specific Success/Error Feedback

No toast was shown after a successful delete. Error handling for delete failure was absent.

---

## Security North Star Assessment (Pre-Fix)

| # | Question | Status |
|---|----------|--------|
| 1 | Who is the authenticated caller? | PASS (verifyAuth on most routes, but DELETE route was commented out) |
| 2 | What role does the caller have? | NOT APPLICABLE (employer role implied by company lookup) |
| 3 | What company scope? | FAIL (companyId from req.body used for response list) |
| 4 | Which job is targeted? | PASS (jobId from req.body — only an identifier, not a scope claim) |
| 5 | Does the job belong to caller's company? | PASS (AND company_id=$2 in DELETE WHERE — but route was unreachable) |
| 6 | Delete only after authorization? | MOOT (route was dead) |
| 7 | No cross-company data leak? | FAIL (getJobList with req.body.companyId) |
