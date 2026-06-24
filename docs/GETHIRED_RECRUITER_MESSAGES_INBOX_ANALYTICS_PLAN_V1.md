# GETHIRED_RECRUITER_MESSAGES_INBOX_ANALYTICS_PLAN_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Status: PLANNED (not implemented — no analytics infrastructure exists in this codebase)

## Infrastructure Check

No analytics library (Segment, Mixpanel, Amplitude, GA4) was found in get-hired-FE.
No analytics service was found in the shared services directory.
Implementing analytics would require a separate sprint (selecting a provider, adding the SDK,
defining conventions). This document records the planned events so they can be wired when
infrastructure is added.

## Planned Events

### recruiter_messages_inbox_viewed
- Trigger: RecruiterMessagesComponent ngOnInit completes and threads load
- Payload: { companyId: string, threadCount: number, hasNeedsReply: boolean }
- Privacy rules: no message body, no applicant uid in payload

### recruiter_messages_filter_clicked
- Trigger: user clicks a filter chip
- Payload: { filter: 'all' | 'needs-reply', resultCount: number }
- Privacy rules: no thread IDs, no applicant data

### recruiter_messages_thread_opened
- Trigger: user clicks a thread row (selectThread called)
- Payload: { hasJobTitle: boolean, needsReply: boolean }
- Privacy rules: no threadId, no applicantUid, no message body — only boolean signals

### recruiter_messages_send_started
- Trigger: send() called in message-thread component
- Payload: { role: 'employer' }
- Privacy rules: NO message body in payload

### recruiter_messages_send_succeeded
- Trigger: sendMessage() observable next callback
- Payload: { role: 'employer' }
- Privacy rules: NO message body

### recruiter_messages_send_failed
- Trigger: sendMessage() observable error callback
- Payload: { role: 'employer', errorCode: string }
- Privacy rules: no message body; errorCode is a short string (e.g. 'MESSAGE_BODY_TOO_LONG')

### recruiter_messages_retry_clicked
- Trigger: retry() called in recruiter-messages component
- Payload: {}

### recruiter_messages_view_applicants_clicked
- Trigger: goToApplicants() called from detail header or empty state
- Payload: { source: 'detail_header' | 'empty_state' }

### recruiter_messages_empty_state_cta_clicked
- Trigger: any CTA in empty state or error state
- Payload: { cta: 'review_applicants' | 'view_jobs' | 'try_again' | 'back_to_dashboard' }

## Payload Rules (Hard)

- NEVER include message body text in any event payload
- NEVER include applicant uid/email/name in analytics
- NEVER include protected attributes
- NEVER include application content
- Safe to include: boolean signals, counts, role, errorCode, source strings

## Implementation Approach (When Infrastructure Exists)

1. Inject analytics service into RecruiterMessagesComponent
2. Call trackEvent() at the points above
3. Reuse same conventions established for other analytics events in the project
4. Do NOT add analytics to the shared message-thread component (it's used on applicant side too — cross-role tracking)
