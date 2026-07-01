# GETHIRED BRAND MICROINTERACTIONS LIBRARY V6
**Date:** 2026-07-01

---

## Microinteraction Philosophy
Every microinteraction serves one of:
- **Feedback** — confirms user input was received
- **Status** — communicates system state
- **Guidance** — reveals affordance
- **Delight** — celebrates a meaningful moment (sparingly)

Never: decorative motion, attention-seeking loops, fake "thinking" delays.

---

## Button Microinteractions

### Primary Button (`.btn-primary`)
```scss
// Global styles.scss
&:hover {
  opacity: 0.88;
  outline: 2px solid rgba(255, 112, 98, 0.72);
  outline-offset: 3px;
}
```
Scale press: `transform: scale(0.985)` on `:active` via `.gh-pressable` or `@media (hover: none)` global.

### LinkedIn Button
```scss
&:hover { background: #004182; box-shadow: 0 2px 6px rgba(0,0,0,0.22); }
&:active { background: #003771; transform: scale(0.985); }
```
Gap: no `prefers-reduced-motion` guard on `:active` transform. Fix: wrap in `@media (prefers-reduced-motion: no-preference)`.

### Setup Modal Primary Button
```scss
&:hover { background: darken(#FF5A36, 6%); box-shadow: 0 6px 18px rgba(255,90,54,0.38); }
&:active { transform: scale(0.978); }
```
Consistent with brand press behavior. ✅

### Setup Modal Secondary Button
```scss
&:hover { background: lighten(#0D1B4B, 8%); box-shadow: 0 4px 14px rgba(13,27,75,0.26); }
&:active { transform: scale(0.978); }
```
✅

### Setup Modal Tertiary Button
```scss
&:hover { background: #EEF2FF; border-color: rgba(#2563EB, 0.35); color: #2563EB; }
&:active { transform: scale(0.978); }
```
Gap: hover color uses `#2563EB` — should use `--gh-azure: #168BFF`.

---

## Form Input Microinteractions

### `.gh-input` standard
```scss
// On focus: brand border
&:focus {
  border-color: var(--gh-coral, #FF675D);
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 103, 93, 0.15);
}
```

---

## Card Microinteractions (V5 — confirmed V6)

```scss
.gh-card, .job-card, .mat-card {
  transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
  }
}
```

---

## Success Microinteraction (`.gh-success-pulse`)

```scss
@keyframes gh-success-pulse-kf {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1); }
}
// Apply after successful save/action
.gh-success-pulse {
  animation: gh-success-pulse-kf 400ms cubic-bezier(0.0, 0.0, 0.2, 1);
  @include motion-safe;  // stops for reduced-motion users
}
```

---

## Modal Entrance Microinteractions

### Confetti ring (`gh-pop-in`)
```scss
@keyframes gh-pop-in {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
// Timing: 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)
// Maps to: --gh-ease-spring-soft
```

### Staggered reveal (`gh-fade-up`)
```scss
@keyframes gh-fade-up {
  from { transform: translateY(10px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
// Timing: 0.35s, delays: 0.15s, 0.2s, 0.25s, 0.3s, 0.38s, 0.44s
```

Both map to motion tokens. CSS var equivalents:
- `var(--gh-ease-spring-soft)` = `cubic-bezier(0.34, 1.56, 0.64, 1)` ✅
- Duration: use `var(--gh-motion-reveal, 400ms)` for `gh-pop-in`; `var(--gh-motion-card, 220ms)` for `gh-fade-up`

---

## V6 Microinteraction Gaps

| Gap | Component | Priority |
|---|---|---|
| No reduced-motion on LinkedIn button `:active` | linkedin-button | MEDIUM |
| Modal tertiary hover uses unregistered azure | setup-success-modal | LOW |
| No success pulse on form saves across app | Global | LOW |
| Focus ring on modal buttons uses azure not coral | setup-success-modal | LOW |
