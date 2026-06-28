# GETHIRED POST-PUBLISH JOB DASHBOARD — Analytics Plan V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Current Analytics (Preserved)

`talentProofAnalytics.trackTalentProofViewed('publish_success', ...)` — fires in `afterSubmit`
after a successful publish, before routing to the dashboard. UNCHANGED.

## Candidate Analytics on Dashboard — NOT Implemented

The dashboard intentionally shows NO analytics to candidates or applicant counts.
Rationale:
- Job was just published — there are no real analytics to show yet
- Showing "0 views" or "0 applicants" creates false expectations
- Showing fake/estimated numbers would violate B05 integrity rules

## Future Analytics (Backlog — Not Shipped in B05)

If real analytics data becomes available from the BE, these could be added:

| Metric | Required BE Endpoint | When to Add |
|--------|---------------------|-------------|
| Total applications received | `/job/application-count?jobId=` | When endpoint exists |
| Job views (impressions) | `/job/views?jobId=` | When tracking exists |
| Time since published | Client-side from `job.createdAt` | Now (but low value on fresh job) |

## PublicPortalAnalyticsService

`src/app/public/services/public-portal-analytics.service.ts` — UNCHANGED.
The `trackTalentProofViewed` call in `afterSubmit` continues to fire exactly as before.
No new analytics calls added in B05.
