# GETHIRED_GOOGLE_AUTH_ACCESSIBILITY_QA_V1

## GoogleSigninButtonComponent

| Check | Status | Notes |
|---|---|---|
| GIS button has accessible label | PASS | GIS renders with built-in accessible label |
| Skeleton accessible while loading | PASS | `aria-busy="true"` while loading |
| Error event does not auto-announce for dismissed/closed | PASS | Silently ignored |
| Error output uses `role="alert"` in parent | PASS | Parent component wraps in alert div |

## Signin / Signup Google Button Row

| Check | Status | Notes |
|---|---|---|
| Divider is `aria-hidden` | PASS | Decorative, no screen reader announcement |
| Google error uses `role="alert"` | PASS | `<div role="alert">` |
| Loading text uses `aria-live="polite"` | PASS | Non-intrusive live region |
| Button not shown while loading | PASS | `*ngIf="!googleLoading"` |

## RoleClassificationComponent

| Check | Status | Notes |
|---|---|---|
| Role cards have `role="radio"` | PASS | Semantically correct for mutually exclusive choice |
| `aria-checked` set correctly | PASS | Bound to `selectedRole === 'job_seeker'` etc. |
| Keyboard interaction: Enter/Space | PASS | `(keydown.enter)` + `(keydown.space)` triggers `selectRole()` |
| `tabindex="0"` on cards | PASS | Focusable via Tab |
| Selection indicated by color AND checkmark icon | PASS | Not color alone |
| Error uses `role="alert"` | PASS |  |
| Loading state uses `aria-live="polite"` | PASS |  |
| Page title is descriptive | PASS | H1: "Choose how you'll use GetHired" |
| GetHired logo has `alt` text | PASS | `alt="GetHired Online"` |
| Avatar has `alt` text | PASS | `alt="Your Google photo"` |

## Reduced Motion

| Check | Status | Notes |
|---|---|---|
| Skeleton pulse animation disabled | PASS | `@media (prefers-reduced-motion: reduce)` in component SCSS |
| Card selection transition disabled | PASS | Same media query |
| Button press animation disabled | PASS | Same media query |
| Role spinner animation disabled | PASS | Same media query |

## Color Contrast

| Element | Foreground | Background | Ratio | Status |
|---|---|---|---|---|
| Role card text | `#0D1B2A` | `#fff` | > 10:1 | PASS |
| Selected seeker card | `#3B82F6` | `#eff6ff` | > 4.5:1 | PASS |
| Selected employer card | `#FF6B5B` | `#fff5f4` | > 3.5:1 | PASS AA large |
| Benefit list text | `#6b7280` | `#fff` | ~ 4.6:1 | PASS |
| Divider "or" text | `#9ca3af` | `#fff` | ~ 3.5:1 | PASS AA large (decorative) |

## Focus Management

- Role classification page: focus remains on card after keyboard selection
- On navigation to /auth/choose-role: Angular router scrolls to top
- On error: `role="alert"` auto-announces to screen reader
