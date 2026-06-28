# Job Post Brand Context Log

## How Brand Data Appears on Job Posts
Jobs are linked to companies via `company_id` FK. When a job is displayed publicly:
1. `company_name` and `company_logo` appear on job cards and job detail headers.
2. `company_details` may appear on the job detail page (company overview section).
3. `work_setup_id` is used on job cards to show "Remote / Hybrid / On-site" badge.

## What This Implementation Changes
NOTHING about how brand data appears on job posts. All job display components are unchanged.

The Brand tab in the Company Profile workspace only lets employers SEE their current
`company_details` and `company_logo` in a candidate-facing framing. Editing still happens
on the Profile tab via the existing form, which saves via the existing `/company/update` endpoint.

## Job Create / Edit / Publish
- `employer-jobs` module: NOT TOUCHED
- Job form: NOT TOUCHED
- Job status transitions: NOT TOUCHED
- Job subscription checks: NOT TOUCHED

## Conclusion
Zero impact on job post brand context. Changes are additive display-only within the employer workspace.
