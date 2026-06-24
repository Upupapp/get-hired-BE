# GETHIRED_RECRUITER_MESSAGES_INBOX_BEST_PRACTICES_PLAN_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Framework Applications

### 1. ATS Global Inbox Pattern
- Principle: Centralize recruiter/candidate communications in one place
- GetHired decision: /recruiter/messages with company-scoped thread list using existing message_threads table
- Affected files: employer-panel.module.ts (route), recruiter-messages.component.*
- Backend implication: new GET /api/messages/recruiter/threads joins message_threads + jobs + messages
- Frontend implication: thread list pane with all company threads
- Haptic: page reveal animation, skeleton shimmer on load
- Accessibility: page h1 "Messages", thread list role="list", thread rows role="button"
- Privacy: server-side company scoping via resolveCallerCompany
- Acceptance: recruiter sees all threads; guest/applicant get 403

### 2. Candidate-Profile Context Pattern
- Principle: Every thread preserves links to applicant/job/application
- GetHired decision: Thread detail header shows job title chip, needs-reply badge, links to review applicants / view jobs
- Affected files: recruiter-messages.component.html (detail header, links)
- Backend implication: jobTitle joined from jobs table in thread summary query
- Frontend implication: rm-detail-header with links
- Haptic: detail header transitions with rm-detail-reveal animation
- Accessibility: context links are real buttons with accessible labels
- Privacy: no raw applicant email/phone/private data shown
- Acceptance: selected thread shows job title and context links

### 3. Workable-Style Actionable Inbox (Filters)
- Principle: Filters: All, Unread (if real), Needs Reply (if derivable), By Job (if job context exists)
- GetHired decision: Only "All" and "Needs Reply" filters implemented (no is_read column; By Job deferred)
- Affected files: recruiter-messages.component.ts (setFilter, applyFilter), .html (rm-filters)
- Backend implication: needsReply derived server-side (lastSenderRole === 'applicant')
- Frontend implication: 2 chip filters; Unread and By Job documented as backlog
- Haptic: chip transition 140ms; aria-pressed reflects active state
- Accessibility: filter group role="group", aria-pressed on chips
- Privacy: no message body in filter labels
- Acceptance: Needs Reply filter shows only threads with needsReply=true

### 4. Lever-Style Thread Continuity
- Principle: Use same threads used elsewhere, not isolated messages
- GetHired decision: app-message-thread shared component reused in thread detail (same component used on job-applicants and applicant-applications)
- Affected files: recruiter-messages.component.html (app-message-thread)
- Backend implication: no new message table or model created
- Frontend implication: [jobId] + [applicantUid] + currentUserRole="employer" passed to existing component
- Haptic: thread component handles its own scroll/send/poll animations
- Accessibility: thread component already has role="log" aria-live on message list
- Privacy: existing thread component enforces same authorization
- Acceptance: selecting a thread in inbox loads same messages seen in job-applicants view

### 5. Greenhouse-Style Activity Centralization
- Principle: Thread panel provides context with links to profile/application
- GetHired decision: rm-detail-header shows job chip, needs-reply badge, Review applicants / View jobs buttons
- Affected files: recruiter-messages.component.html/scss
- Backend: jobTitle from thread summary join
- Frontend: rm-detail-links with two navigation buttons
- Haptic: link buttons have active scale via rm-link-btn :active rule
- Accessibility: buttons have aria-label describing destination
- Privacy: no application ID or applicant UID exposed in context links
- Acceptance: clicking "Review applicants" navigates to /recruiter/contacts

### 6. Notification-Center UX
- Principle: No fake badges, no fake unread
- GetHired decision: No unread count shown. No badge on sidebar. needsReply badge only shown when derived from real lastSenderRole data.
- Affected files: recruiter-messages.component.html, employer-sidebar.component.ts
- Backend: no fake count endpoint created
- Frontend: rm-badge--needs-reply only rendered when t.needsReply === true
- Haptic: no badge pulse animation (badge pulse only allowed for real unread counts per command rule)
- Accessibility: needs-reply badge has aria-label="Needs your reply"
- Privacy: no message body in badge
- Acceptance: badge appears only when real lastSenderRole === 'applicant'; never shown without data

### 7. Empty-State Framework
- Principle: "No messages yet" with helpful CTAs
- GetHired decision: 3 empty states — global empty, filtered empty, no thread selected (desktop idle)
- Affected files: recruiter-messages.component.html (rm-empty-state)
- Backend: empty array [] returned from listRecruiterThreads when no threads exist
- Frontend: *ngIf on threads.length and filteredThreads.length
- Haptic: rm-empty-state--reveal animation 280ms; reduced-motion respected
- Accessibility: headings h2 in empty states; CTA buttons have accessible labels
- Privacy: empty state CTAs link to /recruiter/contacts and /recruiter/jobs/list
- Acceptance: new recruiter company sees "No messages yet" with CTAs

### 8. Error Recovery
- Principle: Failed load/send states must offer retry and preserve effort
- GetHired decision: inbox load error shows "We couldn't load your messages" with Try again + Back to dashboard. Send errors handled inside app-message-thread (existing: preserves draft, shows retry)
- Affected files: recruiter-messages.component.html/ts (rm-state-panel--error, retry())
- Backend: 500 response triggers error callback in frontend observable
- Frontend: error = true flag, retry() calls loadThreads() again
- Haptic: retry button has gh-pressable class
- Accessibility: error panel has role="alert"
- Privacy: error message contains no server details
- Acceptance: simulated API failure shows error state with retry; clicking retry reloads threads

### 9. Material Badge/Chip/Status
- Principle: compact chips: Unread, Needs reply, Job title, Application status
- GetHired decision: rm-thread-job-chip (job title), rm-badge--needs-reply (needs reply). No application status chip (applicationStatus not in thread summary shape — backlog)
- Haptic: chips use CSS only, no animation library
- Accessibility: needs-reply badge has aria-label
- Privacy: chip text is "Needs reply" — no message body
- Acceptance: threads with needsReply=true show amber "Needs reply" chip

### 10. Mobile-First Recruiter Workflow
- Principle: two-pane desktop; list-first on mobile
- GetHired decision: rm-inbox grid (340px+1fr desktop); on mobile, list shows by default, selecting thread switches to detail via showDetail flag
- Affected files: recruiter-messages.component.scss (rm-inbox, rm-thread-list--hidden-mobile, rm-thread-detail--visible-mobile)
- Backend: no change
- Frontend: [class.rm-thread-list--hidden-mobile]="showDetail", [class.rm-thread-detail--visible-mobile]="showDetail"
- Haptic: back button, mobile detail slide-in
- Accessibility: Back button aria-label="Back to messages list"
- Privacy: same content, same scoping on mobile
- Acceptance: on narrow viewport, thread list shows first; selecting thread shows detail; Back button returns to list

### 11. Accessibility-First
- Principle: keyboard, focus, status messages, reduced motion
- GetHired decision: thread rows are role="button" tabindex="0" with keydown.enter/.space. Filter chips have aria-pressed. Thread list is role="list". Detail has aria-label. Error panel has role="alert". All buttons have accessible labels. Page has h1. Reduced-motion via @include motion-safe on all animations.
- Acceptance: see Phase 12 QA doc

### 12. Privacy/Company Scoping
- Principle: recruiter sees only company-scoped messages
- GetHired decision: listRecruiterThreads enforces WHERE company_id = callerCompany.companyId. Non-employers get FORBIDDEN 403.
- Acceptance: see Phase 11 privacy doc

### 13. Fair Hiring
- Principle: no auto-rejection, no AI screening, no score-based hiding
- GetHired decision: no scoring in inbox. No sentiment/AI signals. Copy uses only "Messages", "Candidate conversations", "Needs reply", "View applicant".
- Acceptance: see Phase 13 fair-hiring doc
