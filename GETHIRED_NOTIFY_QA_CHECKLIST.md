# GETHIRED_NOTIFY_QA_CHECKLIST.md
## QA Cycle 11 — Manual QA checklist for messaging areas

---

## How to use this checklist

Run through these checks manually in a browser before marking any messaging
feature as release-ready. Each check should take under 2 minutes.

---

## A — Recruiter Messages Inbox (/recruiter/messages)

### A1 — Loading state
- [ ] On first load, skeleton rows appear (not a blank page or spinner)
- [ ] Skeleton has aria-busy="true" (inspect element)
- [ ] Loading disappears once threads arrive

### A2 — Error state
- [ ] Simulate API error (DevTools → block `recruiter/threads` request)
- [ ] Error panel shows "We couldn't load your messages" heading
- [ ] "Please try again..." body is visible
- [ ] "Try again" button is enabled
- [ ] Clicking "Try again" shows "Trying…" (button disabled) then either loads or re-errors
- [ ] "Back to dashboard" navigates to /recruiter/dashboard

### A3 — Empty state (no threads)
- [ ] With empty thread list, "No messages yet" heading appears
- [ ] Both "Review applicants" and "View jobs" CTAs are clickable
- [ ] No broken image or missing icon in empty state

### A4 — Thread list (threads exist)
- [ ] Thread rows show applicant name when available
- [ ] Thread row shows "Candidate XXXXXX" (6-char uid) when name is null
- [ ] Thread row shows email-as-name when name is null but email is present
- [ ] "Needs reply" badge appears for threads where applicant spoke last
- [ ] Job chip shows job title
- [ ] Time shows correctly in shortTime format

### A5 — Avatar
- [ ] Avatar shows initial letter 'C' when no photo URL
- [ ] Avatar shows photo when photo URL is valid
- [ ] When photo URL is broken (test with a 404 URL): initial letter fallback shows, no broken-image icon
- [ ] Avatar marked aria-hidden="true" (inspect element)

### A6 — Filtering
- [ ] "All" chip shows all threads
- [ ] "Needs reply" chip filters to threads where needsReply=true only
- [ ] When "Needs reply" has no matches: filter-empty state shows with "View all messages" CTA
- [ ] Switching filters does not deselect thread (on desktop)

### A7 — Thread detail pane (desktop)
- [ ] Idle pane shows "Select a conversation to read and reply."
- [ ] Selecting thread shows applicant name in header
- [ ] message-thread component loads and shows messages

### A8 — Mobile
- [ ] At <768px, thread list shows instead of idle detail pane
- [ ] Tapping a thread slides/reveals the detail pane
- [ ] "Back to messages" button returns to thread list
- [ ] Bottom nav "Messages" item shows active state on /recruiter/messages

---

## B — Interview Hub (/recruiter/interview)

### B1 — Loading state
- [ ] Skeleton shows chips (3) + cards (3) while loading
- [ ] aria-busy="true" on skeleton container (inspect)

### B2 — Error state
- [ ] Block `/interview/hub` → error panel shows
- [ ] "We couldn't load interview activity." heading visible
- [ ] "Try again" and "Back to dashboard" both work

### B3 — Empty state
- [ ] With no applicants: "No interview activity yet" heading visible
- [ ] "Candidates will appear here…" body explains the trigger
- [ ] "Review applicants" and "View jobs" CTAs work

### B4 — Content view
- [ ] All applicants shown under "All applicants" filter
- [ ] "Video answers" filter shows only applicants with hasVideoAnswers=true
- [ ] "Under review" filter shows only applicants with applicationStatusId=3
- [ ] When active filter returns zero: "No candidates match this filter." shown
- [ ] Video badge shows correct count (N video response / N video responses)
- [ ] "View applicants" and "Review responses" links navigate correctly

---

## C — Mobile Sidebar (B02)

### C1 — Hamburger button
- [ ] Hamburger is visible at <768px viewport
- [ ] Clicking hamburger opens drawer from left
- [ ] aria-expanded changes to "true" when open
- [ ] aria-label changes to "Close navigation menu" when open

### C2 — Drawer
- [ ] Drawer has aria-label="Employer navigation"
- [ ] All nav items visible: Dashboard, Jobs, Candidates, Messages, Company, Subscription
- [ ] Each nav item is keyboard focusable (Tab through)
- [ ] Clicking nav item closes drawer + navigates
- [ ] Active page item has aria-current="page"

### C3 — Close behaviors
- [ ] Close (X) button inside drawer closes drawer
- [ ] Pressing Escape closes drawer
- [ ] Clicking scrim closes drawer
- [ ] After close, focus returns to hamburger button

### C4 — Focus trap
- [ ] When drawer opens, focus moves to first nav item (Dashboard)

---

## D — Rate limiting (SEC-01)

### D1 — 429 snackbar
- [ ] Simulate 429 response (DevTools → intercept and return 429)
- [ ] Snackbar appears: "You've made too many requests. Please wait a moment and try again."
- [ ] Snackbar dismisses after 5 seconds
- [ ] User is NOT logged out after a 429

### D2 — Auth 429
- [ ] Make 21 auth requests in 15 min → backend returns 429
- [ ] Same snackbar appears (note: auth limiter has different copy from backend;
      the interceptor uses the generic copy — acceptable)

---

## E — Auth messages

### E1 — Email verification
- [ ] Resend verification → snackbar: "Verification email sent. Please check your inbox and verify your account."
- [ ] NOT "Verification link send to your email…" (old typo)

### E2 — Email not verified on signin
- [ ] Attempt signin before verifying email → error: "Please verify your email address. Check your inbox for the verification link we sent."
- [ ] NOT "Please Verify Email with the link…" (old casing/phrasing)

---

## F — Accessibility spot-checks

### F1 — Screen reader announcements
- [ ] Activating error states → AT announces the error (role="alert")
- [ ] Loading conversation in message-thread → AT announces "Loading conversation…"
- [ ] Send error in message-thread → AT announces error

### F2 — Keyboard navigation
- [ ] All new components fully navigable by Tab + Enter/Space
- [ ] No focus traps outside the mobile drawer (where trap is intentional)

---

*Generated: NOTIFY QA Cycle 11*
