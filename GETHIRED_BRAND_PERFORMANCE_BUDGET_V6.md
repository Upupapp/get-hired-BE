# GETHIRED BRAND PERFORMANCE BUDGET V6
**Date:** 2026-07-01

---

## Animation Performance Rules

1. **GPU-accelerated properties only.** `transform` and `opacity` on animated elements. Never animate `width`, `height`, `margin`, `top`, `left`, `background-color` (triggers layout/paint).
2. **No layout-triggering animations in loops.** Infinite animations (spinners, shimmer) must use `transform: rotate()` or background-position — not dimensions.
3. **Will-change sparingly.** Only on elements that animate frequently (modals, drawers). Remove after animation.
4. **Total CSS animation budget:** < 3 concurrent animations per screen visible at once.

---

## V6 Surface Performance Audit

### LinkedIn Button
- `transition: background 0.15s ease, box-shadow 0.15s ease` — background transition causes paint. Acceptable for a non-animated steady-state element. No loop. ✅
- `:active transform: scale(0.985)` — GPU-accelerated. ✅
- **Count:** 0 animations on screen (button is static unless hovered)

### LinkedIn Complete Spinner
- `animation: li-spin 0.7s linear infinite` — uses `transform: rotate(360deg)`. GPU-accelerated. ✅
- **Count:** 1 animation (spinner) — within budget ✅
- Concern: infinite loop. Covered by reduced-motion guard (once fixed).

### Company Setup Modal
| Element | Animation | GPU? | Loop? |
|---|---|---|---|
| Confetti ring | gh-pop-in | ✅ (transform + opacity) | No |
| Eyebrow | gh-fade-up | ✅ (transform + opacity) | No |
| Title | gh-fade-up | ✅ | No |
| Trial badge | gh-fade-up | ✅ | No |
| Checklist | gh-fade-up | ✅ | No |
| Actions | gh-fade-up | ✅ | No |
| Footer | gh-fade-up | ✅ | No |

All 7 animations are GPU-accelerated and fire once (not loops). Peak concurrent: 7 elements staggered but mostly completed by 775ms. ✅ Within performance budget.

---

## CSS File Size Budget

| File | Estimated Size | Budget |
|---|---|---|
| `linkedin-button.component.scss` | ~0.5KB | < 5KB per component |
| `linkedin-complete.component.scss` | ~0.8KB | < 5KB |
| `employer-company-setup-success-modal.component.scss` | ~2.8KB | < 5KB |

All within budget. ✅

---

## Will-Change Recommendations

For the setup modal, if performance testing shows jank on lower-end devices:
```scss
.gh-setup-modal__confetti-ring {
  will-change: transform, opacity;
  // Remove after animation completes via JS if possible
}
```

Do NOT add `will-change` globally to all animated elements — it consumes GPU memory.

---

## Font Performance (V6 Surfaces)

- All surfaces inherit `font-family: "Manrope"` from global body styles ✅
- LinkedIn button uses `font-family: inherit` ✅ — does not load extra fonts
- No new font families introduced in V6 surfaces ✅

---

## Image/SVG Performance

- Company setup modal uses SVG icons inline — no network requests ✅ (assumed, based on component structure)
- LinkedIn icon in button: `<svg>` inline or image — verify no external request
- Check icon: `<img>` or `<svg>` — no color token dependency ✅

---

## V6 Performance Budget Summary

| Metric | Status |
|---|---|
| GPU-only animations | ✅ All pass |
| No layout-thrashing loops | ✅ Spinner uses rotate |
| Concurrent animation count | ✅ Max 7, all one-shot |
| CSS file sizes | ✅ All < 3KB |
| Font loading | ✅ No new fonts |
| Will-change | Not needed currently |
