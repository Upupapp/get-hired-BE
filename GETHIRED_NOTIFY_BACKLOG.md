# GETHIRED_NOTIFY_BACKLOG.md
## QA Cycle 11 — Messaging backlog items

---

## Priority: HIGH (affects UX meaningfully)

### H1 — message-thread: surface specific 400/429 error messages from backend
**Current:** All send errors → "Could not send your message. Please try again."
**Desired:** 429 → "You're sending messages too quickly. Please wait a moment."
            400 (too long) → "Message is too long. Please keep it under 4000 characters."
**Effort:** Low — check err.status in error callback, guard against 5xx leak.
**File:** `message-thread.component.ts` send() error callback

### H2 — Transactional email: new message notification
**Current:** No email alert when a new message is received.
**Desired:** Recruiter gets email when applicant sends message (and vice versa).
**Effort:** High — requires email provider (SendGrid), template, unsubscribe mechanism.
**Blocker:** Product decision on email provider.

### H3 — Applicant name fallback improvement
**Current:** "Candidate A1B2C3" when name and email are both null.
**Desired:** Show email address as name when available (BE already returns
            applicantEmail — FE ignores it when applicantName is null).
**Effort:** Low — update `applicantLabel()` in recruiter-messages.component.ts
**File:** `recruiter-messages.component.ts` applicantLabel() method
**Note:** Backend already sends email; just update the FE fallback chain.

### H4 — Auth loginError sanitisation
**Current:** Raw server error string stored in localStorage and displayed in signin form.
**Desired:** Only predefined safe strings displayed; unknown errors map to generic copy.
**Effort:** Medium — audit AuthFacade error$ pipeline and sanitize at source.

---

## Priority: MEDIUM (quality/experience improvement)

### M1 — Interview Hub filter empty state: add CTA
**Current:** "No candidates match this filter." — no CTA.
**Desired:** Add "Show all applicants" button that resets to 'all' filter.
**Effort:** Low — one line of HTML + handler call.

### M2 — message-thread: add a Retry button when thread fails to open
**Current:** "Could not open this conversation. Please try again." — no retry button.
**Desired:** Retry button that calls resetForNewThread() again.
**Effort:** Low.

### M3 — Employer panel error: add explicit Retry button
**Current:** "We couldn't load your profile. Please refresh the page or sign in again."
            Only a text link to signin; no retry button.
**Desired:** "Try again" button that calls employeeFacade.getEmployeeProfile() again.
**Effort:** Medium — requires propagating retry to EmployerPanelComponent.

### M4 — Backend error envelope: normalize to single shape
**Current:** Success uses `data`, known errors use `message`+`code`, 500 uses `error`.
**Desired:** All errors use `{ success: false, message: "...", code: "..." }`.
**Effort:** Low BE change — update helpers/status.js errorMessage shape.

### M5 — Add global Express error handler
**Current:** Unhandled throws return Express's default HTML error page.
**Desired:** Catch-all middleware returning JSON with generic message.
**Effort:** Low — add `app.use((err, req, res, next) => {...})` in server.js.

---

## Priority: LOW (polish / future features)

### L1 — Unread message count badge in sidebar + bottom nav
**Blocker:** No is_read column in messages schema. Needs schema migration first.
**Note:** BACKLOG-02 from B01; already documented in component comments.

### L2 — Transactional email: application status change
**Current:** No notification when application status changes.
**Desired:** Applicant gets email when status moves (Applied → Under Review → etc.)

### L3 — Transactional email: application submission confirmation
**Current:** No confirmation email when applicant submits.
**Desired:** "Your application for [job title] at [company] has been received."

### L4 — Transactional email: interview video submission confirmation
**Current:** No confirmation email when video answers submitted.

### L5 — Email notification preferences
**Current:** No settings screen for notification opt-in/out.
**Desired:** Toggle per notification type in applicant/recruiter settings.

### L6 — "Subscription & Billing" accessible from mobile Interview Hub cards
**Current:** Interview Hub cards link to Messages but not to a subscription upsell.

### L7 — Sidebar "Interviews" icon image placeholder
**Current:** Sidebar uses applicants.png as the icon for "Interviews" item.
            (icon: 'applicants.png', class: 'interviews')
**Desired:** Use a camera/play icon image instead of the people icon.

---

*Generated: NOTIFY QA Cycle 11*
