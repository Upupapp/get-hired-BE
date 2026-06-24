# GETHIRED_RECRUITER_MESSAGES_INBOX_CROSS_LINKS_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Cross-Links Added

### 1. Dashboard Action Center → /recruiter/messages
- Source: company-dashboard.component.html (action center grid)
- Before: no Messages card
- After: emp-dash-action-card button calls goToMessages()
- Method: goToMessages() added to company-dashboard.component.ts
- Target: /recruiter/messages
- Guard: inherits same EmployerGuard as the rest of /recruiter
- Fallback: not applicable (dashboard is within employer panel)
- Verification: button visible in action grid; click navigates to /recruiter/messages

### 2. Sidebar → /recruiter/messages
- Source: employer-sidebar.component.ts sidebarItems array
- Before: Messages not in list
- After: { title: 'Messages', icon: 'jobs.png', class: 'messages', route: 'messages' } added as item 4
- Active state: sidebar-title-active when location.match('messages')
- Keyboard: keydown.enter/space on sidebar item calls changeRoute('/recruiter/messages')

### 3. Mobile Bottom Nav → /recruiter/messages
- Source: employer-panel.component.html (gh-mobile-nav)
- Before: Post Job was item 4
- After: Messages is item 4, using SVG chat-bubble icon
- routerLink="/recruiter/messages", routerLinkActive="gh-mobile-nav-item--active"
- Accessibility: aria-label="Messages"

### 4. Thread Detail → /recruiter/contacts (Review Applicants)
- Source: recruiter-messages.component.html (rm-detail-links)
- New link button: "Review applicants" → goToApplicants() → /recruiter/contacts
- Aria-label: "Review all applicants"
- Exists as context link in thread detail header

### 5. Thread Detail → /recruiter/jobs/list (View Jobs)
- Source: recruiter-messages.component.html (rm-detail-links)
- New link button: "View jobs" → goToJobs() → /recruiter/jobs/list
- Aria-label: "View jobs list"
- Exists as context link in thread detail header

### 6. Empty State → /recruiter/contacts (Review Applicants CTA)
- Source: recruiter-messages.component.html (rm-empty-state)
- "Review applicants" button → goToApplicants()
- Only shown when threads.length === 0

### 7. Empty State → /recruiter/jobs/list (View Jobs CTA)
- Source: recruiter-messages.component.html (rm-empty-state)
- "View jobs" button → goToJobs()
- Only shown when threads.length === 0

### 8. Error State → /recruiter/dashboard (Back to Dashboard)
- Source: recruiter-messages.component.html (rm-state-panel--error)
- "Back to dashboard" button → goToDashboard() → /recruiter/dashboard
- Only shown when error === true

## Existing Flows Not Changed

### job-applicants.component.html — app-message-thread
- Still uses the same shared component
- No CTA change: existing "Message applicant" flow unchanged
- Existing thread opened via jobId + applicantUid — leads to same BE thread

### applicant-applications.component.html — app-message-thread
- Unchanged: "Message employer" toggle still works as before

## Deferred Cross-Links (Safe — Not Implemented)

| Link | Reason deferred |
|---|---|
| Thread detail → View applicant deep-link | applicantUid alone cannot construct applicant detail URL (needs applicantProfileId or applicationId, not in thread summary shape) |
| Thread detail → Review application | applicationId not in thread summary |
| Thread detail → Review video answers | applicationId not in thread summary |
| By Job filter with ?jobId= query param | jobId query param filter not implemented in thread list (backlogged) |

## Query Param Behavior

No query params accepted by /recruiter/messages at this time.
If jobId param is passed via old links: route still loads, all threads shown (param ignored safely).
Future: ?jobId=X for "By Job" filter (backlog).
