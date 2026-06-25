# GetHired Recruiter Interview Hub — Scheduling Readiness Log V1

**Date:** 2026-06-25

---

## Current State

The `group_interviews` table exists with fields:
- `group_interview_id`, `group_interview_name`, `job_id`, `company_id`
- `recipients` (array of emails), `group_ids`
- `external_job_link` — a link the recruiter sends to candidates
- `created_at`, `updated_at`, `created_by`

The `createGroupInterview` service sends an email to recipients with `app_url/signup` link and the external job link.

## What "Scheduling" Currently Means

This is an **email-blast system**, not a calendar scheduling system. There are:
- No time slots
- No calendar integration
- No candidate-accepted/declined tracking (the `recipientOpened` and `recipientAnswered` fields in the service response are hardcoded `[]`)
- No Calendly/Google Calendar/Outlook integration

## Decision: No Scheduling UI in Hub

The hub explicitly does NOT include scheduling features because:
1. No real scheduling data exists in the backend
2. Faking scheduling UI would mislead users
3. The `group_interviews` email blast is a separate flow accessed via existing interview templates

## Backlog: What Would Be Needed for Real Scheduling

| Item | Required |
|------|---------|
| `interview_slots` table | datetime, duration, interviewer_uid, job_id |
| `interview_invites` table | slot_id, candidate_id, status (pending/accepted/declined) |
| Calendar integration endpoint | Google Calendar / Outlook OAuth |
| `GET /api/interview/hub` slot aggregation | count of accepted/pending per application |
| Notification infrastructure | email/push for slot reminders |

**Estimate:** 3–5 sprint weeks minimum. Not in scope for B03.
