# GETHIRED EMAIL NOTIFICATION AUDIT V6
**Date:** 2026-07-01

Email notification audit updated for V6. No new email types introduced in V6 — LinkedIn auth uses the same welcome email flow as Google auth.

---

## Email Notification Inventory (Full System)

| Trigger | Template | Sent by | When | Quality |
|---|---|---|---|---|
| Email registration | verification | SendGrid (mailer.js) | At registration | Good |
| Google auth — new user | welcome | SendGrid via chooseRole | After role selection | Good |
| LinkedIn auth — new user | welcome | SendGrid via linkedinAuthController | After account creation or role selection | See §1 below |
| Job application received | (application notification) | SendGrid | When applicant applies | Good |
| Interview invitation | (interview email) | SendGrid | When recruiter invites | Good |
| Subscription renewal | (renewal notification) | SendGrid | On PayMongo webhook | Good |
| Subscription expired | (expiry notification) | SendGrid | On expiry event | Good |
| Password reset | reset | SendGrid | On request | Good |

---

## §1 LinkedIn Auth Welcome Email (V6 New)

**Source:** `linkedinAuthController.js` — `send(email, 'welcome', { name: firstName || 'there', email })`

| Check | Status |
|---|---|
| Non-fatal (try/catch or .catch) | Yes — review shows error in send() does not throw |
| Sent after account creation | Yes — called in the new-user path |
| Also sent on role_required flow completion | Yes — sent when `linkedinChooseRole` finalises the account |
| First name personalisation | Yes — uses LinkedIn inferredFirstName, falls back to 'there' |
| Consistent with Google auth welcome email | Yes — same template, same helper |

No gaps found. LinkedIn welcome email is correctly wired.

---

## §2 Email Template Quality (Not Changed in V6)

| Template | Subject line | Personalisation | Actionable | Quality |
|---|---|---|---|---|
| welcome | (not audited directly) | name | Depends on template | Not changed V6 |
| verification | (not audited directly) | email | Verify link | Not changed V6 |
| reset | (not audited directly) | email/name | Reset link | Not changed V6 |

Email template copy was audited in V5. No changes in V6.

---

## §3 Missing Email Notifications

| Trigger | Email? | Gap | Priority |
|---|---|---|---|
| LinkedIn account linked (existing user) | Unknown | May not send | Low |
| LinkedIn account unlinked | No | Not needed | N/A |
| Trial period ending (3-day warning) | Unknown | Would be valuable | Medium |
| Application status changed | Unknown | Would be valuable | Medium |

---

## Hard Rules (Never Violated)

- No real emails sent during audit
- No secrets exposed
- No email addresses logged or stored beyond DB
- SendGrid API key is env-var only, not in code
