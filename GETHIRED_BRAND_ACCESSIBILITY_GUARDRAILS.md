# GETHIRED_BRAND_ACCESSIBILITY_GUARDRAILS.md
## BRAND QA Cycle 11 — Accessibility Guardrails
_Generated: 2026-06-25_

---

## Reduced-Motion Compliance

All motion in QA11 scope uses either `@include motion-safe` or `@include ambient-motion-safe` from `_motion.scss`.

| Effect Category | Mixin Used | Correct Mixin | Status |
|---|---|---|---|
| Transitions (hover, press, chip) | `motion-safe` | `motion-safe` (disables transition) | PASS |
| Continuous shimmer animations | `ambient-motion-safe` | `ambient-motion-safe` (disables animation) | PASS |
| Page/state reveal animations | `motion-safe` | `motion-safe` | PASS |
| SVG hamburger morph | `motion-safe` on lines | `motion-safe` | PASS |
| Header fade-in (IH) | `ambient-motion-safe` | NOTE: this is a triggered animation, not ambient. `motion-safe` would be more correct. Low impact. | LOW RISK |

**Note on `ih-header` mixin choice:** `.ih-header` uses `@include ambient-motion-safe` but is a triggered (one-shot) animation, not ambient/continuous. `ambient-motion-safe` only disables `animation`, while `motion-safe` disables both `transition` and `animation`. Since `.ih-header` only uses `animation` (not `transition`), the result is identical. No functional bug but semantically imprecise.

---

## Keyboard Navigation

| Component | Element | Keyboard Support | Status |
|---|---|---|---|
| Interview Hub | Filter chips | `<button>` — natively keyboard accessible | PASS |
| Interview Hub | Card actions | `<a>` tags — natively keyboard accessible | PASS |
| Panel — Mobile | Hamburger button | `<button>` with proper aria | PASS |
| Panel — Mobile | Drawer nav | `<a>` tags with `routerLinkActive` | PASS |
| Panel — Mobile | Close button | `<button>` with `aria-label` | PASS |
| Panel — Mobile | Escape to close | `@HostListener('document:keydown.escape')` | PASS |
| Messages | Thread rows | `role="button"`, `tabindex="0"`, `keydown.enter`, `keydown.space` | PASS |
| Messages | Filter chips | `<button>` | PASS |

---

## Focus Management

| Scenario | Implementation | Status |
|---|---|---|
| Drawer opens | `setTimeout(200ms) → firstDrawerLink.focus()` | PASS |
| Drawer closes (any method) | `setTimeout(50ms) → mobileMenuBtn.focus()` | PASS |
| Escape closes drawer | Focus returns to hamburger via `closeMobileNav()` | PASS |
| Route change closes drawer | `closeMobileNav()` called but `mobileNavOpen` may be false — guard present (`if (!mobileNavOpen) return`) | PASS |

---

## ARIA Semantics

| Element | ARIA Attributes | Assessment |
|---|---|---|
| Mobile hamburger | `aria-expanded`, `aria-label` (changes on state), `aria-controls` | PASS |
| Mobile drawer | `role="navigation"`, `aria-label="Employer navigation"`, `id="gh-mobile-drawer"` | PASS |
| Scrim | `aria-hidden="true"` | PASS |
| IH loading skeleton | `aria-busy="true"`, `aria-label="Loading interview activity"` | PASS |
| IH error | `role="alert"` | PASS |
| IH filter chips | `aria-pressed` | PASS |
| IH filter group | `role="group"`, `aria-label="Filter interview activity"` | PASS |
| IH card list | `role="list"`, `role="listitem"` | PASS |
| IH empty icon | `aria-hidden="true"` | PASS |
| RM loading | `aria-busy="true"`, `aria-label="Loading messages"` | PASS |
| RM error | `role="alert"` | PASS |
| RM filter group | `role="group"`, `aria-label="Filter conversations"` | PASS |
| RM thread list | `role="list"`, `aria-label="Conversation list"` | PASS |
| RM thread rows | `role="button"`, `tabindex="0"`, `aria-label` (via `threadLabel(t)`), `aria-pressed` | PASS |
| RM avatar img | `alt=""` (decorative) | PASS |

---

## Color Contrast Check (Spot)

| Element | Foreground | Background | Est. Ratio | Status |
|---|---|---|---|---|
| IH filter chip active | `#fff` | `$color-blue-primary (#168DBD)` | ~3.7:1 | FAIL AA (4.5:1 required for text) — RISK-07 |
| IH card name | `$color-black (#2D2D2D)` | `#fff` | ~13:1 | PASS |
| IH error heading | `$color-black` | `#fff` (padded) | ~13:1 | PASS |
| IH empty heading | `$color-black` | white | PASS | PASS |
| RM thread name | `#1E1B4B` | `#fff` | ~12:1 | PASS |
| RM chip active | `#fff` | `#1E1B4B` | ~12:1 | PASS |
| Mobile topbar title | `#ffffff` | `#444152` | ~5.1:1 | PASS |

**RISK-07 (MEDIUM):** Interview Hub active filter chip: white text on `$color-blue-primary (#168DBD)` — estimated ratio ~3.7:1, below WCAG AA 4.5:1 for normal text. Needs darker blue (`$color-blue-dark: #2E7A95` — still marginal) or lighter chip text. Recommend testing with actual contrast checker.

---

## RISK-06: Broken Image in Avatar Circle (Messages)

**File:** `recruiter-messages.component.html` line 98–99

**Issue:** When `applicantPhotoUrl` is set but the image URL returns a 404 or network error:
- The `<img>` element remains visible
- Browser renders a broken-image placeholder icon inside the `.rm-thread-avatar` container
- `overflow: hidden` clips the broken icon to the circle boundary — the circle shape is preserved
- BUT the initials fallback (`*ngIf="!t.applicantPhotoUrl"`) is hidden because `applicantPhotoUrl` is truthy
- Result: users see a circle with a broken-image icon instead of either a photo or initials

**Fix (FIX-02):** Add `(error)` handler to the `<img>` element:
```html
<img *ngIf="t.applicantPhotoUrl" [src]="t.applicantPhotoUrl"
     alt="" class="rm-thread-avatar-img" loading="lazy"
     (error)="t.applicantPhotoUrl = null">
```
This clears the URL on error, which causes Angular to hide the `<img>` and show the initials fallback.

**`alt=""` is correct** — the image is decorative (name is in `.rm-thread-name` already).
