# GETHIRED_RECRUITER_MESSAGES_INBOX_STATE_MAP_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Complete State Map

### State 1: Inbox Loading
- Trigger: page load, retry in progress
- UI: 5 skeleton shimmer rows, aria-busy="true", aria-label="Loading messages"
- Implementation: *ngIf="loading"
- Exit: success → State 3 or 4; error → State 5

### State 2: Inbox Loading + Retry
- Trigger: user clicks "Try again" after error
- UI: skeleton rows visible again (loading = true), retry button shows "Trying…"
- Implementation: loading = true; retrying = true in loadThreads()

### State 3: Inbox Empty (No Threads)
- Trigger: loadThreads() returns []
- UI:
  - Title: "No messages yet"
  - Body: "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile."
  - Primary CTA: "Review applicants" → /recruiter/contacts
  - Secondary CTA: "View jobs" → /recruiter/jobs/list
- Implementation: threads.length === 0 and filteredThreads.length === 0
- Animation: rm-empty-state--reveal (280ms, reduced-motion safe)

### State 4: Inbox Populated (Threads Visible)
- Trigger: loadThreads() returns non-empty array
- UI: thread list with rows, filter chips visible
- Sub-states: All threads | Needs Reply filter active

### State 5: Inbox Error (Load Failed)
- Trigger: getRecruiterThreads() observable errors
- UI:
  - Title: "We couldn't load your messages"
  - Body: "Please try again. If the issue continues, go back to your dashboard."
  - Primary CTA: "Try again" → retry()
  - Secondary CTA: "Back to dashboard" → /recruiter/dashboard
- Implementation: error = true; role="alert" on error panel
- Accessibility: role="alert" announces immediately to screen readers

### State 6: Filtered Empty
- Trigger: activeFilter === 'needs-reply' but no threads have needsReply = true
- UI:
  - Title: "No messages match this filter"
  - Body: "Try another filter or return to all conversations."
  - CTA: "View all messages" → setFilter('all')
- Implementation: threads.length > 0 && filteredThreads.length === 0

### State 7: Thread Selected — Loading (inside app-message-thread)
- Trigger: user selects a thread; openThread + getThreadMessages called
- UI: "Loading conversation…" inside the message-thread component
- Handled by: message-thread.component.ts loading flag

### State 8: Thread Selected — Messages Visible
- Trigger: getThreadMessages returns messages
- UI: bubble list, composer enabled
- Handled by: message-thread.component

### State 9: Thread Selected — Empty (No Messages Yet)
- Trigger: thread opened but no messages sent yet
- UI: "No messages yet. Say hello to get the conversation started." (inside message-thread)
- Handled by: message-thread.component (messages.length === 0)

### State 10: Thread Selected — Load Error
- Trigger: openThread or getThreadMessages errors
- UI: "Could not open this conversation." or "Could not load messages." (inside message-thread)
- Handled by: message-thread.component error flag

### State 11: Desktop Idle (No Thread Selected)
- Trigger: page loads; filter changes deselect current thread
- UI: "Select a conversation to read and reply." in rm-detail-idle
- Implementation: !selectedThread condition in template

### State 12: Send In Progress
- Trigger: user submits message
- UI: "Sending…" on button, button disabled, textarea disabled
- Handled by: message-thread.component sending flag

### State 13: Send Success
- Trigger: sendMessage() succeeds
- UI: new message bubble appears, composer cleared
- Handled by: message-thread.component

### State 14: Send Failed
- Trigger: sendMessage() errors
- UI: "Could not send your message. Please try again." inline error; newBody preserved
- Handled by: message-thread.component

### State 15: No Company (403 from BE)
- Trigger: recruiter has no company_employees row
- UI: inbox error state (same as State 5) — error = true shown
- Note: 403 from getRecruiterThreads() triggers the error observable

### State 16: Mobile List View
- Trigger: viewport < 768px, showDetail = false
- UI: thread list visible, detail pane hidden
- Implementation: rm-thread-list--hidden-mobile when showDetail, rm-thread-detail display:none until --visible-mobile

### State 17: Mobile Detail View
- Trigger: user taps thread row on mobile
- UI: detail pane visible, list pane hidden, back button visible
- Implementation: showDetail = true; rm-thread-detail--visible-mobile applied
