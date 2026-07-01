# GETHIRED MESSAGE DECISION MATRIX V6
**Date:** 2026-07-01

Use this matrix to decide which message type, channel, and copy pattern to use for any new communication surface.

---

## Decision Tree

```
Is the user waiting for an async operation?
├── Yes → Is it < 2 seconds expected?
│   ├── Yes → Inline spinner (no text needed unless > 1s)
│   └── No → L4 loading state with aria-live="polite" text
└── No → Did an action succeed or fail?
    ├── Success
    │   ├── Incidental (save, minor action) → L2 Toast ("Saved")
    │   ├── Major milestone (account created, subscription) → L5 Modal
    │   └── Auth success → Navigate silently (the destination IS the confirmation)
    └── Failure
        ├── Is it user-correctable?
        │   ├── Yes → L1 inline validation (field-level) or L3 alert banner
        │   └── No (system error) → L3 alert banner with contact/retry instruction
        └── Is it a full-page async failure (e.g. OAuth callback)?
            └── L4 error state with role="alert" + retry/back CTA
```

---

## Message Copy Decision Matrix

| Situation | What happened | Why | What next | Example |
|---|---|---|---|---|
| Auth error — user-correctable | State what failed specifically | Avoid blame | Offer specific retry action | "The sign-in link is expired. Please try again." |
| Auth error — system fault | Acknowledge system fault | Be honest | Offer retry + contact | "Something went wrong on our end. Please try again or contact support." |
| Loading state | Name the specific operation | Build trust | Implicit (spinner) | "Completing LinkedIn sign-in…" |
| Success — major milestone | Confirm the milestone | Validate effort | Give next step | "Welcome to GetHired, [name]" + checklist |
| Success — incidental | Confirm the action | Reassure | None needed | "Saved" / "Profile updated" |
| Validation error | State what's wrong with the field | Avoid guessing | Say what's expected | "Email is required" / "Password must be 8+ characters" |
| Empty state | Explain why empty | Orient the user | Give a way forward | "No jobs yet. Post your first job to get started." |
| Session expiry | Explain session ended | Don't punish | Invite re-login | "Your session expired. Please sign in again." |
| Sign-out | Confirm sign-out | Close the loop | None needed | "You have been signed out." |

---

## Copy Quality Rules

| Rule | Pattern | Anti-pattern |
|---|---|---|
| Every error answers 3 questions | What / Why / What next | "Error" / "Something went wrong" with no next step |
| No jargon in user-facing messages | "The sign-in session was already used." | "LinkedIn token replay detected." |
| No shame language | "You cancelled the sign-in." | "Invalid request" / "Bad input" |
| No bare technical terms | "LinkedIn didn't complete the sign-in." | "no_access_token" / "400 Bad Request" |
| No overpromise | "Free trial activated — 7 days full access" | "You're all set" when profile is incomplete |
| No non-existent features | "Please sign in with email and password." | "Link Google from your account settings." (removed V5) |
| Accessibility-first | role="alert" for errors, aria-live for loading | No announcement for dynamically injected errors |

---

## V6 Decisions Made

| Decision | Rationale |
|---|---|
| Keep "Sign in with LinkedIn" / "Sign up with LinkedIn" labels | Follows LinkedIn brand guidelines; Google uses GIS-rendered "Continue with Google" |
| Keep "Something went wrong on our end" for server_error | Honest, not technical, does not expose internals |
| Change eyebrow "You're all set" → "Welcome aboard" (deferred) | "You're all set" implies completion; checklist shows items to do |
| Add role="alert" to LinkedIn error block (applied) | Screen readers cannot announce dynamically swapped content without live region |
| No sign-out confirmation set (deferred) | Requires three file changes; low-severity UX gap |
