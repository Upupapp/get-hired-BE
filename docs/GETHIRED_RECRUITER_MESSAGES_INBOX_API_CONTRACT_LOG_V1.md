# GETHIRED_RECRUITER_MESSAGES_INBOX_API_CONTRACT_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Existing Endpoints (Unchanged)

### POST /api/messages/thread
- Body: { jobId, applicantUid }
- Returns: MessageThread { id, job_id, company_id, applicant_uid, created_at, updated_at }
- Auth: verifyAuth; company/applicant scoping in service
- Usage: app-message-thread component (existing)

### GET /api/messages/thread/messages?threadId=X
- Returns: ChatMessage[] ordered by created_at ASC
- Auth: verifyAuth; thread access enforced via loadAuthorizedThread
- Usage: app-message-thread component (existing)

### POST /api/messages/thread/send
- Body: { threadId, body }
- Returns: ChatMessage { id, thread_id, sender_uid, sender_role, body, created_at }
- Auth: verifyAuth; thread access + company/applicant check in service
- Usage: app-message-thread component (existing)

## New Endpoint (B01)

### GET /api/messages/recruiter/threads
- Auth: verifyAuth
- Company scoping: resolveCallerCompany(uid) → if no company → 403 FORBIDDEN
- Returns: RecruiterThreadSummary[]

#### Response shape (per row):
```json
{
  "threadId": "THREAD-XXXXXXXX",
  "applicantUid": "firebase-uid-string",
  "jobId": "JOB-XXXXXX",
  "jobTitle": "Marketing Manager" | null,
  "lastMessageSnippet": "Hi, I wanted to follow..." | null,
  "lastSenderRole": "employer" | "applicant" | null,
  "lastMessageAt": "2026-06-25T10:32:00.000Z",
  "needsReply": true | false
}
```

#### SQL query:
```sql
SELECT
  mt.id            AS "threadId",
  mt.applicant_uid AS "applicantUid",
  mt.job_id        AS "jobId",
  mt.updated_at    AS "lastMessageAt",
  j.job_title      AS "jobTitle",
  last_msg.body    AS "lastMessageSnippet",
  last_msg.sender_role AS "lastSenderRole"
FROM gethired.message_threads mt
LEFT JOIN gethired.jobs j ON j.job_id = mt.job_id
LEFT JOIN LATERAL (
  SELECT body, sender_role
  FROM   gethired.messages
  WHERE  thread_id = mt.id
  ORDER  BY created_at DESC
  LIMIT  1
) last_msg ON true
WHERE mt.company_id = $1
ORDER BY mt.updated_at DESC;
```

#### Notes:
- LEFT JOIN on jobs: safe; thread.job_id references jobs(job_id) with ON DELETE CASCADE; if job was deleted, jobTitle will be null
- LATERAL join for last message: returns null columns for threads with no messages yet (new openThread result with no messages)
- lastMessageSnippet truncated to 120 chars server-side (prevents large response payloads)
- needsReply: derived as lastSenderRole === 'applicant' — safe, no AI inference
- Ordering: updated_at DESC (threads with most recent activity first)
- Empty company: 403 FORBIDDEN, not 200+[] — prevents non-employers from probing

#### Error responses:
| Status | Code | Condition |
|---|---|---|
| 403 | FORBIDDEN | Caller has no company (resolveCallerCompany returned null/[]) |
| 500 | — | Unexpected DB error |

## Frontend Service Method

### MessageService.getRecruiterThreads()
- File: get-hired-FE/src/app/shared/services/message.service.ts
- Method: getRecruiterThreads(): Observable<RecruiterThreadSummary[]>
- Calls: GET ${environment.api_url}/messages/recruiter/threads
- Returns: res?.data ?? [] (safe empty array on null data)
- Interface RecruiterThreadSummary: added to message.service.ts

## What Was NOT Changed

- POST /api/messages/thread — unchanged
- GET /api/messages/thread/messages — unchanged
- POST /api/messages/thread/send — unchanged
- message.service.js exports: findOrCreateThread, listMessages, sendMessage, loadAuthorizedThread all unchanged
- No new table, no new migration required
- No WebSocket infrastructure
- No notification infrastructure
