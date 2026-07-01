# GETHIRED BRAND UX COPY GUIDE V6
**Date:** 2026-07-01

---

## Voice and Tone

**GetHired brand voice:** Confident, direct, modern, helpful. Not corporate, not casual-startup.
- **Do:** "Your company is live on GetHired." / "Connect with LinkedIn to speed things up."
- **Don't:** "Yay! You did it!" (childish) / "Please proceed with authentication." (corporate)

---

## V6 New Surface Copy Review

### LinkedIn Button Label
Current (from component HTML — inferred from SCSS class `.gh-linkedin-btn-label`):
- Likely: "Continue with LinkedIn" or "Sign in with LinkedIn"
- Brand standard: "Continue with LinkedIn" — matches Google button pattern ("Continue with Google")
- Verify both buttons use "Continue with" not "Sign in with" for consistency

### LinkedIn Complete Page — Loading State
Current `.li-complete-label` — content not audited in SCSS.

**Recommended copy:**
- Label: "Connecting your LinkedIn account…"
- NOT: "Loading…" / "Please wait"

### LinkedIn Complete Page — Error State
```
Title: "Couldn't connect LinkedIn"
Body: "Something went wrong while connecting your account. This is usually temporary."
CTA: "Try again"
Secondary: "Use email instead" (or "Go back to sign in")
```

**NOT:**
- "Error" (too generic)
- "LinkedIn authentication failed" (technical)
- "Your LinkedIn connection was unsuccessful" (passive)

### Company Setup Success Modal
**Eyebrow:** "Setup complete" ✅ (confirmed from .gh-setup-modal__eyebrow style — likely this text)
**Title:** "Welcome to GetHired, [Company Name]!" ✅ (company name highlighted with azure)
**Trial badge:** "14-day free trial active" or similar — amber styling ✅

**CTA Stack:**
- Primary: "Go to Dashboard" or "Post Your First Job" (action-oriented) ✅
- Secondary: "Invite Team Members" or "Explore Features" ✅
- Tertiary: "Take a tour" or "Skip for now" ✅
- Footer link: "Go to dashboard" (secondary escape) ✅

---

## Copy Rules for Auth Flows

| Pattern | Correct | Incorrect |
|---|---|---|
| Loading label | "Connecting your account…" | "Loading…" |
| Error title | Specific + short | "Error" |
| Retry CTA | "Try again" | "Retry" / "Retry operation" |
| Success label | "You're connected" | "Success!" |
| Button label | Verb + noun ("Post Job") | Just verb ("Post") or just noun ("Job") |

---

## Microcopy Standards

### Toast messages
- Success: "Company profile saved." (past tense, specific)
- Error: "Couldn't save. Try again." (brief, retry affordance)
- Warning: "You're offline. Changes will sync when you reconnect."
- Info: "LinkedIn connected. You can now sign in faster."

### Form validation
- Required: "This field is required."
- Invalid email: "Enter a valid email address."
- Password too short: "Password must be at least 8 characters."
- NOT: "Invalid input" / "An error occurred" / "Bad format"

### Empty states
- Jobs: "No jobs posted yet. Post your first job to get started."
- Applicants: "No applicants yet. Your job was just posted."
- Messages: "No messages. Start a conversation with an applicant."

---

## Capitalization Rules

- Button labels: Title Case ("Post Job", "Go to Dashboard")
- Eyebrow labels: ALL CAPS ("SETUP COMPLETE")
- Toast messages: Sentence case ("Company saved.")
- Error messages: Sentence case
- Page titles: Title Case
- Nav items: Title Case
