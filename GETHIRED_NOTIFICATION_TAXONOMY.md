# GETHIRED_NOTIFICATION_TAXONOMY.md
## QA Cycle 11 — Notification taxonomy for the full GetHired platform

---

## Taxonomy overview

Messages in GetHired fall into five tiers. This document maps every notification
type to its tier, channel, and current implementation status.

---

## Tier A — System state (loading / error / empty)
User sees these without any action. They communicate application health.

| Sub-type | Channel | Examples in codebase |
|---|---|---|
| Loading skeleton | Inline HTML | Interview Hub chips+cards skeleton; Messages inbox skeleton rows |
| Loading spinner | Inline HTML (`app-loading`) | Panel fallback loading |
| Error with retry | Inline HTML + role="alert" | Messages inbox error; Interview Hub error; message-thread component |
| Error without retry | Inline HTML | Panel error fallback; message-thread open-thread error |
| Global empty (first use) | Inline HTML | Messages "No messages yet"; Interview Hub "No interview activity yet" |
| Filtered empty | Inline HTML | Messages "No messages match this filter"; Interview Hub "No candidates match this filter" |

---

## Tier B — Action feedback (success / failure on user-initiated action)
User triggered something; they get immediate feedback.

| Sub-type | Channel | Examples |
|---|---|---|
| Inline success | Snackbar (MatSnackBar) | (not used in new components) |
| Inline error | Inline text | message-thread send error; "Could not open this conversation" |
| Send in progress | Button state change | Sending… / Send; Trying… / Try again |
| Form validation | Inline under field | Auth forms (Validators.required, Validators.email) |

---

## Tier C — Session and auth (auth events, session expiry)
System-initiated; high urgency; always shown regardless of page.

| Sub-type | Channel | Examples |
|---|---|---|
| Session expiry | MatSnackBar (danger) | 401/403 → "Your session has expired. Please sign in again to continue." |
| Auth rate limit | None (GAP) | 429 on /api/auth/* — not handled in FE |
| Email not verified | Inline alert | Signin → "Please Verify Email…" |
| Email verify sent | MatSnackBar | "Verification link send to your email…" |

---

## Tier D — Guidance (empty-state CTAs, onboarding prompts)
User has nothing to see; we guide them to the next productive step.

| Sub-type | Channel | Examples |
|---|---|---|
| Global empty with CTAs | Inline HTML | Messages inbox → "Review applicants" + "View jobs" |
| First-use interview hub | Inline HTML | Interview Hub → "Review applicants" + "View jobs" |
| Idle detail pane | Inline text | "Select a conversation to read and reply." |
| No thread started | Inline text | "No messages yet. Say hello to get the conversation started." |

---

## Tier E — Email / push notifications
Async, out-of-band. Currently firebase-auth emails only; no transactional email system.

| Sub-type | Channel | Status |
|---|---|---|
| Email verification | Firebase Auth email | Active |
| Password reset | Firebase Auth email | Active |
| New message notification | None | Not implemented |
| Application status change | None | Not implemented |
| Interview submission confirmation | None | Not implemented |

---

## Decision: severity/urgency mapping

| Severity | Pattern | Implementation |
|---|---|---|
| Critical (auth, data loss) | role="alert", snackbar danger | Unauthorized interceptor |
| High (action failed) | Inline error text | message-thread, recruiter-messages |
| Medium (load failed, retry available) | Inline error + retry button | Interview Hub, Messages inbox |
| Low (filter empty, idle pane) | Inline text, no color/icon emphasis | Messages idle pane, filtered empty |
| Informational (success, status) | Snackbar neutral, or badge | Needs-reply badge, Sending… state |

---

## Gaps in taxonomy

1. **429 rate-limit** — no tier exists; falls to generic error.
2. **Email notifications** — firebase auth only; no transactional email for messages, applications, or interview submissions.
3. **Push/in-app notifications** — no real-time badge or unread count anywhere (no is_read column; noted in BACKLOG-02).
4. **Legacy empty-section component** — alt text missing on empty image; used across applicant/admin panels.

---

*Generated: NOTIFY QA Cycle 11*
