# GetHired — Public Job Detail Page: Current-State Audit V6
Generated: 2026-06-28 | Command: GETHIRED_PUBLIC_JOB_DETAILS_AND_JOB_POSTING_EXPERIENCE_FULLSTACK_V6

## Component: job-posts-details

### Pre-V6 State (baseline before this session)
| Aspect | Pre-V6 |
|--------|---------|
| Layout | Single-column, all content in one Bootstrap card |
| Heading | H5 for job title (accessibility violation) |
| Hero | CSS gradient OR real image (V3); text overlaid |
| Hero company ID | None |
| Apply CTA | Small button, right-column col-3 only |
| Sticky panel | None |
| Mobile bar | None |
| Quick facts | Buried in hero description text (plain text) |
| Save job | Not implemented (savedStatus: 'unknown') |
| Share button | <img> tag with click handler (inaccessible) |
| Match disclaimer | Missing (required by V6 command) |
| Benefits | No separate section |
| Hiring process | Missing |
| Safety section | Missing |
| Application preview | Missing |
| Section headings | H5 with <strong> for section names |

### Post-V6 State (this session)
| Aspect | V6 |
|--------|-----|
| Layout | Two-column: col-lg-8 main + col-lg-4 sticky rail |
| Heading | H1 for job title, H2 for sections, H3 for subsections |
| Hero | Company logo + name in overlay (both image/CSS variants) |
| Quick facts | 7-item snapshot grid (type/setup/location/salary/level/industry/company size) |
| Sticky panel | .gh-apply-card: company logo, salary, apply CTA, save, share |
| Mobile bar | Fixed bottom bar, slides up after 300px scroll |
| Save job | Fully wired: saved_jobs table + BE endpoint + FE toggle + optimistic UI |
| Share button | <button> with aria-label |
| Match disclaimer | Added: "...score is not an automated rejection or approval" |
| Benefits | Own section from nJob.benefits[] |
| Hiring process | 3-4 step timeline with numbered dots |
| Safety section | Shield icon, no-fees notice, report-job button (toast) |
| Application preview | Resume required + video interview Q count |
| Section headings | H2 semantic headings throughout |

## Backend: saved_jobs table
- Table: gethired.saved_jobs (applicant_uid, job_id, UNIQUE(applicant_uid, job_id))
- Service: savedJobsService.js (getSavedJobStatus, toggleSavedJob)
- Endpoint: POST /job/save (verifyAuth)
- GET /job/details response: now includes isSaved boolean
- Migration applied: 2026-06-28 on production

## Files changed
### FE (commit 9b99522)
- src/app/jobs/job-posts-details/job-posts-details.component.html — full rewrite
- src/app/jobs/job-posts-details/job-posts-details.component.ts — save/scroll/description methods
- src/app/jobs/job-posts-details/job-posts-details.component.scss — V6 layout classes
- src/app/jobs/jobs.service.ts — toggleSaveJob()
- src/app/public/services/public-job-normalizer.service.ts — savedStatus from isSaved

### BE (commit 5d3f39e)
- services/savedJobsService.js — new
- db/20260628_saved_jobs_table.sql — new
- controllers/jobsController.js — isSaved + toggleSaveJobHandler
- routes/jobsRoute.js — POST /job/save
