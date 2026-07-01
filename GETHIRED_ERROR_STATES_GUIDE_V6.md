# GETHIRED ERROR STATES GUIDE V6
**Date:** 2026-07-01

All error states audited, with V6 additions for LinkedIn OIDC.

---

## Error State Formula (NOTIFY Principle)

Every error must answer:
1. **What happened** — specific enough to orient the user
2. **Why it happened** — only if user-actionable; don't expose system details
3. **What to do next** — a clear path forward (retry, contact, alternative)

---

## V6: LinkedIn OIDC Error States

File: `src/app/auth/linkedin-complete/linkedin-complete.component.ts` (ERROR_MESSAGES record)

| Error Code | Current Message | Formula Met? | Gap | Recommendation |
|---|---|---|---|---|
| `not_enabled` | "LinkedIn sign-in is not currently available." | Partial — no what-to-do | No alternative offered | "LinkedIn sign-in is not currently available. Please sign in with your email and password." |
| `linkedin_denied` | "You cancelled the LinkedIn sign-in." | Yes | Button label "Try again" implies re-trying an error, but user cancelled deliberately | Consider "Back to sign-in" label variant |
| `missing_params` | "The sign-in link is incomplete. Please try again." | Yes | — | No change |
| `invalid_state` | "The sign-in request expired or is invalid. Please try again." | Yes | — | No change |
| `no_access_token` | "LinkedIn did not return an access token. Please try again." | Partial — technical | "access token" is jargon | "LinkedIn didn't complete the sign-in. Please try again." |
| `invalid_issuer` | "LinkedIn token validation failed." | No — no what-to-do | Missing what-next | "LinkedIn token validation failed. Please try again or contact support." |
| `invalid_audience` | "LinkedIn token validation failed." | No | Same as above | Same fix |
| `token_expired` | "The LinkedIn sign-in timed out. Please try again." | Yes | — | No change |
| `invalid_nonce` | "LinkedIn token replay detected. Please try again." | Partial | "replay detected" is jargon | "The sign-in session was already used. Please try again from the beginning." |
| `missing_sub` | "LinkedIn did not return a user ID." | Partial | No what-to-do | "LinkedIn didn't return a user ID. Please try again or contact support." |
| `missing_email` | "Your LinkedIn account must have a verified email address." | Yes | — | No change |
| `email_not_verified` | "Please verify your LinkedIn email address first." | Yes | — | No change |
| `server_error` | "Something went wrong on our end. Please try again." | Yes | — | No change |
| `missing_ticket` | "The sign-in link is missing a ticket. Please try again." | Yes | — | No change |
| `invalid_ticket` | "The sign-in link is expired or already used. Please try again." | Yes | — | No change |
| *(unknown)* | "LinkedIn sign-in failed. Please try again." | Partial | Generic fallback | Acceptable — no better message without code context |

### Accessibility (V6-NOT-001 — FIXED)

The error container previously had no `role="alert"`. Screen readers would not announce errors when the DOM swapped from loading to error state.

**Fix applied:** `<div role="alert" aria-atomic="true">` wraps the error icon, heading, and message.

---

## V6: Company Setup Modal — No Error State

The company setup modal is shown only after a successful setup. There is no error state in the modal itself. If setup fails, the error is handled in the parent company-setup component before the modal opens.

---

## V6: Sign-Out — No Error State

Sign-out is always "successful" from the FE perspective — it just clears localStorage and navigates. No error state exists or is needed.

---

## Full System Error State Inventory

| Surface | Error State | message | role="alert"? | What-happened | Why | What-next |
|---|---|---|---|---|---|---|
| Signin — email/password | Alert banner | Dynamic from BE | Yes (role="alert" on alert div) | Yes | Sometimes | Sometimes |
| Email verification reminder | Alert with resend link | "Please verify your email..." | Yes | Yes | Yes | Yes |
| Google auth — GIS failure | (missing) | — | — | — | — | — |
| Google auth — 409 conflict | Alert banner | "An account already exists..." | Yes | Yes | No | Yes |
| Google auth — generic | Alert banner | "Google sign-in did not complete." | Yes | Partial | No | Yes |
| LinkedIn auth (V6) | Full-screen card + role=alert | Per error code (14 codes) | YES (after fix) | Yes | Varies | Yes |
| Role classification submit | (missing error state) | — | — | — | — | — |
| Job apply | Toast | Context | Depends on toast lib | Yes | No | Partial |
| Job publish | Toast | Context | Depends on toast lib | Yes | No | Partial |
| Profile save | Toast | Context | Depends on toast lib | Yes | No | Partial |

---

## Error Copy Anti-Patterns Found in System

| Anti-pattern | Location | Status |
|---|---|---|
| "Error" with no context | Not found in V6 surfaces | Good |
| "Oops" for serious failures | Not found | Good |
| Non-existent feature referenced | "link Google from account settings" | Fixed V5 |
| Jargon: "replay detected" | invalid_nonce error | Open |
| Jargon: "access token" | no_access_token error | Open |
| No what-next for validation failures | invalid_issuer/audience/missing_sub | Open |
