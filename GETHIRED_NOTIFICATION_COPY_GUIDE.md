# GETHIRED_NOTIFICATION_COPY_GUIDE.md
## QA Cycle 11 — Approved notification copy reference

---

## Voice and tone principles

- **Active voice.** "We couldn't load" not "Messages could not be loaded."
- **No blame.** System failures are always "we" not "you."
- **Specific, not generic.** Name the thing that failed ("your messages", "interview activity").
- **Actionable.** Every error has a next step. Every empty state has a CTA.
- **Proportional urgency.** Rate limits are warnings, not alarms. Session expiry is a danger.
- **No shame.** Never comment on profile completeness, application quality, or match fit.
- **No fake urgency.** No "Act now!", "Limited spots!", or false counts.

---

## Approved copy — by component

### Recruiter Messages Inbox (B01)

| Situation | Approved copy |
|---|---|
| Page subtitle | "Manage candidate conversations across your jobs." |
| Loading a11y | "Loading messages" (aria-label only) |
| Error heading | "We couldn't load your messages" |
| Error body | "Please try again. If the issue continues, go back to your dashboard." |
| Retry button | "Try again" / "Trying…" (in-progress) |
| Fallback button | "Back to dashboard" |
| Empty heading | "No messages yet" |
| Empty body | "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile." |
| Empty CTA 1 | "Review applicants" |
| Empty CTA 2 | "View jobs" |
| Filter empty heading | "No messages match this filter" |
| Filter empty body | "Try another filter or return to all conversations." |
| Filter empty CTA | "View all messages" |
| Desktop idle | "Select a conversation to read and reply." |
| Needs-reply badge | "Needs reply" (visible) / "Needs your reply" (aria-label) |

### app-message-thread (shared component)

| Situation | Approved copy |
|---|---|
| Loading | "Loading conversation…" |
| Empty | "No messages yet. Say hello to get the conversation started." |
| Open error | "Could not open this conversation. Please try again." |
| Load error | "Could not load messages." |
| Send error | "Could not send your message. Please try again." |
| Send button | "Send" / "Sending…" |
| Textarea placeholder | "Write a message…" |
| Composer label (SR only) | "Write a message" |

### Interview Hub (B03)

| Situation | Approved copy |
|---|---|
| Page title | "Interviews" |
| Page subtitle | "Review candidates who applied to your jobs and submitted video responses." |
| Loading a11y | "Loading interview activity" (aria-label only) |
| Error heading | "We couldn't load interview activity." |
| Error body | "This might be a temporary issue. Try again or return to your dashboard." |
| Retry button | "Try again" |
| Fallback link | "Back to dashboard" |
| Empty heading | "No interview activity yet" |
| Empty body | "Candidates will appear here when they apply to your jobs or submit video responses to your interview questions." |
| Empty CTA 1 | "Review applicants" |
| Empty CTA 2 | "View jobs" |
| Filter empty | "No candidates match this filter." |
| Filter chip "all" | "All applicants" |
| Filter chip "video" | "Video answers" |
| Filter chip "review" | "Under review" |
| Card action 1 | "View applicants" |
| Card action 2 | "Review responses" |
| Card action 3 | "Message" |

### Mobile Sidebar (B02)

| Situation | Approved copy |
|---|---|
| Hamburger open | aria-label: "Open navigation menu" |
| Hamburger close | aria-label: "Close navigation menu" |
| Drawer a11y | aria-label: "Employer navigation" |
| Drawer close button | aria-label: "Close navigation menu" |
| Nav: Dashboard | "Dashboard" |
| Nav: Jobs | "Jobs" |
| Nav: Candidates | "Candidates" |
| Nav: Messages | "Messages" |
| Nav: Company | "Company" |
| Nav: Subscription | "Subscription" |
| Billing bar | "Subscription & Billing" / aria-label: "Subscription and Billing" |
| Settings footer | "Settings" |

### Rate Limiting (SEC-01) — NEW approved copy

| Situation | Approved copy |
|---|---|
| 429 warning snackbar | "You've made too many requests. Please wait a moment and try again." |
| Auth-specific 429 | "Too many sign-in attempts. Please wait 15 minutes and try again." |

### Auth copy fixes

| Old copy | New approved copy |
|---|---|
| "Verification link send to your email. Please verify and login again." | "Verification email sent. Please check your inbox and verify your account." |
| "Please Verify Email with the link sent to your registered email address." | "Please verify your email address. Check your inbox for the verification link we sent." |

---

*Generated: NOTIFY QA Cycle 11*
