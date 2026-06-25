# GetHired Recruiter Interview Hub — Current State Audit V1

**Date:** 2026-06-25
**Phase:** B03 discovery (pre-implementation)

---

## 1. Exact Route Before This Change

| Layer | Value |
|-------|-------|
| Route path | `/recruiter/interview` |
| Module | `employer-interview.module.ts` lazy-loaded via `EmployerPanelModule` |
| Component rendered | `EmployerInterviewComponent` |
| Template | `<app-under-construction></app-under-construction>` |
| Nav item | MISSING — sidebar had no "Interviews" entry |

---

## 2. Existing Interview-Related DB Tables Found

| Table | Schema | Key Columns | Notes |
|-------|--------|-------------|-------|
| `job_interview_template` | gethired | `job_interview_template_id`, `company_id`, `job_id`, `created_by` | One template per job |
| `interview_template_question` | gethired | `template_question_id`, `job_interview_template_id`, `template_question`, `template_answer_duration`, `template_question_retakes`, `sequence` | Questions for each template |
| `group_interviews` | gethired | `group_interview_id`, `company_id`, `job_id`, `recipients`, `external_job_link` | Scheduled group interview sessions |
| `interview_answers` | gethired | `interview_answer_id`, `question_id`, `answer_url`, `created_at`, `job_id`, `applicant_id` | FK: `applicant_id` → `applicants_profile.applicant_profile_id` |

---

## 3. Existing Application/Applicant DB Tables Found

| Table | Schema | Key Columns |
|-------|--------|-------------|
| `job_applicants` | gethired | `job_application_id`, `job_id`, `candidate_id`, `application_status_id`, `date_applied`, `updated_at`, `is_archived` |
| `job_applicant_status` | gethired | `job_applicant_status_id`, `job_applicant_status_name` |
| `applicants_profile` | gethired | `applicant_profile_id`, `user_id` (FK → users.uid) |
| `users` | gethired | `uid`, `first_name`, `last_name`, `email`, `photo_url` |

Status values seeded:

| ID | Name |
|----|------|
| 1 | Pending Review |
| 2 | Applied |
| 3 | Under Review (set when interviewAnswers.length > 0 on apply) |
| 4 | Shortlisted |
| 5 | Rejected |
| 6 | Hired |

---

## 4. Existing API Endpoints for Interviews, Applications, Video Answers

### Interview endpoints (interviewRoute.js)
- `GET /api/interview/getlistbyuser`
- `GET /api/interview/getall?companyId=` — all group interviews for company
- `GET /api/interview/getalltemplates?companyId=` — all interview question templates
- `GET /api/interview/getallrecipients?companyId=`
- `GET /api/interview/gettemplatequestions?templateId=`
- `POST /api/interview/savegroupinterview`
- `POST /api/interview/savequestiontemplate`
- `PUT /api/interview/updatejobinterview`

### Job/applicant endpoints (jobsRoute.js)
- `GET /api/job/applicants?id=<jobId>` — all applicants for a specific job (requires employer auth + company ownership)
- `GET /api/job/applicantdetails?jobId=&id=<candidateId>` — full profile + interview answers + docs for one applicant

### Application endpoints (applicationRoute.js)
- `POST /api/application/apply` — submit application with video answers
- `GET /api/job/applicant/snapshot-summary?applicationId=` — completeness snapshot for employer

### Video answer path in apply flow
When an applicant submits with `interviewAnswers.length > 0`:
1. `applicationStatusId = 3` ("Under Review") stored in `job_applicants`
2. Answers stored in `interview_answers` table with `answer_url` (Cloud Storage URLs)

---

## 5. What Data IS Available for an Interview Hub

- All applications for company's jobs (company-scoped via `jobs.company_id`)
- Applicant display name (from `users.first_name`/`last_name`)
- Application status (from `job_applicant_status`)
- Whether video answers exist (count from `interview_answers`)
- Job title (from `jobs.job_title`)
- Date applied / last activity

---

## 6. What Is NOT Available (Backlog)

- **Interview scheduling** — `group_interviews` table exists but has no calendar/slot/invite-accepted data; no scheduling UI
- **Scorecard / recruiter notes** — no table exists
- **Interview stage progression tracking** — no dedicated stage table, only `job_applicant_status` (6 coarse statuses)
- **Video playback within hub** — video URLs exist in `interview_answers.answer_url` but the hub shows count only; full review is via contacts/candidate-list
- **Real-time notification on new answers** — no websocket or push infrastructure

---

## 7. Implementation Path Chosen

**Option B** — new thin BE endpoint `GET /api/interview/hub`
Rationale: No existing single endpoint returns company-scoped applications with video-answer counts. Aggregating N per-job calls in the FE would be too expensive and complex. The new endpoint joins `job_applicants`, `jobs`, `users`, `job_applicant_status`, and a `interview_answers` subquery in one query.
