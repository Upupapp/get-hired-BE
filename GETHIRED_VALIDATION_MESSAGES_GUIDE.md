# GETHIRED_VALIDATION_MESSAGES_GUIDE.md
## QA Cycle 11 — Validation message inventory and guide

---

## Principles

1. Validation messages must describe what is wrong and how to fix it.
2. Never use generic "Invalid input" or "Required field".
3. Never blame the user — describe the requirement.
4. Validate on blur (not on submit) for large forms.
5. Backend validation errors must use the same friendly copy as frontend errors.

---

## Frontend validation inventory (new scope)

### message-thread composer
```html
<textarea maxlength="4000" placeholder="Write a message…"></textarea>
<button [disabled]="!threadId || sending || !newBody.trim()">Send</button>
```

- Client-side: Send button disabled until text is non-empty (trim check)
- maxlength="4000" prevents over-length input silently — no error message shown
- No visible validation error for empty send attempt (button stays disabled)
- **PASS** (button disable is sufficient for short-text inputs)
- **GAP:** If user manages to submit 4001+ chars via API bypass, backend returns
  "Message is too long. Please keep it under 4000 characters." — not currently
  displayed to user in FE (message-thread only shows "Could not send your message")

---

### Auth forms — signin
- email: Validators.required + Validators.email
- password: Validators.required + Validators.minLength(8)
- Error display: depends on template (not in scope of this cycle)
- **OUT OF SCOPE** — baseline auth forms, not new deployment

---

## Backend validation messages (API contract)

| Error code | HTTP status | Message to FE |
|---|---|---|
| MESSAGE_BODY_REQUIRED | 400 | "Message cannot be empty." |
| MESSAGE_BODY_TOO_LONG | 400 | "Message is too long. Please keep it under 4000 characters." |
| FORBIDDEN | 403 | "You don't have access to this conversation." |
| THREAD_NOT_FOUND | 404 | "Conversation not found." |
| (unknown error) | 500 | "Operation not successful. Please try again." |

Assessment:
- "Message cannot be empty." — clear, actionable ✓
- "Message is too long. Please keep it under 4000 characters." — specific limit stated ✓
- "You don't have access to this conversation." — clear and safe (no internal info) ✓
- "Operation not successful. Please try again." — generic fallback, acceptable ✓
- **BE validation messages: PASS**

### Gap: FE does not display specific BE validation errors
`message-thread.component.ts` catches all send errors as:
```
this.error = 'Could not send your message. Please try again.';
```
If the backend returns 400 with "Message is too long", the user sees the generic
message instead of the helpful specific one.

**Recommended fix:** In `message-thread.send()` error callback, read `err.error?.message`
and display it if it's a 400-class user-facing message. Guard against exposing
5xx stack traces.

---

## Rate-limit 429 as a "validation" failure

When the user sends too many messages:
- Backend: 429 `{ message: 'Too many requests. Please try again later.' }`
- FE: shows generic "Could not send your message. Please try again."
- User has no idea they need to wait

**Recommended copy when 429 detected:**
"You're sending messages too quickly. Please wait a moment and try again."

---

*Generated: NOTIFY QA Cycle 11*
