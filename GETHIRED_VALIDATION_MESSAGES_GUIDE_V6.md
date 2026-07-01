# GETHIRED VALIDATION MESSAGES GUIDE V6
**Date:** 2026-07-01

Validation messages cover L1 (inline field feedback) and L3 (form-level validation errors). No new validation surfaces introduced in V6 — LinkedIn OIDC and company setup modal do not add form fields.

---

## V6 New Surfaces — Validation Assessment

| Surface | Form fields? | Validation messages? | Assessment |
|---|---|---|---|
| LinkedIn complete page | None (callback page) | N/A | No validation needed |
| Company setup success modal | None (read-only display) | N/A | No validation needed |
| Sign-out | None | N/A | Not applicable |

---

## Backend Validation for LinkedIn Auth (V6)

File: `linkedinAuthController.js`

The BE validates:

| Input | Validation | Error Sent | FE Error Message |
|---|---|---|---|
| `ticket` param in POST /complete | Must be valid JWT, not expired, not used | 400 `{ error: 'invalid_ticket' }` or similar | FE maps to "The sign-in link is expired or already used." |
| LinkedIn state JWT | Must be valid HS256, not expired | Redirects with `?error=invalid_state` | "The sign-in request expired or is invalid." |
| LinkedIn email from userinfo | Must be present and verified | Redirects with `?error=missing_email` | "Your LinkedIn account must have a verified email address." |

Backend validation is complete and well-structured. No gaps.

---

## Full System Validation Messages (V5 carry-forward)

| Surface | Field | Current Validation Message | Quality |
|---|---|---|---|
| Signin email | Email format | Angular `Validators.email` — generic browser message or none | Poor — no custom error displayed |
| Signin password | Min 8 chars | Angular `Validators.minLength(8)` — generic | Poor |
| Signup email | Required + format | Unknown (not audited in V6) | Unknown |
| Role classification | Role must be selected | Unknown | Unknown — V5 gap |
| Job post title | Required | Unknown | Unknown |
| Company name | Required | Unknown | Unknown |

---

## Validation Message Standards

| Do | Don't |
|---|---|
| "Email is required" | "This field is invalid" |
| "Password must be at least 8 characters" | "Minimum length not met" |
| Show error on blur (not on every keystroke) | Show red error before user has finished typing |
| Mark field with aria-describedby pointing to error | Red border with no text explanation |
| "Enter a valid email address (e.g., name@company.com)" | "Invalid email" |
| Field-level error clears when field is corrected | Persistent error after correction |

---

## V6 Recommendation

No new validation messages to add. The BE LinkedIn validation is thorough and the errors are cleanly mapped on the FE. The main outstanding validation gap (signin form field errors not displayed inline) is a V5 carry-forward item, not a V6 surface.
