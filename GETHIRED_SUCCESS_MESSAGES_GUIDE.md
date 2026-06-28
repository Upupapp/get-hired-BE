# GETHIRED_SUCCESS_MESSAGES_GUIDE.md
## QA Cycle 11 — Success message inventory and guide

---

## Principles applied

1. Confirm what happened, not just that "it worked".
2. Success messages should be brief and non-intrusive (snackbar preferred over modal).
3. Never fake success (never show "Sent!" before the server confirms).
4. After a send, scroll to the new message — visual confirmation replaces a toast.

---

## Success message inventory in new deployment scope

---

### message-thread — message sent successfully

Current behavior:
- New message is appended to `this.messages` array immediately when server returns
- `this.newBody = ''` clears the composer
- `this.shouldScroll = true` scrolls to the new message
- NO toast / snackbar shown

Assessment: Scrolling to the sent message is a valid implicit success signal.
The cleared composer + visible bubble is sufficient feedback.
**PASS — intentional design**

---

### message-thread — no dedicated success toast

The component uses the "scroll + clear" pattern. This matches how major messaging
apps (Slack, WhatsApp) work. A "Message sent!" toast would be redundant and
would obstruct the UI.
**Correct design choice**

---

### Recruiter Messages retry success

Current behavior:
- `loadThreads()` sets `this.loading = true` + `this.error = false`
- On success: threads load and render, error panel disappears
- No "Success — messages loaded" toast

Assessment: Correct. Loading → content transition is its own success state.
**PASS**

---

### Legacy / existing success messages (outside new scope)

| Location | Current text | Assessment |
|---|---|---|
| Signin success | "Login was successful." (stored in localStorage) | Functional but relies on localStorage — fragile |
| Email verify send | "Verification link send to your email. Please verify and login again." | Typo: "send" should be "sent" — see FIX LOG |
| Signup complete | (depends on auth facade) | Out of scope for this cycle |

---

## Recommended improvements

| Change | Priority |
|---|---|
| Fix typo "send" → "sent" in email verification snackbar | LOW (cosmetic) |
| Consider a subtle "Loaded" aria-live announcement when thread list refreshes | LOW |

---

*Generated: NOTIFY QA Cycle 11*
