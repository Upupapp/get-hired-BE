# GETHIRED F-08 — ACCESSIBILITY AND MOBILE QA
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Save/Update Button Labeling

| Button | aria-label | Behavior When Loading |
|--------|-----------|----------------------|
| Save as Draft | Dynamic: "Saving draft..." while loading | Loading state set via `savingDraft` flag |
| Cancel | Static: "Cancel and go back" | No loading state |
| Publish Job Post | Dynamic: "Publishing..." while loading (prior B05) | Loading state set via `loading` flag |
| Next/Prev steppers | Static text ("Next: Job Requirements" etc.) | No loading |

All interactive buttons have visible text labels. No icon-only buttons in the update flow.

---

## Loading State Visibility

| Element | Screen Reader Announcement |
|---------|---------------------------|
| Draft spinner container | `aria-live="polite"` — "Saving..." announced when loading starts |
| Publish spinner container | `aria-live="polite"` — "Publishing..." (prior B05) |
| Success pulse | `role="status"`, `aria-live="polite"`, `aria-label="Saved successfully"` |
| Error alert | `role="alert"`, `aria-live="assertive"` — immediate announcement |

---

## Success/Error Visibility

| State | Visual Signal | Screen Reader Signal |
|-------|--------------|---------------------|
| Save success | Green check-circle pulse (2s) | "Saved successfully" via aria-live |
| Save error | Red error panel with icon + text | Immediate alert via aria-live="assertive" |
| Publish success | Dialog modal (existing UpdatedDialogComponent) | Modal traps focus |

---

## Keyboard Accessibility

- All buttons in the update flow are `<button>` elements — inherently keyboard accessible
- Tab order follows DOM order (Save Draft → Cancel → stepper → form fields → Next/Prev → Publish)
- `:focus-visible` glow applied to Save Draft, Cancel, and Publish buttons
- No tabindex manipulation added — natural flow preserved
- Dialog on success: `disableClose: true` — focus is trapped until user confirms

---

## Mobile Touch Targets

- `min-height: 44px` enforced on Save Draft, Cancel, and Publish buttons at `max-width: 768px`
- Padding expanded to `16px` horizontal on mobile
- WCAG 2.5.5 (Target Size) minimum 44×44px satisfied for all action buttons

---

## Reduced-Motion Compliance

| Animation | `prefers-reduced-motion: reduce` Behavior |
|-----------|------------------------------------------|
| Draft spinner | `animation: none` — static border shown instead |
| Success pulse | `animation: none` — icon still appears (static) |
| Error reveal | `animation: none` — panel appears immediately |
| Back/cancel compression | `transition: none; transform: none` |
| Draft button micro-scale | No transform on `:active` |
| Publish spinner | `animation: none` (prior B05, preserved) |

**All animations have explicit reduced-motion fallbacks.**

---

## Color Contrast

- Success pulse: `#22c55e` on white background — contrast ratio ~3.5:1 (decorative icon, not sole information carrier — text in dialog confirms save)
- Error alert: `#dc2626` on `#fff5f5` background — border + icon + text provide multiple channels (not color-only)
- Error text: Dark red on light pink — visually distinct, not color-only

---

## What Was Not Changed

- Form field labels: unchanged (not part of this sprint scope)
- Stepper accessibility: unchanged
- Interview question inputs: unchanged
- Readiness bar/chips: unchanged (B13 prior sprint)
