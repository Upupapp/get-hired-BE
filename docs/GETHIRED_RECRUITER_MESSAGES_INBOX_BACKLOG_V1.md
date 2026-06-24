# GETHIRED_RECRUITER_MESSAGES_INBOX_BACKLOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Priority 1 — Schema (Unread Support)

### B01-BACKLOG-01: Add is_read / recruiter_last_read_at to message_threads
- Impact: enables "Unread" filter, unread count badge, mark-as-read on thread open
- Approach: ALTER TABLE gethired.message_threads ADD COLUMN recruiter_last_read_at TIMESTAMP
- New endpoint needed: PATCH /api/messages/thread/:threadId/read
- New FE: call markRead when thread is selected in inbox
- No breaking change to existing thread/messages flow

## Priority 1 — Applicant Name Display

### B01-BACKLOG-02: Enrich thread summary with applicant display name
- Impact: thread row shows "Jane Doe" instead of "Candidate AB1C2D"
- Approach: JOIN gethired.user_credentials OR gethired.applicant_profiles on applicant_uid in listRecruiterThreads SQL
- Caution: must use displayable name only (no email, phone, private fields)
- Update RecruiterThreadSummary interface: add applicantName: string | null

## Priority 2 — Deep-Link Context

### B01-BACKLOG-03: Deep-link "View applicant" from thread detail
- Block: applicantUid ≠ applicantProfileId; thread summary does not have applicantProfileId
- Approach: add applicantProfileId to thread summary via JOIN to applicant_profiles on applicant_uid
- Then: link to /recruiter/jobs/applicants?id=[jobId] (and select applicant)

### B01-BACKLOG-04: Deep-link "Review application" from thread detail
- Block: applicationId not in thread summary
- Approach: JOIN job_applicants on (job_id, applicant_uid) to get applicationId
- Low priority (applicants page already reachable via "Review applicants" CTA)

### B01-BACKLOG-05: Deep-link "Review video answers" from thread detail
- Block: same as BACKLOG-04 (applicationId needed)
- Low priority

## Priority 2 — Filter Enhancement

### B01-BACKLOG-06: "By Job" filter
- Implementation: add jobId query param support to GET /api/messages/recruiter/threads
- FE: add "By Job" dropdown/chip; pass ?jobId=X to API
- Low priority — single-job filter useful for large company accounts

## Priority 3 — Accessibility

### B01-BACKLOG-07: Filter chips min-height 44px for strict touch target compliance
- Filter chips currently ~32px height; not blocking (they're supplementary controls)
- Fix: add min-height: 44px to .rm-chip

### B01-BACKLOG-08: role="alert" on inline send-failed error
- Currently inline text appears but is not announced immediately by screen readers
- Fix: add role="alert" to .msg-thread-inline-error in message-thread.component.html

### B01-BACKLOG-09: aria-describedby on disabled send button
- Add "Write a message before sending." helper text connected to button via aria-describedby
- Helps screen reader users understand why button is disabled

### B01-BACKLOG-10: Focus management on thread selection
- After selecting a thread with keyboard, focus should move to detail panel header
- Current: focus stays on thread row
- Fix: ViewChild on detail header, call .focus() after selectedThread is set

## Priority 3 — Feature Expansion

### B01-BACKLOG-11: Application status chip in thread row
- applicationStatus not returned by thread summary (no JOIN to job_applicants)
- Add: JOIN job_applicants on (job_id, applicant_uid) to get latest status label

### B01-BACKLOG-12: Thread archiving / dismiss
- Ability for recruiter to hide a thread from inbox without deleting messages
- Requires: is_archived column on message_threads + archive endpoint

### B01-BACKLOG-13: /recruiter/messages/:threadId URL support
- Direct deep-link to a specific thread (shareable URL)
- Requires: child route; load thread by ID; guard same company scoping

## Deferred Open Security Items (Pre-Existing — Not B01 Work)

These were noted in the command brief as out of scope for B01:
- F-06: loginUser error leak (userController)
- F-08: updateJob no ownership check
- F-05: ~55 error leak patterns in other controllers
- FIX-02: double dialog on new-job publish

## Infrastructure Backlog

### B01-BACKLOG-14: Rate limiting on message send
- No express-rate-limit anywhere in codebase (confirmed pre-B01)
- /api/messages/thread/send is a write endpoint that could be abused without rate limiting
- Add: express-rate-limit middleware per IP or per uid on /messages/thread/send

### B01-BACKLOG-15: Analytics wiring
- When an analytics library is adopted: wire the 9 events in ANALYTICS_PLAN_V1
- No analytics infrastructure currently exists in project
