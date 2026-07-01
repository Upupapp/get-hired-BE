# GETHIRED BRAND COMPONENT CHOREOGRAPHY V6
**Date:** 2026-07-01

---

## Choreography Principles

1. **Enter before interact.** Content reveals before user can act on it (stagger prevents jumps).
2. **Concurrent not sequential.** Multiple elements can animate simultaneously with stagger, not wait-in-line.
3. **Exit fast.** Leave animations should be 60% of enter duration.
4. **One spring per screen.** Only one spring/overshoot curve per screen to avoid gimmick.

---

## Company Setup Success Modal — Choreography Map

```
T+0ms     Modal backdrop fades in (CDK handled)
T+0ms     .gh-setup-modal__confetti-ring: gh-pop-in (0.45s spring)
T+150ms   .gh-setup-modal__eyebrow: gh-fade-up (0.35s)
T+200ms   .gh-setup-modal__title: gh-fade-up (0.35s)
T+250ms   .gh-setup-modal__trial-badge: gh-fade-up (0.35s)
T+300ms   .gh-setup-modal__checklist: gh-fade-up (0.35s)
T+380ms   .gh-setup-modal__actions: gh-fade-up (0.35s)
T+440ms   .gh-setup-modal__footer: gh-fade-up (0.35s)
```

**Assessment:** Well-choreographed. Spring only on the celebration icon (one spring per screen rule ✅). All other elements use linear fade-up. Stagger spacing (50–80ms) is professional.

**Gap:** Total reveal takes ~775ms. This is acceptable for a milestone modal (user has just completed setup — they're in the moment). Would be too slow for a regular dialog.

---

## LinkedIn Complete Page — Choreography Map

```
T+0ms    Page loads
T+0ms    .li-complete-spinner: spins continuously (0.7s linear infinite)
T+async  On error: spinner removed, error icon/message fades in (no animation defined)
```

**Gap:** Error state has no entrance animation. Should fade in with `gh-fade-up` or similar.

---

## Auth Button Choreography

### LinkedIn Button tap → OAuth redirect
```
T+0ms    Tap/click registered
T+10ms   HapticService.light() (MISSING — backlog)
T+0ms    :active transform scale(0.985)
T+~150ms Browser navigates to LinkedIn OAuth
```

### LinkedIn callback → complete page
```
T+0ms    Spinner shows (page mount)
T+async  Auth completes → redirect (success: no animation on this page)
T+async  Auth fails → error state (no entrance animation — gap)
```

---

## Modal Dismiss Choreography

Setup modal close:
```
T+0ms    CDK overlay dismisses
T+0ms    Modal fades out (CDK managed)
```
No custom exit animation in component — relies on Angular CDK overlay defaults. Acceptable.

---

## Dashboard Card Stagger (V5 — confirmed V6)

```scss
.gh-dashboard-card {
  animation: gh-dash-card-reveal 220ms var(--gh-ease-emphasized) both;
  &:nth-child(1) { animation-delay: 0ms; }
  &:nth-child(2) { animation-delay: 40ms; }
  &:nth-child(3) { animation-delay: 80ms; }
  &:nth-child(4) { animation-delay: 120ms; }
}
```
✅ Unchanged V6.

---

## Reusable Choreography Classes

| Class | Animation | Duration | Easing | Use |
|---|---|---|---|---|
| `.gh-dashboard-card` | dash-card-reveal | 220ms | emphasized | Dashboard panels |
| `.gh-dashboard-kpi` | kpi-reveal | 220ms | standard | KPI numbers |
| `.gh-plan-meter` | meter-fill | 600ms | scan | Usage meters |
| `.gh-brand-health-card` | dash-card-reveal | 300ms | emphasized | Health panel |
| `.gh-success-pulse` | success-pulse-kf | 400ms | decelerate | Post-save feedback |
| `.gh-pressable` | (scale on :active) | 100ms | standard | Tappable elements |

---

## V6 Choreography Additions (Recommended)

1. Move `gh-pop-in` and `gh-fade-up` to `_motion.scss` as reusable global keyframes
2. Add `.gh-celebrate-icon` class applying `gh-pop-in` for reuse across future success moments
3. Add `.gh-stagger-reveal` mixin for n-child stagger (to avoid copy-pasting delays)
4. Add fade-in to LinkedIn complete error state reveal

None of these are applied in V6 SCSS (documented as backlog items).
