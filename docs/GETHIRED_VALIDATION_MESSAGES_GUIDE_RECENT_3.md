# GetHired Validation Messages Guide — NOTIFY-3

## Signup Form — signup.component.html

### Trigger Pattern
All validation messages use: `(fieldValidator?.invalid && fieldValidator?.touched) || fieldValidator?.dirty`

This prevents messages showing before the user has interacted with a field, but allows them as soon as the user starts typing (dirty) or leaves a field (touched). This is correct behavior per NOTIFY standards.

### Validation Message Inventory

| Field | Trigger | Message | Quality |
|---|---|---|---|
| First Name | required | "First Name is required" | Clear |
| Last Name | required | "Last Name is required" | Clear |
| Email | required | "Email is required" | Clear |
| Password | required | "Password is required" | Clear |
| Password | pattern | "Password must be 8 characters long with mixed uppercase, special characters and numbers." | Describes all requirements. Slightly long but comprehensive. |
| Confirm Password | required | "Re-enter Password is required" | Clear (says "Re-enter" to distinguish from Password) |
| Confirm Password | notEquivalent | "Passwords do not match" | Clear |
| Role | required | "Role is required" | Adequate (could say "Please select a role" for clarity) |

### Pattern Requirement

Password validator: `/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/`

Requirements (all must be met):
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- Minimum 8 characters

The validation message enumerates all requirements in prose. A bullet list would be more scannable, but the current prose is functional.

### Confirm Password — Password Visibility Toggle

**Issue:** Both password and confirm-password fields share the same `inputType` variable. When the user toggles visibility on one field, both fields change. This is unexpected UX but not a NOTIFY message issue. Noted for backlog.

---

## Contact/Candidate Import Forms

| Field | Validation | Message |
|---|---|---|
| Email | email + required | No explicit message shown — Angular Material handles inline |
| First Name | required | No explicit message in template (gap) |
| Group Name (contact) | required | No explicit message in template (gap) |
| Job ID (candidate) | required | No explicit message in template (gap) |

**Gap:** The import forms dispatch on button click without surfacing individual field validation errors to the user. The forms won't submit while invalid (Angular form validation prevents it), but the user sees no guidance about which field is wrong. This is a pre-existing UX gap, not introduced in this deployment.

---

## WCAG 2.1 Validation Checklist (SC 3.3.1, 3.3.2)

| Criterion | Signup | Import dialogs |
|---|---|---|
| Errors identified in text | YES | PARTIAL (some fields have no error text) |
| Field labels present | YES | YES (form labels) |
| Suggestions provided | YES (password pattern) | NO |
| Error prevention for legal/financial | N/A | N/A |
