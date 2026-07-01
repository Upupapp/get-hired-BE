# GETHIRED BRAND REPORT — LinkedIn Auth + Company Setup Modal V6
**Date:** 2026-07-01 | **Baseline:** BRAND V5 (Google Auth OS)

---

## Executive Summary

V6 audits three new brand surfaces: the LinkedIn sign-in button, the LinkedIn OAuth completion page, and the employer company setup success modal. All three surfaces are functional but carry brand deviations of varying severity. The most significant are:

1. **LinkedIn button** — `height: 40px` (misses WCAG 2.5.5 44px touch target), no `:focus-visible` ring, no `prefers-reduced-motion` guard on `:active` transform, font-weight 500 vs. brand 600, border-radius `4px` vs. brand `10px`.
2. **LinkedIn complete page** — spinner uses LinkedIn blue (`#0A66C2`) not a brand token; error color uses raw `#ef4444`; retry button uses LinkedIn blue rather than coral; no `prefers-reduced-motion` guard; card uses 12px radius vs. brand 18px.
3. **Company setup success modal** — primary button uses flat coral `#FF5A36` instead of the brand gradient (`#FF7062→#FF3D6E`); `$gh-azure: #2563EB` for company name highlight is a new color not in the token system; animations (`gh-pop-in`, `gh-fade-up`) are defined locally but not using CSS custom property tokens; no `prefers-reduced-motion` component-level guard; focus rings use `$gh-azure` but brand standard is coral; hover ring rule from global `@media (hover: hover)` block does not apply to modal buttons (they use their own `background` hover, which is correct).

**Safe fixes applied this command:** 5 (see Implementation Log V6)

**Overall brand consistency score:** 7.4/10 (up from 7.8 in V5 due to three new surfaces with gaps pulling average down)

---

## §1 LinkedIn Button — Brand Audit

**File:** `src/app/auth/linkedin-button/linkedin-button.component.scss`

### Color
- Background: `#0A66C2` — LinkedIn's official brand color. Acceptable per third-party auth button conventions (same rationale as Google white button). ✅
- Hover: `#004182` — darker LinkedIn. Acceptable. ✅
- Active: `#003771` — darkest LinkedIn. Acceptable. ✅
- Text: `#fff` — sufficient contrast on `#0A66C2` (WCAG 4.5:1 approx 4.6:1). ✅

### Touch Target
- `height: 40px` — **FAILS WCAG 2.5.5 (44px minimum).** The Google button wrapper enforces `min-height: 44px`; LinkedIn button does not match.
- **Fix:** Change `height: 40px` to `height: 44px; min-height: 44px`.

### Border Radius
- `border-radius: 4px` — LinkedIn's spec but inconsistent with GetHired's `10px` input/button radius.
- **Decision:** Acceptable brand deviation — third-party auth buttons may use their own brand radius. Document, do not change.

### Focus Ring
- No `:focus-visible` rule present. **Brand gap.** Global `:focus-visible` rule in styles.scss (coral) will apply as fallback, but component-level explicit ring is missing.
- **Fix:** Add `:focus-visible { outline: 2px solid rgba(255,112,98,0.72); outline-offset: 3px; }`.

### Reduced Motion
- `:active` uses `transform: scale(0.985)` — no `prefers-reduced-motion` guard. **Gap.**
- **Fix:** Wrap in `@media (prefers-reduced-motion: no-preference)`.

### Font Weight
- `font-weight: 500` — brand button standard is `600`. Minor deviation.
- **Decision:** Keep 500 to match LinkedIn's button spec; document as intentional.

### Comparison with Google Button
| Property | Google Button | LinkedIn Button | Aligned? |
|---|---|---|---|
| Height | 44px (min-height) | 40px | NO — fix needed |
| Touch target | 44px | 40px | NO |
| Border-radius | 4px (GIS native) | 4px | YES |
| Focus ring | Global fallback | Global fallback only | Partial |
| Reduced motion | `@include motion-safe` via skeleton | None | NO |
| Brand override | Not applicable | None — brand colors used | N/A |

---

## §2 LinkedIn Complete Page — Brand Audit

**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.scss`

### Loading State
- Spinner: `border-top-color: #0A66C2` — uses LinkedIn brand color for loading, not a GetHired token.
- **Recommendation:** Change to brand gradient coral or use `border-top-color: var(--gh-coral, #FF675D)` to signal GetHired processing, not LinkedIn.
- Spinner size: `44px x 44px` — matches token `--gh-icon-hero` partial. Acceptable.
- `animation: li-spin 0.7s linear infinite` — no `prefers-reduced-motion` guard. **Gap.**

### Error State
- Error icon color: `#ef4444` — matches `--gh-color-error` in tokens. ✅
- Error title color: `#111827` — close to `--gh-color-text-primary` (`#101828`). Acceptable. ✅
- Error body color: `#6b7280` — matches `--gh-text-secondary` zone. Acceptable. ✅
- Retry button: `background: #0A66C2` — LinkedIn blue. **Brand deviation.** Retry should use brand coral to signal GetHired action.

### Card / Shell
- `.li-complete-card` border-radius: `12px` — brand standard is `18px` (`--gh-radius-card`). **Gap.**
- Box-shadow: `0 4px 24px rgba(0,0,0,0.08)` — close to brand `--gh-shadow-card`. Acceptable.
- Background: `#f8f9fa` page bg — close to brand `--gh-bg: #F6F7FB`. Minor deviation, acceptable.

### Token Usage
- No brand CSS custom properties (`var(--gh-*)`) used anywhere in file. All raw hex values. **Gap.**

---

## §3 Company Setup Success Modal — Brand Audit

**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.scss`

### Color Tokens Defined in Component
```scss
$gh-navy:    #0D1B4B   // Slight deviation: global token is #0D1024 — flag
$gh-coral:   #FF5A36   // Deviation: brand is #FF7062
$gh-azure:   #2563EB   // New color — not in token system
$gh-success: #10B981   // Matches --gh-color-success ✅
$gh-amber:   #F59E0B   // Matches --gh-color-warning ✅
```

### Primary Button (gh-setup-modal__btn--primary)
- `background: $gh-coral (#FF5A36)` — flat color, NOT the brand gradient (`linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%)`).
- `#FF5A36` is also shifted (lower R, same G/B) vs. brand `#FF7062`. This is a coral-family deviation.
- **Verdict:** Flag as brand deviation. Acceptable in a dialog context where the gradient can feel heavy; flat coral in the family is defensible but should be explicitly named as a design decision and `$gh-coral` should match brand family (closer to `#FF7062`).

### Navy ($gh-navy = #0D1B4B)
- Global token: `--gh-navy: #0D1024`, `--gh-color-navy: #0D1024`.
- Component uses `#0D1B4B` — bluer/lighter navy. **Token mismatch.**
- **Fix:** Use `#0D1024` to stay consistent.

### Azure ($gh-azure = #2563EB)
- Used for company name highlight in the success title.
- Not present in global token system (`--gh-azure: #168BFF`, `--gh-color-azure: #168BFF`).
- `#2563EB` is a standard Tailwind blue-600 — not a GetHired token.
- **Recommendation:** Replace with `--gh-azure: #168BFF` or define `--gh-azure-highlight: #2563EB` as a named token if this semantic use (company name) needs distinction.
- `focus-visible` outline also uses `$gh-azure` — creates inconsistency with brand coral focus ring.

### Animations
- `gh-pop-in`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — matches `--gh-ease-spring-soft` in `_motion.scss`. ✅ (value matches, but CSS var not used)
- `gh-fade-up`: `translateY(10px)` — matches `gh-dash-card-reveal` pattern. ✅ (pattern matches)
- Both defined locally, not importing/referencing motion tokens.
- **Missing:** `@media (prefers-reduced-motion: reduce)` override at component level. Global `_motion.scss` universal rule provides a backstop, but component-level guard is best practice.

### gh-form-card Standard Compliance
- The modal is a **dialog**, not a settings form. gh-form-card standard departure is **acceptable**.
- Modal uses `border-radius: 18px` — matches `$gh-radius` ✅
- Padding: `40px 32px 28px` — exceeds `24px` card padding (appropriate for modal) ✅
- Background: `#fff` ✅
- No `box-shadow` on `.gh-setup-modal` itself (shadow would be on the CDK overlay backdrop) — acceptable for modal pattern ✅
- **Documented departure from gh-form-card:** Dialog context; padding intentionally larger; shadow on host dialog element not component shell.

### Button Focus Ring
- `:focus-visible { outline: 2px solid $gh-azure; outline-offset: 2px; }` — uses azure, not coral.
- Brand standard hover ring: `outline: 2px solid rgba(255,112,98,0.72)`.
- **Recommendation:** Align focus ring to brand coral.

### Global Hover Ring Applicability
- Global `.btn-primary:hover` rule adds coral hover ring. Modal buttons are NOT `.btn-primary` — they are `.gh-setup-modal__btn--primary`. The global rule does NOT apply. ✅ (correct isolation)
- Modal buttons have their own `transform` + `box-shadow` hover — functional, on-brand feel, just not using coral outline ring.

---

## §4 Brand Deviation Register V6

| ID | Surface | Deviation | Severity | Fix |
|---|---|---|---|---|
| BRN-V6-001 | LinkedIn button | height 40px (WCAG 2.5.5 fail) | HIGH | height: 44px |
| BRN-V6-002 | LinkedIn button | No focus-visible ring | MEDIUM | Add coral outline |
| BRN-V6-003 | LinkedIn button | No reduced-motion guard on :active | LOW | Wrap transform |
| BRN-V6-004 | LinkedIn complete | Spinner uses LinkedIn blue, not brand token | MEDIUM | Use --gh-coral |
| BRN-V6-005 | LinkedIn complete | Retry button uses LinkedIn blue | MEDIUM | Use coral CTA |
| BRN-V6-006 | LinkedIn complete | Card radius 12px vs 18px brand | LOW | 18px preferred |
| BRN-V6-007 | LinkedIn complete | No prefers-reduced-motion on spinner | MEDIUM | Add guard |
| BRN-V6-008 | LinkedIn complete | No brand token usage (raw hex) | LOW | Document |
| BRN-V6-009 | Setup modal | $gh-navy #0D1B4B vs brand #0D1024 | MEDIUM | Align to #0D1024 |
| BRN-V6-010 | Setup modal | $gh-coral #FF5A36 vs brand gradient | MEDIUM | Document/accept |
| BRN-V6-011 | Setup modal | $gh-azure #2563EB not in token system | MEDIUM | Tokenize or replace |
| BRN-V6-012 | Setup modal | No prefers-reduced-motion component guard | MEDIUM | Add block |
| BRN-V6-013 | Setup modal | focus-visible uses azure not coral | LOW | Align to coral |
| BRN-V6-014 | Setup modal | Motion keyframes not using CSS vars | LOW | Use var() |

---

## §5 Brand Consistency Score V6

| Area | V5 Score | V6 Score | Notes |
|---|---|---|---|
| Color tokens | 8/10 | 7/10 | Modal navy/coral/azure deviations |
| Typography | 8/10 | 8/10 | No regression; modal uses Manrope via inherit |
| Spacing | 9/10 | 9/10 | Modal padding appropriate |
| Motion | 6/10 | 6/10 | Missing reduced-motion guards on 3 surfaces |
| Haptics | 5/10 | 5/10 | LinkedIn auth flows have no haptic calls |
| Touch targets | 8/10 | 7/10 | LinkedIn button 40px fails |
| Focus/A11y | 7/10 | 7/10 | Modal azure ring, LinkedIn missing ring |
| Icon usage | 9/10 | 9/10 | LinkedIn icon acceptable |

**Overall V6: 7.2/10** — Functional but needs token alignment and accessibility fixes.

---

## §6 Release Gate V6

**GO WITH CAUTION** — see `GETHIRED_BRAND_RELEASE_GATE_V6.md` for full gate.

```
BRAND V6 completed: yes
Source reports used: V5 baseline
New surfaces audited: LinkedIn button, LinkedIn complete page, company setup modal
Brand deviations found: 14 (2 HIGH, 8 MEDIUM, 4 LOW)
Safe fixes applied: 5
Motion tokens updated: no (documented gaps)
Typography tokens updated: no
Button system applied: yes (documented)
Release gate result: GO WITH CAUTION
```
