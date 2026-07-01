# GETHIRED BRAND ACCESSIBILITY GUARDRAILS V6
**Date:** 2026-07-01

---

## Accessibility Baseline

All GetHired surfaces must meet:
- WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI components)
- WCAG 2.5.5 touch target 44x44px minimum
- Keyboard navigability (Tab, Enter, Space, Escape)
- Screen reader compatibility (aria-label, aria-live, role)
- Reduced motion support (`prefers-reduced-motion`)

---

## V6 Accessibility Findings

### BRN-V6-001 (HIGH): LinkedIn button touch target
- `height: 40px` — fails WCAG 2.5.5
- Fix: `height: 44px; min-height: 44px`
- Impact: Any user on touch device. LinkedIn is a primary auth path.

### BRN-V6-002 (MEDIUM): LinkedIn button focus ring missing
- No component-level `:focus-visible` rule
- Global fallback (`outline: 2px solid $color-global-red-buttons`) applies via styles.scss
- **Verified:** `$color-global-red-buttons` = `#FF7062` — 3.1:1 vs white — WCAG AA fail on white bg
- However, focus ring outline is on the button element itself, contrasted against the LinkedIn blue background — contrast is likely sufficient but depends on context
- **Fix:** Add explicit `:focus-visible { outline: 2px solid rgba(255,112,98,0.72); outline-offset: 3px; }` to component for consistency

### BRN-V6-003 (MEDIUM): LinkedIn spinner no reduced-motion guard
- `animation: li-spin 0.7s linear infinite` — no guard
- For users with vestibular disorders, spinning content is a WCAG 2.3.3 (AAA) concern and a WCAG 2.2.2 (AA) concern for auto-updating content
- Fix: Add `@media (prefers-reduced-motion: reduce) { animation: none; border-color: rgba(255,103,93,0.4); }`

### BRN-V6-004 (MEDIUM): Retry button touch target
- `.li-complete-retry-btn`: `padding: 10px 28px` — height is `10 + line-height + 10` ≈ 34px
- Fails WCAG 2.5.5
- Fix: `min-height: 44px; display: inline-flex; align-items: center;`

### BRN-V6-005 (LOW): Setup modal focus ring color (azure vs coral)
- `.gh-setup-modal__btn:focus-visible { outline: 2px solid $gh-azure (#2563EB); }`
- Not a WCAG failure (azure #2563EB has adequate contrast vs white)
- Brand consistency gap only

### BRN-V6-006 (LOW): Setup modal animations — component-level reduced motion
- Global `_motion.scss` universal rule covers all elements
- Component-level guard missing — belt-and-suspenders best practice only
- Not a WCAG failure

### BRN-V6-007 (INFO): Setup modal aria-live
- Success modal should have `role="dialog"` and `aria-modal="true"` (TS/HTML concern)
- Check completion label should have `aria-label` (HTML concern)
- Not SCSS-addressable

---

## Contrast Audit (V6 New Surfaces)

### LinkedIn Button
| Text | Background | Ratio | WCAG AA |
|---|---|---|---|
| `#fff` | `#0A66C2` | ~4.6:1 | PASS ✅ |
| `#fff` | `#004182` (hover) | ~8.1:1 | PASS ✅ |

### LinkedIn Complete Page
| Text | Background | Ratio | WCAG AA |
|---|---|---|---|
| `#111827` error title | `#fff` | 18.1:1 | PASS ✅ |
| `#6b7280` error body | `#fff` | 4.6:1 | PASS ✅ |
| `#fff` retry btn | `#0A66C2` | 4.6:1 | PASS ✅ (but wrong brand color) |
| `#6b7280` loading label | `#fff` | 4.6:1 | PASS ✅ |

### Setup Modal
| Text | Background | Ratio | WCAG AA |
|---|---|---|---|
| `#fff` | `#FF5A36` primary btn | ~3.4:1 | FAIL ❌ |
| `#fff` | `#0D1B4B` secondary btn | ~15:1 | PASS ✅ |
| `#111827` ($gh-text) | `#fff` | 18.1:1 | PASS ✅ |
| `#6b7280` ($gh-text-muted) | `#fff` | 4.6:1 | PASS ✅ |
| `#10b981` ($gh-success) eyebrow | `#fff` | ~3.0:1 | BORDERLINE ⚠️ |
| `#92400E` badge text | amber bg | ~7.8:1 | PASS ✅ |

**CRITICAL:** White text on `#FF5A36` coral — **3.4:1 fails WCAG AA (4.5:1 required).** This is a blocking accessibility issue on the primary modal CTA button.

**Fix options:**
1. Use dark text (`#0D1024`) on the coral button (brand deviation but accessible)
2. Use gradient (`#FF7062→#FF3D6E`) which achieves the same ~3.4:1 (still fails — not a fix)
3. Use navy (`#0D1B4B`) as the primary button — accessible and brand-aligned
4. Darken coral to pass: `#D94025` achieves 4.5:1 vs white (significant color shift)

**Recommendation:** Move primary CTA button to use the brand gradient (`#FF7062→#FF3D6E`). Both coral variants fail WCAG AA vs white text. Neither flat coral nor gradient passes 4.5:1. The real fix is navy for primary with coral for secondary, OR use dark text on coral. This is a hard accessibility blocker.

**Note on #10B981 eyebrow:** 3.0:1 is below 4.5:1 text contrast. However, this is all-caps uppercase text at 12px — falls under WCAG large text (≥14px bold or ≥18px) — at 12px, it is NOT large text. **Flag as contrast fail.** Fix: darken to `#0D7A5B` or use `#059669` (#059669 = 4.5:1 vs white).

---

## V6 Accessibility Fix Priority

| ID | Issue | WCAG | Priority |
|---|---|---|---|
| A11y-V6-001 | LinkedIn btn 40px touch target | 2.5.5 AA | P0 BLOCKER |
| A11y-V6-002 | Modal primary btn coral contrast 3.4:1 | 1.4.3 AA | P0 BLOCKER |
| A11y-V6-003 | Modal eyebrow #10B981 contrast 3.0:1 | 1.4.3 AA | P1 HIGH |
| A11y-V6-004 | Retry btn touch target ~34px | 2.5.5 AA | P1 HIGH |
| A11y-V6-005 | Spinner infinite animation no guard | 2.3.3 / 2.2.2 | P1 HIGH |
| A11y-V6-006 | LinkedIn btn no focus ring | 2.4.7 AA | P2 MEDIUM |
| A11y-V6-007 | Modal btn focus azure not brand | Brand only | P3 LOW |
