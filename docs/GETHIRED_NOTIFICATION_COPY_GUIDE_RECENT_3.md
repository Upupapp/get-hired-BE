# GetHired Notification Copy Guide — NOTIFY-3

## Principles (NOTIFY Standard)

1. No shame language ("You failed to...", "Invalid input", "Error")
2. Describe the outcome, not the system internals
3. Tell the user what happened AND what they can do next where possible
4. Use plain English — no jargon, no ALL CAPS for emphasis
5. Match the emotional register to the severity (error = calm and helpful, not alarming)
6. Specific counts for bulk operations — never summarize into "some" or "many"

---

## Copy Audit — Audited Messages

### Job Detail Error State

| Message | Principle violations | Quality |
|---|---|---|
| "Session required" | None | PASS |
| "Sign in to view this job." | None | PASS |
| "This job isn't available" | None | PASS |
| "It may have expired, been removed, or the link may be incorrect." | None | PASS |

All messages: calm, non-blaming, explain possible causes, give recovery paths.

### Bulk Import Toasts

| Message | Principle violations | Quality |
|---|---|---|
| "Contact added." | None | PASS |
| "N contacts added." | None | PASS |
| "N added. M couldn't be added." | Passive "couldn't be added" | MINOR — consider "N added, M failed" for brevity |
| "No new contacts were added. These contacts are already in your list." | None | PASS — explains why (duplication) |
| "This contact is already in your list." | None | PASS |
| "No contacts were added." | Could be more actionable | ACCEPTABLE — no recovery path offered, but appropriate for a generic failure |
| "Something went wrong please try again later or contact your administrator" | "Something went wrong" is vague | ACCEPTABLE for API errors — administrator contact is correct escalation |

### Auth Flow Toasts

| Message | Principle violations | Quality |
|---|---|---|
| "Your session has expired. Please sign in again to continue." | None | PASS — explains reason, gives action |
| "You've made too many requests. Please wait a moment and try again." | None | PASS — calm, specific action |
| "Please verify your email address. Check your inbox for the verification link we sent." | None | PASS (was improved in QA11) |
| "You are not Authorized to access that page. Please Login first" (auth.guard.ts) | "Authorized" capitalized, "Login" instead of "sign in" | DEFERRED D-02 |

---

## Copy Patterns Reference

### Partial success
Format: "{N} {noun} added. {M} couldn't be added."
Alternative: "{N} added, {M} failed. Check the CSV file for formatting issues."

### Duplicate
Format: "This {noun} is already in your list." (single)
Format: "No new {nouns} were added. These {nouns} are already in your list." (bulk)

### All failed (non-duplicate)
Format: "No {nouns} were added."
Enhancement opportunity: Add "Please check the file format and try again." — deferred.

### Session expired
Format: "Your session has expired. Please sign in again to continue."
Do NOT use: "Unauthorized", "403 error", "Token expired"

### Rate limited
Format: "You've made too many requests. Please wait a moment and try again."
Do NOT use: "Error 429", "Rate limit exceeded", "Blocked"
