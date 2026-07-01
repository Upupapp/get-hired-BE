# GETHIRED MOBILEVIEW — AUTH AUDIT V6 (NEW)
**Date:** 2026-07-01 | **Scope:** LinkedIn button (signin/signup) + LinkedIn complete page

---

## Overview

V6 introduces full mobile audit coverage for two new auth surfaces:
1. **LinkedIn button component** — appears on both `/signin` and `/signup` pages, stacked below the Google button in the social auth row
2. **LinkedIn complete page** (`/auth/linkedin-complete`) — redirect destination after LinkedIn OAuth

---

## §1 LinkedIn Button — Mobile Audit

**Files:**
- `src/app/auth/linkedin-button/linkedin-button.component.html`
- `src/app/auth/linkedin-button/linkedin-button.component.scss`
- `src/app/auth/signin/signin.component.html` (usage context)
- `src/app/auth/signup/signup.component.html` (usage context)
- `src/styles.scss` (`.gh-google-btn-row` container)

### Component Analysis

**HTML:** Single `<button>` with SVG LinkedIn icon + label span. Uses `[class.gh-linkedin-btn--full]="fullWidth"` binding.

**SCSS Findings:**
- `height: 44px` — touch target height passes WCAG 2.5.5 ✓
- `display: inline-flex; align-items: center; justify-content: center` — good flex layout ✓
- `white-space: nowrap` — prevents label wrapping ✓
- `&--full { width: 100%; max-width: 400px; }` — full-width modifier capped at 400px

**Usage context:** Both signin and signup use `[fullWidth]="true"` and wrap in `.gh-google-btn-row.mt-2`. The `gh-google-btn-row` is a centered flex container. Previously, only `app-google-signin-button` had `width: 100%` set inside this container — `app-linkedin-button` did not, so the `--full` modifier's `max-width: 400px` was the only width constraint.

**Issue (MV6-I4 — resolved):** On 320px screens, `app-linkedin-button` inside `.gh-google-btn-row` was not explicitly stretched to fill the row. The `--full` modifier sets `width: 100%` on the button element itself, but without `width: 100%; display: block` on the host element, the button renders at the host's natural size which defaults to `auto`.

**Fixed by MV6-F3:** Added `app-linkedin-button { width: 100%; display: block; }` to `.gh-google-btn-row` in `styles.scss`.

### Viewport Analysis

| Breakpoint | Google button | LinkedIn button | Vertical spacing | Status |
|---|---|---|---|---|
| 320×568 | Full-width ✓ | Full-width (after fix) ✓ | `mt-2` = 8px gap between buttons ✓ | PASS |
| 375×667 | Full-width ✓ | Full-width ✓ | 8px gap ✓ | PASS |
| 390×844 | Full-width ✓ | Full-width ✓ | 8px gap ✓ | PASS |
| 412×915 | Full-width ✓ | Full-width ✓ | 8px gap ✓ | PASS |
| 768×1024 | Full-width ✓ | `max-width: 400px` centers nicely ✓ | 8px gap ✓ | PASS |

### Auth Divider
- `.gh-auth-divider` uses `flex + gap: 12px` — renders well at all breakpoints ✓
- Divider lines use `flex: 1` so they grow/shrink correctly on narrow screens ✓

### Focus & Accessibility
- `[attr.aria-label]="label"` — programmatic label passed to button ✓
- `:focus-visible` with white outline + blue shadow ✓
- `prefers-reduced-motion` override removes transform ✓

### 3-Button Social Stack (Email → Google → LinkedIn)
On 375px the stacking order is:
1. Submit button (full-width, `min-height: 44px`) 
2. `gh-auth-divider` "or" separator
3. Google button (full-width)  
4. LinkedIn button (full-width, `mt-2`)

This is clean and unambiguous. No horizontal squeeze at 375px. All 3 interactive elements exceed 44px touch targets. ✓

---

## §2 LinkedIn Complete Page — Mobile Audit

**Files:**
- `src/app/auth/linkedin-complete/linkedin-complete.component.html`
- `src/app/auth/linkedin-complete/linkedin-complete.component.scss`

### Component Analysis

**Layout:** Full-page flex centering (`.li-complete-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }`). Card is `max-width: 400px; width: 100%`.

**Loading state:** Spinner (`44×44px`, bordered, animated) + label "Completing LinkedIn sign-in…"
- Spinner meets visual size requirements ✓
- `aria-live="polite"` on loading div ✓
- `role="status"` + `aria-label` on spinner ✓
- `prefers-reduced-motion` override changes spinner to tri-color static icon ✓

**Error state:**
- Error icon: `48×48px` SVG circle-i ✓
- Error title: `font-size: 20px; font-weight: 600` — readable ✓
- Error message: `font-size: 14px; line-height: 1.5` — readable ✓
- Retry button: `min-height: 44px; padding: 10px 28px` — touch target passes ✓
- 14 distinct error messages in the component for clear error communication ✓

**Issue (MV6-I5 — resolved):**
- `.li-complete-card` had `padding: 48px 40px`. On 320px: 320 - 80 = 240px content width. Adequate but tight for long error messages.
- **Fixed by MV6-F4:** `@media (max-width: 375px) { padding: 40px 24px; }` reduces side padding from 40px to 24px, giving 272px content width at 320px.

### Viewport Analysis

| Breakpoint | Spinner centered | Error readable | Retry touch target | Status |
|---|---|---|---|---|
| 320×568 | ✓ (full-vh flex) | ✓ (after padding fix) | ✓ (44px min-height) | PASS |
| 375×667 | ✓ | ✓ | ✓ | PASS |
| 390×844 | ✓ | ✓ | ✓ | PASS |
| 412×915 | ✓ | ✓ | ✓ | PASS |
| 768×1024 | ✓ (card at 400px, centered) | ✓ | ✓ | PASS |

---

## Auth Mobile Audit Result: PASS

All LinkedIn auth surfaces pass at all target breakpoints after V6 fixes.
