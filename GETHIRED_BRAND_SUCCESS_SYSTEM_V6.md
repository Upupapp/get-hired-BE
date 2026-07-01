# GETHIRED BRAND SUCCESS SYSTEM V6
**Date:** 2026-07-01

---

## Success Design Principles

1. **Celebrate appropriately.** Major milestones (company setup, first job post) get spring animations. Minor successes (form save) get a simple check snackbar.
2. **Don't overdo it.** Spring entrance once per session event. Never loop success animations.
3. **Accessible.** `prefers-reduced-motion` users see the content without the motion.
4. **Honest.** Only show success signals for genuinely completed actions.

---

## Success Token Reference

| Token | Value | Use |
|---|---|---|
| `--gh-color-success` | `#10B981` | Check icons, success badges, eyebrow text |
| `.success-snackbar` | `background: #1A7A4A` | Toast success (WCAG AA 4.85:1) |
| `gh-success-pulse` | scale 1→1.04→1, 400ms | Button/chip micro-success |
| `gh-pop-in` | scale 0.6→1, 0.45s spring | Major milestone icon entrance |
| `gh-fade-up` | translateY 10px→0, 0.35s | Staggered content reveal |

---

## Company Setup Success Modal — V6 Audit

### What it does well ✅
- `gh-pop-in` spring entrance on confetti ring: on-brand for milestone moment
- `#10B981` success color for check icon and eyebrow: token-consistent
- `#F59E0B` amber trial badge: token-consistent
- Staggered `gh-fade-up` reveals: professional, purposeful
- Checklist summary: clear and informative
- CTA stack (primary / secondary / tertiary): well-structured

### Gaps
- No `prefers-reduced-motion` block at component level (global covers it, but component guard is best practice)
- `gh-pop-in` and `gh-fade-up` not using `var(--gh-ease-spring-soft)` or `var(--gh-ease-standard)` CSS properties

### Recommended addition to component SCSS:

```scss
// Reduced-motion guard — belt-and-suspenders on top of global _motion.scss rule
@media (prefers-reduced-motion: reduce) {
  .gh-setup-modal__confetti-ring,
  .gh-setup-modal__eyebrow,
  .gh-setup-modal__title,
  .gh-setup-modal__trial-badge,
  .gh-setup-modal__checklist,
  .gh-setup-modal__actions,
  .gh-setup-modal__footer {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

## Success Haptics (All Success Surfaces)

| Trigger | Haptic | Timing |
|---|---|---|
| Company setup modal opens (user-initiated) | `HapticService.success()` | On modal mount |
| LinkedIn auth complete (success redirect) | `HapticService.medium()` | Before navigation |
| Form save success | `HapticService.light()` | On snackbar show |

Note: Haptic calls belong in the component TypeScript, not SCSS. Document here for completeness.

---

## Success Snackbar (V5 — unchanged)

```css
.success-snackbar {
  background-color: #1A7A4A;  /* WCAG AA 4.85:1 vs white */
  color: #ffffff;
}
```

---

## Success State Checklist (Per Component)

- [ ] Green check icon (`#10B981`)
- [ ] Success headline (celebratory but not excessive)
- [ ] Summary of what was accomplished
- [ ] Clear primary CTA to continue
- [ ] `prefers-reduced-motion` guard on all animations
- [ ] `aria-live="polite"` or `role="status"` on success message for screen readers
- [ ] Haptic call on mount (user-initiated success only)
