# GETHIRED_RECRUITER_MESSAGES_INBOX_THREAD_DETAIL_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Thread Detail Implementation

### Component: recruiter-messages.component.html (rm-thread-detail section)

The thread detail pane uses the existing shared app-message-thread component for all message
history and composer functionality. The recruiter-messages component adds only:
1. A detail header with context info and navigation links
2. A back button (mobile)
3. An idle state when no thread is selected

### Architecture Decision

The app-message-thread component already handles:
- openThread (POST /api/messages/thread) to create/find the thread by jobId+applicantUid
- getThreadMessages polling every 8s
- Loading / error / empty message states
- Composer with send/sending/failed send states
- scrollAnchor auto-scroll

This means the thread detail in the global inbox has full feature parity with
the existing employer applicant view at job-applicants.component.html — by reuse,
not duplication.

## Thread Detail States

### Desktop Idle (no thread selected)
- Shown when: !selectedThread
- Content: "Select a conversation to read and reply."
- rm-detail-idle class, vertically centered
- Allows recruiter to understand the two-pane pattern

### Thread Selected (rm-detail-wrap)
- Shown when: selectedThread !== null
- Animation: rm-detail-reveal (220ms slide from right, reduced-motion safe)

## Detail Header (rm-detail-header)

Contains:
- rm-detail-name: applicantLabel(selectedThread) — "Candidate XXXXXX" (last 6 chars of uid, uppercased)
- rm-thread-job-chip: selectedThread.jobTitle (if available)
- rm-badge--needs-reply: if selectedThread.needsReply

Context links (rm-detail-links):
- "Review applicants" → /recruiter/contacts (aria-label="Review all applicants")
- "View jobs" → /recruiter/jobs/list (aria-label="View jobs list")

Link notes:
- No "View applicant" deep-link because applicantUid alone cannot construct the applicant detail URL without applicationId or applicantProfileId (different field from uid); backlogged
- No "Review application" deep-link for same reason
- "Review video answers" not linked (requires applicationId); backlogged

## Message Thread Component (app-message-thread)

Inputs passed from recruiter-messages:
- [jobId]="selectedThread.jobId"
- [applicantUid]="selectedThread.applicantUid"
- [otherPartyLabel]="applicantLabel(selectedThread)"
- currentUserRole="employer"

Component handles internally:
- openThread call → finds existing thread
- getThreadMessages + 8s poll
- send message
- Loading/empty/error states
- Composer with disabled-when-empty, 4000-char max, sending state
- Failed send error preserves typed message body
- scroll to newest message on new message arrival

## Mobile Detail Behavior

- rm-thread-detail has display:none by default on <768px
- rm-thread-detail--visible-mobile class added when showDetail === true
- Back button (rm-back-btn) shown only when showDetail === true (mobile)
- Clicking Back: showDetail = false (returns to list, does NOT deselect thread)
- On desktop: both panes visible simultaneously; no showDetail needed

## Frontend Effects

| Effect | Implementation | Reduced-motion |
|---|---|---|
| Detail slide-in | rm-detail-reveal keyframe (translateX 8px→0, 220ms) | @include motion-safe |
| Back button press | :active color change | transition motion-safe |
| Link button hover | background #ede9fe | transition motion-safe |
| Link button press | scale(0.97) | transition motion-safe |
| Send/compose effects | Handled by app-message-thread component (existing) | existing |

## What Was Not Added (Safe Deferred)

- Application status in detail header (applicationId not in thread summary)
- Direct "View applicant" link (applicantProfileId not in thread summary)
- "Review video answers" link (requires applicationId)
- Applicant full name (name not stored in message_threads; would require join to user_credentials or applicant_profiles — backlogged)
