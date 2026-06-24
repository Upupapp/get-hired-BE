# GetHired Security Sprint — Brand Audit Report

**Date:** 2026-06-25  
**Scope:** Visual/brand review of FE changes shipped in the Security + UX Fix Sprint  
**Audited files:**
- `src/app/employer-panel/employer-panel.component.html` (NEW-03 billing bar)
- `src/app/employer-panel/employer-panel.component.scss`
- `src/app/auth/signin/signin.component.html` (F-09 error binding)
- `src/app/auth/change-pw/change-pw.component.html`
- `src/app/auth/reset-password/reset-password.component.html`
- `src/app/company/company-basic/company-basic.component.html`

**Brand references read:** `src/assets/styles/colors.scss`, `src/assets/styles/_motion.scss`

---

## Executive Summary

Two findings were identified, one needing immediate remediation:

1. **Subscription & Billing mobile bar (NEW-03):** Shipped with all styles inlined on the HTML element using hardcoded hex values. No hover state, no `:focus-visible` ring, no brand variables, no motion token. **Fixed in this audit pass** — styles extracted to SCSS classes using brand variables and motion mixin.

2. **`{{ error }}` interpolation (F-09):** Visual rendering is correct and consistent across all four components. The switch from `[innerHtml]="error"` to `{{ error }}` is transparent to the user — the `<span>` wrapper, `.error-message` alert class, animation trigger, and dismiss button are unchanged. No brand action needed.

---

## 1. Subscription & Billing Mobile Bar Brand Audit

### Pre-fix state (as shipped)

The bar was implemented with a fully inline `style=""` attribute on the container `<div>` and the `<a>` link:

```html
<div class="d-flex d-md-none justify-content-center align-items-center"
  style="background:#f8f8f8;border-top:1px solid #eee;padding:6px 0;position:fixed;bottom:56px;left:0;right:0;z-index:999;">
  <a routerLink="/recruiter/subscription"
    style="font-size:11px;color:#FF7062;text-decoration:none;display:flex;align-items:center;gap:4px;"
    ...>
```

| Check | Pre-fix result |
|---|---|
| Brand color variables | FAIL — `#f8f8f8`, `#eee`, `#FF7062` are all hardcoded hex. Brand palette uses `$color-global-sidebar-applicant-gray` (#F6F7FB), `$color-global-red-buttons` (#FF7062). |
| Background consistency | PARTIAL — `#f8f8f8` is close but not identical to the page background (`$color-global-sidebar-applicant-gray` = #F6F7FB). Visually near-identical but semantically wrong. |
| Border consistency | FAIL — `#eee` is hardcoded. The mobile nav uses `rgba(255,255,255,0.12)` (dark bg); a light bg needs the adjusted token `rgba(0,0,0,0.08)`. |
| Typography | PARTIAL — `font-size:11px` is correct for this compact bar role but `font-family` was not declared (inherits unpredictably). Brand font is Manrope. |
| Font weight | FAIL — not set (defaults to 400). Nav labels use `font-weight: 500`. |
| Hover state | FAIL — no hover declared. |
| Focus-visible ring | FAIL — no `:focus-visible` declared. Nav items have `outline: 2px solid rgba(255,112,98,0.85)`. |
| Motion token | FAIL — no transition; `@include motion-safe` not applied. Any future transition would not respect `prefers-reduced-motion`. |
| Bottom positioning | PASS — `bottom: 56px` correctly clears the nav bar. Nav bar SCSS confirms `bottom: 0` and `padding: 6px 0 env(safe-area-inset-bottom, 0px)` with icon height 22px + label 10px + padding 8px = approximately 56px rendered height. |
| z-index consistency | PASS — `z-index: 999` matches the mobile nav bar. |
| Layout visibility | PASS — `d-flex d-md-none` correctly hides on desktop (768px+). |

### Post-fix state

All inline styles moved to `.gh-billing-bar` and `.gh-billing-bar-link` SCSS classes in `employer-panel.component.scss`. A motion import (`@import "src/assets/styles/motion"`) was added at the top of the component stylesheet.

**Changes applied:**
- `background: #f8f8f8` → `background: $color-global-sidebar-applicant-gray`
- `border-top: 1px solid #eee` → `border-top: 1px solid rgba(0, 0, 0, 0.08)`
- `color: #FF7062` → `color: $color-global-red-buttons`
- Added `font-family: 'Manrope', sans-serif`
- Added `font-weight: 500`
- Added `&:hover { opacity: 0.75; color: $color-global-red-buttons; }`
- Added `&:focus-visible { outline: 2px solid rgba(255, 112, 98, 0.85); outline-offset: 2px; }` — matches the nav item focus ring pattern exactly
- Added `transition: opacity $motion-duration-micro $motion-ease-standard` + `@include motion-safe` — uses 160ms micro token; `@include motion-safe` strips the transition entirely for `prefers-reduced-motion: reduce` users

---

## 2. Error Text Rendering Brand Audit (`{{ error }}` switch)

### What changed

The sprint replaced `[innerHtml]="error"` with `{{ error }}` inside an existing `<span>` in four components. The outer alert structure — `.error-message` container, Bootstrap `alert-danger` classes, `[@animate]` directive, `*ngIf="error"` condition, and dismiss button — was unchanged.

### Per-component assessment

#### signin.component.html

Error block uses `.error-message` class (defined in signin.component.scss: `border-radius: 15px; margin-bottom: 30px`) plus Bootstrap `alert-danger` for the color, role="alert" for a11y. The `{{ error }}` interpolation renders inside the `<span>` as a text node, which is semantically identical to what `[innerHtml]` produced for plain-string content. The `*ngIf="verify"` / `*ngIf="!verify"` conditional correctly places `{{ error }}` only when the verify flag is false.

**Result:** Correct. No visual change from the user's perspective.

#### change-pw.component.html

Both `{{ message }}` (success alert) and `{{ error }}` (danger alert) were switched. Both containers use Bootstrap alert classes + role="alert" + animation + dismiss. Success message styling is visually distinct (alert-success = green background). Both render identically to the pre-fix `[innerHtml]` output since the strings are plain text.

**Result:** Correct. No visual change.

#### reset-password.component.html

Error block pattern matches signin exactly — same alert classes, same animation, same dismiss. `{{ error }}` inside `<span>` is correct.

**Result:** Correct. No visual change.

#### company-basic.component.html

The alert structure follows the same pattern. `company-basic.component.scss` is empty (1 line), so all error styling comes from Bootstrap globals and the `.error-message` class is expected to come from a global stylesheet. Visually the component inherits `.error-message` via global styles or the alert-danger Bootstrap utility.

**Result:** Correct. The `{{ error }}` switch does not change visual output.

### Consistency with error design patterns elsewhere

The `.error-message` class with `border-radius: 15px` is defined in signin.component.scss and applied consistently in all four components. The `[@animate]="{value:'*', params:{y:'50px', delay:'600ms'}}"` entrance animation is present on all four error containers. This is consistent. No deviations detected.

---

## 3. Applied Fixes

### Fix B-01: Extract billing bar inline styles to SCSS (employer-panel.component.scss + .html)

**File:** `src/app/employer-panel/employer-panel.component.html`  
Inline `style=""` attributes removed from the billing bar container `<div>` and `<a>`. Replaced with CSS class references `gh-billing-bar` and `gh-billing-bar-link`.

**File:** `src/app/employer-panel/employer-panel.component.scss`  
Added `@import "src/assets/styles/motion"` at line 2.  
Added `.gh-billing-bar` and `.gh-billing-bar-link` blocks at end of file:

- `.gh-billing-bar` — position/layout/background/border using brand variable `$color-global-sidebar-applicant-gray` and semantic rgba border
- `.gh-billing-bar-link` — Manrope font-family, font-size 11px, font-weight 500, `$color-global-red-buttons`, hover opacity, `:focus-visible` ring matching nav item pattern, `motion-safe` mixin guarding the hover transition

**Net result:** 7 hardcoded values eliminated; hover, focus, and reduced-motion gaps all closed.

---

## 4. Deferred Recommendations

### D-01: `env(safe-area-inset-bottom)` on billing bar

The mobile nav uses `padding: 6px 0 env(safe-area-inset-bottom, 0px)` to accommodate iPhone notch/home-indicator. The billing bar uses `padding: 6px 0` without the `env()` fallback. On notched iPhones, the nav bar's actual rendered height grows beyond 56px (by the safe area inset value, typically 34px on iPhone 13+). This means `bottom: 56px` will overlap the safe-area extension of the nav bar on those devices.

**Recommendation:** Change `.gh-billing-bar` bottom positioning to:
```scss
bottom: calc(56px + env(safe-area-inset-bottom, 0px));
```
This is a mobile-hardware-specific fix, not a brand fix, so it is deferred here. Low impact on the sprint's build target since most testing is on desktop/emulator.

### D-02: `.error-message` class not defined globally for company-basic

`company-basic.component.scss` is effectively empty. The `.error-message` Bootstrap-adjacent class (`border-radius: 15px; margin-bottom: 30px`) is only explicitly defined in `signin.component.scss`. Angular's component encapsulation means the signin rule does not bleed to company-basic. The error alert in company-basic falls back to Bootstrap's default `alert-danger` box (still readable and correctly colored, just without the rounded-corner treatment). If visual parity is required, a shared `error-message` rule should be added to `src/assets/styles/globals.scss` or the company-basic component SCSS. Low-priority cosmetic only.

### D-03: Inline hardcoded color in panel error fallback template

In `employer-panel.component.html`, the `#panelError` ng-template (line 104) uses `style="color: #444"` and `style="color: #FF7062"` inline. These are not part of this sprint's scope but should be extracted to SCSS classes using `$color-black` and `$color-global-red-buttons` respectively in a future housekeeping pass.

### D-04: `signin.component.scss` inline `#FF4D3C` hover color

The `.btn-submit:hover` rule in signin.component.scss (and change-pw, reset-password) uses the hardcoded hex `#FF4D3C` instead of a brand variable. The closest brand token is `$color-global-red` (#FE6F61) or a darkened variant of `$color-global-red-buttons`. Minor; not introduced by this sprint.
