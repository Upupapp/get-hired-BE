# GETHIRED BRAND RELEASE GATE V6
**Date:** 2026-07-01

---

## Release Gate Decision

**RESULT: GO WITH CAUTION**

---

## Gate Criteria

### P0 — Must Fix Before Production

| Item | Status | Notes |
|---|---|---|
| LinkedIn button 44px touch target | FIXED ✅ | Was 40px — now 44px |
| Reduced-motion on spinner loops | FIXED ✅ | LinkedIn complete spinner guarded |
| LinkedIn complete retry brand alignment | FIXED ✅ | Coral, correct touch target |
| Navy token alignment | FIXED ✅ | #0D1024 in setup modal |
| Azure token alignment | FIXED ✅ | #168BFF in setup modal |

### P1 — Fix Within 1 Sprint (Not Release Blocking for Beta)

| Item | Status | Owner |
|---|---|---|
| A11y-V6-002: Modal primary btn coral contrast 3.4:1 vs white (#FF5A36) | OPEN | FE dev — change to navy primary or dark text |
| A11y-V6-003: Modal eyebrow #10B981 contrast 3.0:1 at 12px | OPEN | FE dev — darken to #059669 |
| Haptic calls on LinkedIn auth + setup modal | OPEN | FE dev (TS) |
| LinkedIn complete card radius 12px → 18px | OPEN | FE dev (cosmetic) |

### P2 — Backlog (No Release Risk)

| Item | Notes |
|---|---|
| Move gh-pop-in / gh-fade-up to global _motion.scss | Reusability improvement |
| Modal animations use CSS var() instead of raw values | Token system purity |
| Setup modal focus ring: coral not azure | Brand consistency only |
| Add .gh-spinner global class | Reusable loading component |
| Haptic calls in form submits (V5 backlog) | Ongoing |
| Empty state global SCSS class | Backlog |
| gh-offline-banner component | Backlog |
| LinkedIn infinite spinner timeout (TS) | UX improvement |

---

## Breaking Change Assessment

None. All V6 changes are:
- Additive CSS (new selectors, no overrides of existing selectors outside their files)
- Token value alignment (imperceptible visual delta on navy; visible but brand-correct delta on azure/coral in modal)
- No routing, API, guard, form submit, or PayMongo changes

---

## Regression Risk

| Area | Risk | Notes |
|---|---|---|
| LinkedIn button | LOW | Height change from 40→44px may shift layout in very tight containers |
| LinkedIn complete | LOW | Spinner color change visual only |
| Setup modal | VERY LOW | Token values align closely; #168BFF vs #2563EB is visual only |
| Global styles | NONE | No changes to styles.scss or _motion.scss |

---

## Sign-Off Requirements

For FULL GO:
- [ ] A11y-V6-002 contrast fix applied (modal primary button)
- [ ] A11y-V6-003 contrast fix applied (modal eyebrow)
- [ ] Visual review of LinkedIn button at 44px height in signin/signup pages
- [ ] Visual review of setup modal with #168BFF azure company name highlight

For GO WITH CAUTION (current):
- P0 items all fixed ✅
- P1 items documented and tracked
- No regressions in auth flow routing or form submission

**Signed off by:** BRAND V6 command — 2026-07-01
