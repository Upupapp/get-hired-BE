# GETHIRED BRAND QA CHECKLIST V6
**Date:** 2026-07-01

---

## How to Use This Checklist

Run through each section when reviewing a new component or screen. Mark: ✅ Pass | ❌ Fail | ⚠️ Review | N/A Not applicable.

---

## Section A: Color & Token Compliance

- [ ] All colors reference brand tokens (`--gh-*` CSS vars or registered SCSS vars)
- [ ] No unregistered hex values (check against `_tokens.scss` and `_motion.scss`)
- [ ] Third-party buttons use their brand colors only (Google white, LinkedIn blue)
- [ ] Primary CTAs use brand gradient (`#FF7062→#FF3D6E`) or accepted flat coral
- [ ] Secondary CTAs use navy (`#0D1024`)
- [ ] Success states use `#10B981`
- [ ] Warning states use `#F59E0B` (or accessible `#b45309` for text)
- [ ] Error states use `#EF4444` (icons) / `#C0392B` (toast bg)

---

## Section B: Touch Targets (WCAG 2.5.5)

- [ ] All buttons: `min-height: 44px`
- [ ] All interactive icons: `min-width: 44px; min-height: 44px`
- [ ] All form inputs: `height: 44px` (gh-input standard)
- [ ] All clickable text links that are primary actions: `min-height: 44px`
- [ ] Auth buttons (Google, LinkedIn): 44px

**V6 status:** LinkedIn button ✅ (fixed) | LinkedIn retry btn ✅ (fixed) | Setup modal buttons ✅

---

## Section C: Focus Rings (WCAG 2.4.7)

- [ ] All buttons have `:focus-visible` ring
- [ ] Default ring: `outline: 2px solid rgba(255,112,98,0.72); outline-offset: 3px`
- [ ] Exception allowed: third-party buttons may use their own brand focus ring (LinkedIn: white ring on blue bg)
- [ ] No element removes focus ring without providing an alternative

**V6 status:** LinkedIn button ✅ | LinkedIn complete retry ✅ | Setup modal buttons — uses azure #168BFF ring (not coral) ⚠️

---

## Section D: Reduced Motion (WCAG 2.3.3 / 2.2.2)

- [ ] All CSS animations have `@media (prefers-reduced-motion: reduce)` guard
- [ ] Infinite loops (`infinite` keyword) are stopped under reduced motion
- [ ] `both` fill-mode animations: explicit `opacity: 1; transform: none` under reduced motion
- [ ] `@include motion-safe` used on transition-bearing elements

**V6 status:**
- LinkedIn button: ✅ (guard present)
- LinkedIn complete spinner: ✅ (guard present, coral static ring)
- Setup modal: ✅ (component-level block present)

---

## Section E: Contrast (WCAG 1.4.3 AA)

- [ ] Text on white: minimum 4.5:1
- [ ] Large text (18px+ or 14px bold+): minimum 3:1
- [ ] Text on colored backgrounds: verify individually
- [ ] All-caps eyebrow labels at 12px: must meet 4.5:1 (not large text)

**V6 status:**
- LinkedIn button text (#fff on #0A66C2): ✅ ~4.6:1
- Modal primary button (#fff on #FF5A36): ❌ ~3.4:1 — BLOCKER — TODO A11y-V6-002
- Modal eyebrow (#10B981 on #fff): ❌ ~3.0:1 — TODO A11y-V6-003
- Modal secondary btn (#fff on #0D1024): ✅ ~15:1
- Error text (#6b7280 on #fff): ✅ ~4.6:1

---

## Section F: Typography

- [ ] Body text: `font-size: 14px; font-family: Manrope`
- [ ] Headings follow token scale (`--gh-text-page-size: 28px` / `--gh-text-section-size: 20px`)
- [ ] Eyebrow labels: `12px, 600, letter-spacing 0.08em, uppercase`
- [ ] Helper text: `12px, 400`
- [ ] No rogue font-families (Roboto, Inter, system-ui allowed only for GIS button)

**V6 status:** LinkedIn button inherits Manrope ✅ | Setup modal inherits Manrope ✅

---

## Section G: Motion Quality

- [ ] No `transition-property: all` (too broad — paint-triggering properties animate)
- [ ] Enter/exit animations use GPU properties (transform, opacity)
- [ ] No layout-triggering properties animated (width, height, margin, padding)
- [ ] Spring curves used at most once per screen

**V6 status:** All animations GPU-only ✅ | One spring per modal ✅

---

## Section H: Haptics

- [ ] User-initiated actions have haptic call documented
- [ ] No haptic on page load, passive data display, or rejection events
- [ ] `HapticService` calls in TypeScript, not SCSS

**V6 status:** All haptic calls missing on LinkedIn + setup modal — documented in Haptics Spec V6

---

## Section I: gh-form-card Standard

- [ ] Forms/settings pages: `.gh-form-card` (18px radius, 24px padding, `0 4px 22px rgba(0,0,0,0.07)` shadow)
- [ ] Inputs: `.gh-input` (44px height, 1.5px solid #DDD8F0 border, 10px radius, 14px Manrope)
- [ ] Dialogs/modals: documented departure acceptable

**V6 status:** LinkedIn pages — N/A (not forms) | Setup modal — documented dialog departure ✅

---

## V6 QA Results Summary

| Section | Status | Blockers |
|---|---|---|
| A: Color tokens | PARTIAL | azure/navy token misalignment (FIX-006, FIX-007 applied) |
| B: Touch targets | PASS | All fixed |
| C: Focus rings | PARTIAL | Setup modal uses azure ring, not coral |
| D: Reduced motion | PASS | All surfaces covered |
| E: Contrast | FAIL | Modal primary btn + eyebrow fail WCAG AA |
| F: Typography | PASS | Manrope inherited throughout |
| G: Motion quality | PASS | GPU-only animations |
| H: Haptics | MISSING | Not blocking (TS concern) |
| I: gh-form-card | PASS (N/A) | Dialogs documented |

**QA Verdict:** NOT FULL PASS — 2 WCAG contrast failures require follow-up fix.
