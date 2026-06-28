# GETHIRED DELETE JOB — Regression QA V1

**Date:** 2026-06-25

---

## What Changed

1. `routes/jobsRoute.js` — new route added
2. `controllers/jobsController.js` — deleteJob function changed
3. `src/app/job/state/job.actions.ts` — new actions added (additive)
4. `src/app/job/state/job.effects.ts` — new effect added (additive)
5. `src/app/job/state/job.reducer.ts` — new reducer handlers added (additive)
6. `src/app/job/state/job.facade.ts` — new method added (additive)
7. `src/app/job/job.service.ts` — new method added (additive)
8. `src/app/job/job-list/job-list.component.ts` — deleteRow changed
9. `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html` — body text conditionally changed

---

## Regression Risks

| Area | Risk | Mitigation |
|------|------|-----------|
| Confirmation dialog used by other flows | Low — added `data.message` fallback only; callers that don't pass `message` see original text | Code verified: `data.message ? data.message : 'Would you like...'` |
| `afterChange` in job-list | Low — added new `deleted` branch before existing `archived` branch | Existing `archived` branch untouched |
| NgRx state shape | None — new actions/handlers are additive; `list` field type unchanged | Reducer spreads state |
| BE job list endpoint | Low — `getBasicJobList` is the existing production function used by `/job/basiclist` | Same function, same response shape |
| Route conflict | None — `/job/delete` is a new DELETE route, no existing DELETE routes | Verified in jobsRoute.js |
| FE service `deleteJobPost` | None — new method, no existing method renamed | |
| FE `changeJobStatus(4, ...)` (archive) still works | PASS — unchanged; only the "delete" button in the control modal now dispatches deleteJob instead of changeJobStatus | Archive via status change still reachable from other UI paths |

---

## Existing Flows Not Touched

- Create job
- Update job
- Publish/archive via status change
- Interview question delete
- Applicants list
- Job details view
- Public job listings
- Application submission
- Firebase auth
- JobCompatibilityService / MATCH scoring

---

## Regression Test Checklist

- [ ] Job creation still works
- [ ] Job update still works  
- [ ] Job status change (publish, archive) still works
- [ ] Delete interview question still works
- [ ] View applicants still works
- [ ] Delete job (new) works end-to-end
- [ ] Confirmation dialog shows original text for non-delete flows (e.g. if used elsewhere)
- [ ] Job list refreshes correctly after delete
