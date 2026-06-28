# GETHIRED POST-PUBLISH CERTIFICATION / LICENSE PRESERVATION LOG V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Certification Requirements v1 — Status

The certification/license requirements feature (v1) is implemented in:
- `job-create.component.ts` lines 292-307: `certificationRequirements` FormArray in `setFormGroup()`
- `job-create.component.ts` `formatJob()`: passes `certificationRequirements` to the payload
- `jobsController.js` `createJobs()`: receives and passes `certificationRequirements` to `saveJobArray()`

## This Mission's Impact: NONE

- `setFormGroup()` — UNCHANGED
- `formatJob()` — UNCHANGED
- `certificationRequirements` FormGroup structure — UNCHANGED
- `saveJobArray()` BE call — UNCHANGED
- The `certificationRequirements` field is still included in the job payload on both create and edit

## Dashboard Display

The dashboard does NOT display certification requirements.
Rationale: The dashboard is a command-center overview. Certification details
are part of the full job spec visible via "View public job" or "Edit job post".
Adding them to the dashboard would require additional UI complexity without
adding recruiter value at this stage.

## Backlog Item

If desired, a "Requirements summary" section on the dashboard showing
certification/license requirements could be added in a future iteration.
See `GETHIRED_POST_PUBLISH_JOB_DASHBOARD_BACKLOG_V1.md`.
