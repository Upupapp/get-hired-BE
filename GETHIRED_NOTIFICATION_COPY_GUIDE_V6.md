# GETHIRED NOTIFICATION COPY GUIDE V6
**Date:** 2026-07-01

Reference copy guide for all standard notification scenarios. Use this guide when writing new messages to maintain voice consistency.

---

## GetHired Voice

- Direct and warm, never clinical
- First-person perspective ("You cancelled", "Your session expired")
- Action-oriented ("Please try again", "Post your first job")
- Honest — never overpromises, never hides bad news
- No shame language, no "Oops", no "Uh oh"
- Role-aware (differentiate employer / applicant context where relevant)

---

## Standard Copy Patterns

### Auth — Loading
```
"Signing in…"
"Completing LinkedIn sign-in…"
"Connecting to Google…"
"Verifying your account…"
```

### Auth — Success
```
"Sign in was successful."
"Welcome to GetHired, [name]."
"Your account is ready."
```

### Auth — Error (user-correctable)
```
"The sign-in link is expired or already used. Please try again."
"Your LinkedIn account must have a verified email address."
"You cancelled the LinkedIn sign-in."
```

### Auth — Error (system fault)
```
"Something went wrong on our end. Please try again."
"LinkedIn token validation failed. Please try again or contact support."
"Google sign-in is unavailable. Please sign in with your email and password."
```

### Session / Auth State
```
"Your session expired. Please sign in again."
"You have been signed out."
"Please sign in to continue."
```

### Company / Employer Onboarding
```
"Welcome aboard, [companyName]."   (eyebrow — replaces "You're all set")
"Company created."
"Free trial activated — 7 days full access."
"Post your first job to attract candidates."
```

### Subscription
```
"Your trial ends in [N] days."
"Your subscription has been renewed."
"Your subscription expired. Renew to continue posting."
```

### Job Actions
```
"Job published successfully."
"Your application was submitted."
"Job closed."
```

### Profile / Account
```
"Profile saved."
"Password updated."
"Email verification sent. Check your inbox."
```

### Empty States
```
"No jobs posted yet. [Post a job →]"
"No applications yet. [Browse jobs →]"
"No candidates in pipeline yet."
"No messages yet. Start a conversation."
```

---

## V6 New Copy (Confirmed / Recommended)

| Surface | Current copy | Recommended V6 copy | Status |
|---|---|---|---|
| LinkedIn complete — eyebrow (none) | N/A | N/A | N/A |
| LinkedIn error — invalid_nonce | "LinkedIn token replay detected. Please try again." | "The sign-in session was already used. Please try again from the beginning." | Deferred |
| LinkedIn error — invalid_issuer | "LinkedIn token validation failed." | "LinkedIn token validation failed. Please try again or contact support." | Deferred |
| LinkedIn error — missing_sub | "LinkedIn did not return a user ID." | "LinkedIn didn't return a user ID. Please try again or contact support." | Deferred |
| Company modal eyebrow | "You're all set" | "Welcome aboard" | Deferred |
| Company modal tertiary CTA | "View public profile" | "View your public page" | Deferred |
| Sign-out confirmation | (none) | "You have been signed out." | Deferred |
| Session expiry (401 interceptor) | (none) | "Your session expired. Please sign in again." | Deferred |

---

## Copy Length Guidelines

| Type | Max characters |
|---|---|
| Toast message | 80 chars |
| Alert banner | 160 chars |
| Error card message (L4) | 200 chars |
| Loading text | 40 chars |
| Success eyebrow | 20 chars |
| Success title | 50 chars |
| CTA label | 30 chars |
| Checklist item | 40 chars |
