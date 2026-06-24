# GETHIRED_RECRUITER_MESSAGES_INBOX_CURRENT_STATE_AUDIT_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Summary

B01 audit confirmed: thread infrastructure fully exists and works end-to-end for per-applicant conversations. The ONLY gap was a global recruiter inbox route/page. All 3 backend layers (schema, service, controller+route) and both frontend layers (service, shared component) were present. No duplicate system was created.

## Backend Infrastructure Found

### Schema (get-hired-BE/db/messages_ddl.sql)
- Table: gethired.message_threads (id, job_id, company_id, applicant_uid, created_at, updated_at)
- Table: gethired.messages (id, thread_id, sender_uid, sender_role, body, created_at)
- Constraint: UNIQUE(job_id, applicant_uid) — one thread per job+applicant pair
- sender_role CHECK: IN ('employer', 'applicant')
- Indexes: company_id, job_id, applicant_uid, thread_id
- NO is_read column, NO read_at column, NO per-recipient read state

### Service (get-hired-BE/services/message.service.js)
- findOrCreateThread(jobId, applicantUid, callerUid) — creates or returns thread
- loadAuthorizedThread(threadId, callerUid) — single authorization chokepoint
- listMessages(threadId, callerUid) — loads all messages for a thread
- sendMessage(threadId, callerUid, body) — posts a message; enforces 4000-char cap
- resolveCallerCompany(callerUid) — derives employer status from company_employees
- assertEmployerOwnsThreadsJob(employerCompanyId, jobId) — BOLA guard
- MISSING before B01: listRecruiterThreads — no way to fetch all company threads

### Controller (get-hired-BE/controllers/messageController.js)
- openThread, getThreadMessages, postMessage — all present and verified
- MISSING before B01: getRecruiterThreads handler

### Routes (get-hired-BE/routes/messageRoutes.js)
- POST /api/messages/thread — open/find thread
- GET /api/messages/thread/messages — list messages for thread
- POST /api/messages/thread/send — send message
- MISSING before B01: GET /api/messages/recruiter/threads

### Server registration (get-hired-BE/server.js)
- messageRoutes registered at line 60: app.use("/api", messageRoutes)
- No registration change needed — new route inherits same /api prefix

## Frontend Infrastructure Found

### Service (get-hired-FE/src/app/shared/services/message.service.ts)
- MessageService: openThread, getThreadMessages, sendMessage — all present
- RecruiterThreadSummary interface: MISSING before B01
- getRecruiterThreads(): MISSING before B01

### Shared Component (get-hired-FE/src/app/shared/components/message-thread/)
- MessageThreadComponent — fully implemented:
  - Inputs: jobId, applicantUid, otherPartyLabel, currentUserRole
  - Polls every 8s (no WebSocket)
  - ngOnChanges-based thread reset (safe across reuse)
  - Loading / empty / error states
  - Composer with disabled-when-empty, sending state
  - scrollAnchor for auto-scroll on new messages
  - trackByMessageId for perf
  - Declared and exported in SharedModule — available to all feature modules

### Existing Usages of MessageThreadComponent
- get-hired-FE/src/app/job/job-applicants/job-applicants.component.html line 155
  (employer side: [jobId] + [applicantUid] + currentUserRole="employer")
- get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html line 73
  (applicant side: [jobId] only, currentUserRole="applicant")

## Employer Panel Navigation State (Pre-B01)

### Sidebar (employer-sidebar.component.ts ngOnChanges)
- 5 items: Dashboard, Jobs, Candidates, Company, Subscription
- No Messages item

### Mobile bottom nav (employer-panel.component.html)
- 5 items: Dashboard, Jobs, Candidates, Post Job, Company
- No Messages item

### Routes (employer-panel.module.ts)
- Registered: dashboard, jobs, company, contacts, interview, subscription
- No messages route

### Dashboard (company-dashboard.component.html)
- No messages action card or link

## Gaps Confirmed Before B01

1. No /recruiter/messages route
2. No RecruiterMessagesComponent
3. No sidebar "Messages" item
4. No mobile nav "Messages" item
5. No dashboard Messages CTA
6. No GET /api/messages/recruiter/threads endpoint
7. No getRecruiterThreads in service or controller
8. No RecruiterThreadSummary interface

## What is NOT in the Schema (Confirmed)

- No is_read column on messages or message_threads
- No read_at column
- No per-recipient read state
- Implication: "Unread" count/badge is not supportable from real data; excluded from B01

## Authorization Model (Verified Correct)

- Thread access: callerUid checked via resolveCallerCompany() → getUserCompany()
- Employer: must own the job (company_id match)
- Applicant: must be the thread's applicant_uid
- Neither role nor company is trusted from request body
- Cross-company access: throws FORBIDDEN (403), not 404 (prevents probing)
