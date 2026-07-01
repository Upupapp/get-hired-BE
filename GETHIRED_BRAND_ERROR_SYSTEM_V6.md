# GETHIRED BRAND ERROR SYSTEM V6
**Date:** 2026-07-01

---

## Error Design Principles

1. **Calm, not alarming.** Error red is used purposefully; do not over-animate.
2. **Actionable.** Every error state has a retry or escape.
3. **Honest.** Never say "Something went wrong" without a context clue.
4. **Brand-consistent.** Error icon `#EF4444`, but retry CTAs use brand coral.

---

## Error Token Reference

| Token | Value | Use |
|---|---|---|
| `--gh-color-error` | `#EF4444` | Error icons, error borders |
| `--gh-color-error-bg` | `rgba(239,68,68,0.08)` | Error panel backgrounds |
| `.danger-snackbar` | `background: #C0392B` | Toast errors (WCAG AA) |
| `.error-snackbar` | `background: #C0392B` | Alias |

---

## LinkedIn Complete — Error State Audit

**Current:**
```scss
.li-complete-error-icon { color: #ef4444; }  // ✅ matches token
.li-complete-error-title { color: #111827; }  // ✅ close to token
.li-complete-retry-btn { background: #0A66C2; }  // ❌ LinkedIn blue — wrong
```

**Retry button should be:**
```scss
.li-complete-retry-btn {
  background: var(--gh-grad-cta, linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%));
  // OR flat coral for simplicity:
  background: var(--gh-coral, #FF675D);
  color: #fff;
  border-radius: 10px;  // brand input radius
  height: 44px;
  min-height: 44px;

  &:hover {
    opacity: 0.88;
    outline: 2px solid rgba(255,112,98,0.72);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

**Rationale:** The retry is a GetHired action (re-initiating auth), not a LinkedIn action. Brand coral signals GetHired ownership of the recovery path.

---

## Error State Copywriting (LinkedIn Complete)

**Current:** `.li-complete-error-msg` — content from component template, not audited in SCSS.

**Brand standard:**
- Title: "Couldn't connect LinkedIn" (specific)
- Body: "Something went wrong connecting your account. This is usually temporary." (honest, non-blaming)
- Retry CTA: "Try again" (clear action)
- Escape: "Use email instead" (secondary link)

---

## Global Error Patterns (V5 unchanged)

### Inline field error
```css
.field-error {
  color: var(--gh-color-error, #EF4444);
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}
```

### Error panel (full-page)
```css
.gh-error-panel {
  /* Intentionally unstyled — calm, not alarming. */
  /* Reserved in _motion.scss. Add only if full-page error states needed. */
}
```

### Snackbar errors
- `.danger-snackbar` — auth/critical errors (`background: #C0392B`, left border coral)
- `.error-snackbar` — alias
- `.warn-snackbar` — rate limiting / non-critical (`background: #b45309`)

---

## V6 Error Gaps

| Gap | Component | Fix |
|---|---|---|
| Retry button uses LinkedIn blue | linkedin-complete.component.scss | Replace with brand coral |
| No error state on LinkedIn button itself | linkedin-button | Low risk — button triggers redirect |
| No error state on setup modal post-CTA | setup-success-modal | Low risk — navigation unlikely to fail |
