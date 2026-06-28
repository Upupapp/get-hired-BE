# GETHIRED POST-PUBLISH PUBLIC JOB LINK — Readiness Log V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Public Job Link Implementation

**Button label:** "View public job"  
**Action:** `window.open('/jobs/details/${jobId}', '_blank', 'noopener,noreferrer')`  
**Opens in:** New tab (does not navigate away from dashboard)

## Public Route Verified

- Route: `/jobs/details/:jobId` — confirmed in `job-card.component.ts` (uses `jobs/details/${jobId}`)
- Public portal at `src/app/jobs/job-posts-details/` — confirmed existing, unchanged
- No auth guard on public routes — publicly accessible as intended

## Security Notes

- `noopener,noreferrer` flags set on `window.open` — prevents the opened page from accessing `window.opener`
- No applicant data passed via public link
- Public page renders the job post as seen by candidates — no employer data exposed

## Integrity Rule

- Link only generated when `this.jobId` is non-null (guarded in `viewPublicJob()` method)
- If jobId is absent, button click is a no-op (no navigation, no error)

## Copy Compliance

- Button label: "View public job" — ALLOWED per B05 copy rules
- No claim about how many job seekers will see it
