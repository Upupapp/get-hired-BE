# GetHired Employer Signup Simplification Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** IMPLEMENTED

---

## Fields Before/After

### Fields (unchanged — backend-required fields preserved)
- firstName (required)
- lastName (required)
- email (required, email format)
- password (required, strong password regex)
- confirmPassword (required, must match)
- role (required, pre-populated via ?role=2 query param for employer path)
- agreeToTerms (required checkbox)
- recaptcha (required)

**No fields were added or removed. Backend contract preserved.**

---

## V5 UI Changes to Signup (employer-specific, safe)

### Title
- Before: "{{ 'CREATE_ACCOUNT.CREATE_ACCOUNT_TEXT' | translate }}" (generic for all roles)
- After: "Create your employer account" when role===2, falls back to generic translation for all other cases
- Change: *ngIf="role_validators?.value === 2" conditional in template

### Subtitle (new)
- Before: No subtitle
- After: "Start hiring in minutes. Post your first job and reach qualified candidates." shown only when role===2
- Implementation: `.gh-signup-subtitle` CSS class in signup.component.scss

### Submit Button
- Before: `{{ 'CREATE_ACCOUNT.REGISTRATION_BUTTON' | translate }}` (generic), no loading text, no gh-pressable
- After: "Create employer account" / "Creating account..." when role===2. Generic translation + "Creating account..." for other roles. gh-pressable class added. aria-busy="true" during submit.
- Accessibility: Loading state communicated via text change + aria-busy, not motion-only

### Secondary CTA (sign in link)
- Before: Generic "{{ 'CREATE_ACCOUNT.LOGIN_PROMPT' | translate }} [Login link]"
- After: "Already have an employer account? Sign in" when role===2; generic for other roles

---

## Route Behavior

- Signup route: `/signup?role=2` (unchanged)
- UnauthGuard: unchanged (prevents already-authed users)
- Post-signup redirect: `/verify?mode=registered` (unchanged — backend verifies email)
- ?role=2 query param pre-populates role FormControl (existing behavior, documented in V4)

---

## Frontend Effects

| Effect | Where | Reduced-Motion Fallback |
|--------|-------|------------------------|
| Submit button micro-scale press (gh-pressable) | .btn-submit | transition: none (no scale) |
| Loading state text change | Button text | N/A — text change is always shown |
| aria-busy announcement | Screen reader | Always announced, no animation |
| Form field focus glow | Existing `input:focus` border in signup.component.scss | Border is non-animated, always safe |

---

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `get-hired-FE/src/app/auth/signup/signup.component.html` | Employer-specific title, subtitle, button text, signin link | Low — additive, *ngIf conditional, no field removal |
| `get-hired-FE/src/app/auth/signup/signup.component.scss` | Added `.gh-signup-subtitle`, `.btn-submit` reduced-motion override | Low — additive styles only |

---

## Safety Verification

- Applicant signup (`?role=3` or no role param): role_validators?.value !== 2, so all new UI is hidden — generic title/button/link shown as before
- Backend contract: unchanged (same fields, same endpoint)
- Auth architecture: unchanged
- Error handling: unchanged (showError() method, error alert, onAlertClose())
- Recaptcha: unchanged

---

## Verification Steps

1. Navigate to `/signup?role=2` — see "Create your employer account" title, subtitle, employer button/link
2. Navigate to `/signup?role=3` — see generic title, generic button, generic sign in link
3. Navigate to `/signup` (no role param) — see generic title/button/link (role_validators?.value is null)
4. Submit with role=2 — see "Creating account..." during submit, aria-busy set
5. Submit button has gh-pressable micro-scale on press
6. prefers-reduced-motion: button transform disabled, form still works
