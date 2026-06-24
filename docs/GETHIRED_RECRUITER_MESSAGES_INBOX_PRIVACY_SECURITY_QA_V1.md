# GETHIRED_RECRUITER_MESSAGES_INBOX_PRIVACY_SECURITY_QA_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Company Scoping (Server-Side)

### GET /api/messages/recruiter/threads
- Caller uid comes from req.user (Firebase-verified JWT, never from body)
- resolveCallerCompany(uid) → getUserCompany() → company_employees JOIN companies WHERE employee_uuid=$1
- If no company row: returns null/[] → listRecruiterThreads throws FORBIDDEN → 403
- WHERE clause: mt.company_id = callerCompany.companyId
- A recruiter from Company A cannot see threads belonging to Company B
- Verified: SQL query hard-codes WHERE mt.company_id = $1 (parameterized, not interpolated)

### POST /api/messages/thread
- findOrCreateThread: assertEmployerOwnsThreadsJob verifies company owns the job
- Unchanged from pre-B01 implementation

### GET /api/messages/thread/messages
- loadAuthorizedThread: checks callerCompany.companyId === thread.company_id
- Unchanged from pre-B01

### POST /api/messages/thread/send
- loadAuthorizedThread same check
- Unchanged from pre-B01

## Cross-Company Leak Prevention

- A recruiter cannot access another company's threads by changing any URL parameter
  - /recruiter/messages is a flat page (no threadId in URL)
  - Thread selection is handled client-side within already-loaded company-scoped data
  - app-message-thread calls POST /api/messages/thread which enforces ownership server-side
  - getThreadMessages enforces loadAuthorizedThread
  - postMessage enforces loadAuthorizedThread
- No raw company_id or applicant UID is used to authorize access from client side

## ThreadId Tampering

- If a recruiter manually calls GET /api/messages/thread/messages?threadId=THREAD-OTHERCORP:
  - loadAuthorizedThread: callerCompany.companyId !== thread.company_id → FORBIDDEN 403
- If POST /api/messages/thread/send with a foreign threadId:
  - Same loadAuthorizedThread check → FORBIDDEN 403
- Response reveals: "You don't have access to this conversation." — does not reveal existence to unauthorized party

## jobId/applicantUid Tampering

- GET /api/messages/recruiter/threads: only returns threads already scoped to caller's company — no jobId input
- POST /api/messages/thread: assertEmployerOwnsThreadsJob verifies company owns the job before creating thread
- An attacker cannot create a thread for a competitor's job

## Session Expiry

- All message routes use verifyAuth middleware (Firebase token verification)
- Expired token → verifyAuth returns 401 → Angular's UnauthorizedInterceptor catches → redirects to login

## Applicant Cannot Access Recruiter Inbox

- /recruiter/messages route is within EmployerPanelModule, guarded by EmployerGuard (role = 2)
- An applicant (role != 2) is redirected by EmployerGuard before reaching the component
- Even if EmployerGuard were bypassed: GET /api/messages/recruiter/threads would call resolveCallerCompany → return null for applicant → FORBIDDEN 403

## Admin Cannot Access Recruiter Inbox (Cross-Role)

- Admin (role = 3 or equivalent) does not have company_employees rows
- resolveCallerCompany → null → FORBIDDEN 403 on thread list API

## No Secrets in Logs

- messageController.js error logging uses console.error('[messageController] error:', error)
- Error object may contain stack trace but NOT request body or message content
- No Firebase tokens in logs

## No Message Bodies in Client-Side Storage

- Threads loaded into component memory (not localStorage/sessionStorage)
- Snippet truncated to 120 chars server-side, further to 80 chars in template
- No message body persisted to browser storage

## Applicant Data Exposure

- Thread summary exposes: threadId, applicantUid, jobId, jobTitle, lastMessageSnippet (first 120 chars), lastSenderRole, lastMessageAt, needsReply
- applicantUid is the Firebase uid — not a private identifier beyond what employer already has in job_applicants
- Full name NOT returned in thread summary (no join to user_credentials in listRecruiterThreads query — deferred to backlog)
- Email, phone, address, CV — NOT returned
- Application data (answers, video URLs) — NOT returned

## Verified: No New Security Risks Introduced

| Check | Result |
|---|---|
| New SQL query uses parameterized values only | PASS — $1 for companyId |
| No interpolated user input in SQL | PASS |
| New route uses verifyAuth middleware | PASS |
| Company scoping enforced server-side | PASS |
| No cross-company data in response | PASS |
| No applicant private data beyond jobId/uid | PASS |
| No message body in analytics or logs | PASS |
| No secrets in frontend code | PASS |
| Route guard unchanged | PASS — inherits EmployerGuard |
