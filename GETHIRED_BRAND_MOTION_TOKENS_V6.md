# GETHIRED BRAND MOTION TOKENS V6
**Date:** 2026-07-01

---

## Complete Motion Token Reference

All tokens defined in `src/assets/styles/_motion.scss` (BRAND V6 section, `:root` block).

### Duration Tokens (CSS Custom Properties)

| Token | Value | Use Case |
|---|---|---|
| `--gh-motion-instant` | 80ms | State toggle, chip check |
| `--gh-motion-micro` | 160ms | Button hover, focus ring |
| `--gh-motion-card` | 220ms | Card reveal, fade-up |
| `--gh-motion-drawer` | 260ms | Drawer open/close |
| `--gh-motion-page` | 300ms | Page transitions, brand health card |
| `--gh-motion-reveal` | 400ms | Success pulse, icon pop |
| `--gh-motion-meter` | 600ms | Plan meter fill |
| `--gh-motion-analysis` | 720ms | Score bar, match reveal |
| `--gh-motion-countup` | 900ms | Number count-up animations |

### SCSS Variable Aliases (backward compat)

| SCSS Var | Value | Maps to |
|---|---|---|
| `$motion-duration-micro` | 160ms | `--gh-motion-micro` |
| `$motion-duration-card` | 220ms | `--gh-motion-card` |
| `$motion-duration-drawer` | 260ms | `--gh-motion-drawer` |
| `$motion-duration-meter-fill` | 650ms | `--gh-motion-meter` (≈600ms) |
| `$motion-duration-ambient` | 6000ms | ambient (no CSS prop equivalent) |

### Easing Tokens

| Token | Value | Use Case |
|---|---|---|
| `--gh-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `--gh-ease-enter` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Elements entering |
| `--gh-ease-exit` | `cubic-bezier(0.4, 0.0, 1, 1)` | Elements leaving |
| `--gh-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Dashboard reveals |
| `--gh-ease-scan` | `cubic-bezier(0.16, 1, 0.3, 1)` | Meter fills, data reveals |
| `--gh-ease-spring-soft` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Celebration, icon pop-in |

### Scale Tokens

| Token | Value | Use Case |
|---|---|---|
| `--gh-scale-press` | `0.985` | Button/card active press |
| `--gh-scale-chip-press` | `0.97` | Chip tap (smaller targets) |
| `--gh-scale-card-enter` | `0.985` | Card entrance (scale from) |

### Distance / Lift Tokens

| Token | Value | Use Case |
|---|---|---|
| `--gh-motion-shift-xs` | 2px | Subtle nudge |
| `--gh-motion-shift-sm` | 4px | Minor shift |
| `--gh-motion-shift-md` | 8px | Standard shift |
| `--gh-motion-shift-lg` | 12px | Prominent shift |
| `--gh-motion-lift` | -2px | Card hover lift |
| `--gh-motion-lift-strong` | -4px | Prominent hover lift |

---

## V6 New Surface Token Usage Audit

### LinkedIn Button
```scss
transition: background 0.15s ease, box-shadow 0.15s ease;
// Does not use motion tokens. 0.15s ≈ micro (160ms) but not using var()
// Low priority to change — third-party button
```

### LinkedIn Complete Spinner
```scss
animation: li-spin 0.7s linear infinite;
// 0.7s not in token set. Closest: --gh-motion-analysis (720ms)
// Gap: should use var(--gh-motion-analysis, 700ms) or closest token
```

### Company Setup Modal
```scss
animation: gh-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
// 0.45s ≈ --gh-motion-reveal (400ms), curve matches --gh-ease-spring-soft ✅ (value match)
// Should use: animation: gh-pop-in var(--gh-motion-reveal, 400ms) var(--gh-ease-spring-soft) both;

animation: gh-fade-up 0.35s ... both;
// 0.35s ≈ --gh-motion-card (220ms) or between card/reveal
// Should use: var(--gh-motion-card, 220ms)
```

---

## Keyframes Defined Globally (Available to All Components)

In `_motion.scss`:
- `gh-shimmer-v6` — shimmer for skeletons
- `gh-dash-card-reveal` — dashboard card entrance
- `gh-kpi-reveal` — KPI card entrance
- `gh-meter-fill` — plan meter fill
- `gh-success-pulse-kf` — success pulse

In company setup modal (local):
- `gh-pop-in` — spring pop entrance
- `gh-fade-up` — fade up reveal

**Recommendation:** Move `gh-pop-in` and `gh-fade-up` to `_motion.scss` so they're reusable globally for other success/celebration moments.

---

## Reduced-Motion Contract

Global in `_motion.scss`:
```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

Plus explicit class list for named components.

**V6 gap:** `.gh-setup-modal__*` classes not in explicit class list. Should add. See Implementation Log V6.

---

## Motion Token Update Status V6

| Area | Updated | Notes |
|---|---|---|
| Duration tokens | No change | Already complete from V5 |
| Easing tokens | No change | Already complete from V5 |
| Scale tokens | No change | Already complete from V5 |
| Keyframes (global) | Recommendation: add gh-pop-in, gh-fade-up | Not applied yet |
| Reduced-motion class list | Recommendation: add modal classes | Not applied yet |
| New surfaces using tokens | No — LinkedIn/modal use raw values | Documented gaps |
