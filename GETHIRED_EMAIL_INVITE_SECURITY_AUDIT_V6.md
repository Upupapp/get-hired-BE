# GETHIRED EMAIL INVITE SECURITY AUDIT — V6
**Date:** 2026-07-01 | **No new email invite surface in V6 delta**

---

## V6 Delta Assessment

LinkedIn OIDC sends one email: a welcome email via `send(email, 'welcome', { name, email })` in `createLinkedinUser()`. This is a non-fatal informational email, not an invite or auth email. No new invite security surface introduced.

---

## Welcome Email — LinkedIn

| Control | Implementation | Assessment |
|---|---|---|
| Email from LinkedIn (verified) | `emailVer` checked in callback — `email_not_verified` returns error | PASS |
| PII in email | Only `firstName` and `email` passed to template | PASS |
| Email in logs | Not logged | PASS |
| Send is non-fatal | Wrapped in try/catch, failures ignored | PASS (UX concern only) |

---

## V5 Invite Status (carried forward)

| Finding | Status |
|---|---|
| Hardcoded invite password | FIXED V2 |
| Firebase password reset link for invited users | VERIFIED PRESENT |
| Invite token expiry | Firebase link expiry (1 hr) — PASS |
| Invite email enumeration | ACCEPTABLE (by design — employer must invite by email) |
