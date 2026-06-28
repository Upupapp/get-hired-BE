# GETHIRED POST-PUBLISH JOB DASHBOARD — Backlog V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Deferred Items (Not Shipped in B05)

### B05-BACKLOG-01: Real applicant count when available
**Description:** When applicants exist, show "X applicants" instead of the empty state.  
**Requires:** Applicant count from store (already available via `applicants$` but
B05 chose not to fetch them on the dashboard to keep the page fast and avoid
loading an empty list on a freshly published job).  
**Approach:** In `ngOnInit`, conditionally call `jobFacade.getApplicants(this.jobId)`;
then use `applicants$` count. Only show "No applicants yet" if count is truly zero.  
**Risk:** Low — additive change.

### B05-BACKLOG-02: Certification / license summary card
**Description:** Show certification requirements in a summary section.  
**Requires:** `job.certificationRequirements` is already in the job object (returned by `mappedJob`).  
**Risk:** Low.

### B05-BACKLOG-03: Interview management link
**Description:** Add "Manage interview questions" action card linking to `/recruiter/interview`.  
**Requires:** Verify the interview route at `/recruiter/interview` is accessible with the correct
query params for this specific job.  
**Risk:** Low — already linked from `table-control-modal.component.ts`.

### B05-BACKLOG-04: Job performance analytics
**Description:** When BE analytics endpoints exist, show real job view counts, application rate.  
**Requires:** BE endpoints for `/job/views?jobId=` and `/job/application-count?jobId=`.  
**Risk:** Low (new endpoints) — blocked on BE work.

### B05-BACKLOG-05: Share job post button
**Description:** Copy public job URL to clipboard with a single click.  
**Risk:** Low — additive.

### B05-BACKLOG-06: Dashboard route param style change
**Description:** Currently uses `?id=<jobId>` (query param). Consider migrating to
`/recruiter/jobs/dashboard/<jobId>` (path param) for cleaner URLs and standard Angular routing.  
**Requires:** Updating the route definition and all navigation calls.  
**Risk:** Low if done carefully — no other component currently links to `/recruiter/jobs/dashboard`.

### B05-BACKLOG-07: 404 / unauthorized job detection
**Description:** If a recruiter navigates to a dashboard for a job they don't own,
the BE returns 403. The current error state catches this but shows a generic message.  
**Enhancement:** Detect 403 vs network error and show appropriate message.  
**Risk:** Low.
