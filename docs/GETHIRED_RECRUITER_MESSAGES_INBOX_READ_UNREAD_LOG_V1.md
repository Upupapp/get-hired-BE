# GETHIRED_RECRUITER_MESSAGES_INBOX_READ_UNREAD_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Schema Audit Result

### Confirmed: No Read-State in Schema
- Table gethired.messages: columns are id, thread_id, sender_uid, sender_role, body, created_at
- Table gethired.message_threads: columns are id, job_id, company_id, applicant_uid, created_at, updated_at
- No is_read column on either table
- No read_at timestamp
- No per-recipient read state (message_read table, etc.)
- Source of truth: get-hired-BE/db/messages_ddl.sql (lines 38-50)
- This was noted in the GH1 checkpoint memory: "no is_read column" confirmed stale blocker

### Prior Session Deferred Item
- GH1 checkpoint: "messages widget deferred (no is_read column/all-threads endpoint)"
- B01 resolves the "all-threads endpoint" gap with GET /api/messages/recruiter/threads
- B01 does NOT add is_read (would require schema migration and careful rollout)

## Unread Behavior Decision

### What is NOT implemented (correct)
- No unread count on thread rows
- No unread badge on sidebar Messages item
- No "Unread" filter chip
- No mark-as-read API call on thread open
- No fake unread counts

### Reason
- No is_read column means "unread" cannot be derived from real data
- Showing a fake count would mislead recruiters
- Command rules: "do not create fake unread counts"

## needsReply Behavior (Implemented)

### Signal: lastSenderRole === 'applicant'
- Derived server-side in listRecruiterThreads
- Meaning: the most recent message in the thread was sent by the applicant; the recruiter has not replied since then
- Limitation: a recruiter who read but didn't reply is still flagged as "needs reply" — this is accurate (they haven't replied) but not a true read-receipt
- No AI inference involved

### Frontend rendering
- t.needsReply === true → rm-badge--needs-reply shown on thread row
- t.needsReply === true → badge also shown in thread detail header
- t.needsReply === false or null → no badge shown
- Needs Reply filter: shows only threads where needsReply === true

### Badge copy: "Needs reply"
- Not: "Unread", "New", "Unseen" (those imply read-state tracking we don't have)
- "Needs reply" accurately describes what we can derive: the other party's last move is unresponded to

## Backlog: Read-State Support

### Prerequisites
- Schema migration: add is_read (boolean) or read_at (timestamp) to gethired.messages, scoped per-recipient
- Or: add a message_reads table (message_id, reader_uid, read_at) for proper per-recipient state
- OR: add a simpler thread-level read marker: recruiter_last_read_at on message_threads

### Recommended approach (future sprint)
```sql
ALTER TABLE gethired.message_threads
  ADD COLUMN recruiter_last_read_at TIMESTAMP;
```
- On thread open in inbox: PATCH /api/messages/thread/:threadId/read → sets recruiter_last_read_at=now()
- Unread derived: SELECT count(*) FROM messages WHERE thread_id=$1 AND created_at > $recruiter_last_read_at AND sender_role='applicant'
- This is the lowest-migration-risk approach (single column, no new table)

### When read-state is added
- Add "Unread" filter chip (between All and Needs Reply)
- Add unread count badge on thread rows
- Optionally add unread count badge on sidebar Messages item (real count only, animated pulse)
- Mark thread as read when recruiter opens it in inbox
