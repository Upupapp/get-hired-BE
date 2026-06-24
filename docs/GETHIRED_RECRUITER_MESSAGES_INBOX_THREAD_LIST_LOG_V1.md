# GETHIRED_RECRUITER_MESSAGES_INBOX_THREAD_LIST_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Component
File: get-hired-FE/src/app/employer-panel/recruiter-messages/recruiter-messages.component.*

## Thread List States

### Loading (skeleton)
- Shown while: loading === true
- Implementation: *ngIf="loading" div.rm-skeleton-wrap with 5 skeleton rows
- Effect: CSS shimmer animation (rm-shimmer keyframe, 1.4s infinite, ambient-motion-safe)
- Accessibility: aria-busy="true" aria-label="Loading messages" on wrapper
- Reduced-motion: @include ambient-motion-safe removes animation; static gray blocks shown

### Populated (threads exist, filter matches some)
- Shown while: !loading && !error && filteredThreads.length > 0
- Implementation: ul.rm-thread-list-ul with *ngFor li.rm-thread-row
- trackBy: trackByThreadId (prevents re-render on 8s poll)

### Empty — no threads at all (company has no conversations yet)
- Shown when: !loading && !error && threads.length === 0
- Title: "No messages yet"
- Body: "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile."
- CTAs: "Review applicants" → /recruiter/contacts | "View jobs" → /recruiter/jobs/list
- Effect: rm-empty-state--reveal animation (280ms, reduced-motion safe)

### Empty — filtered (threads exist but filter hides them)
- Shown when: threads.length > 0 && filteredThreads.length === 0
- Title: "No messages match this filter"
- Body: "Try another filter or return to all conversations."
- CTA: "View all messages" → calls setFilter('all')

### Error
- Shown when: !loading && error
- Title: "We couldn't load your messages"
- Body: "Please try again. If the issue continues, go back to your dashboard."
- CTAs: "Try again" (calls retry()) | "Back to dashboard" (/recruiter/dashboard)
- Role: role="alert" on rm-state-panel--error
- Retry: retrying flag disables button during re-fetch

## Thread Row Structure

Each thread row (li.rm-thread-row):
- Avatar: rm-thread-avatar — first letter of applicant label, gradient background
- Top row: applicant label (bold) + last activity time (shortTime pipe)
- Job chip: rm-thread-job-chip — job title if available, truncated with text-overflow
- Snippet: rm-thread-snippet — last message body, truncated to 80 chars in template
- Badges: rm-badge--needs-reply (amber) if t.needsReply === true
- State: rm-thread-row--selected when selectedThread.threadId matches
- State: rm-thread-row--needs-reply class for future styling hook

## Filters

Active filters: All | Needs Reply
- All: shows all threads (default)
- Needs Reply: shows only threads where lastSenderRole === 'applicant'
- Not implemented (deferred): Unread (no is_read column), By Job (deferred to backlog)
- Filter chips: aria-pressed="true/false", focus-visible outline
- Active chip: rm-chip--active (dark bg, white text)

## Accessibility

- ul role="list" for thread list
- li role="button" tabindex="0" for each thread row
- aria-label: threadLabel() returns "Conversation for [Job Title], last message [time], needs your reply"
- aria-pressed: selected row shows true
- keydown.enter and keydown.space trigger selectThread()
- Filter group: role="group" aria-label="Filter conversations"
- Filter chips: aria-pressed reflects active state

## Frontend Effects Applied

| Effect | Implementation | Reduced-motion |
|---|---|---|
| Page reveal | rm-page-reveal keyframe 220ms on .rm-page | @include motion-safe |
| Skeleton shimmer | rm-shimmer keyframe 1.4s on .rm-skeleton-row | @include ambient-motion-safe |
| Row hover lift | translateY(-1px) on .rm-thread-row:hover | @include motion-safe on transition |
| Row press | scale(0.99) on .rm-thread-row:active | via motion-safe transition |
| Selected row glow | background #F5F3FF + border-left 3px #7B61FF | CSS only, no animation |
| Filter chip transition | background+color 140ms | @include motion-safe on transition |
| Empty state reveal | rm-empty-reveal keyframe 280ms | @include motion-safe |
