# GETHIRED DELETE JOB — Frontend Haptics & Effects Log V1

**Date:** 2026-06-25

---

## Haptics (Mobile)

No Haptics API calls added in this sprint. The delete confirmation dialog is an existing Angular Material dialog — haptic feedback on button press is handled by the OS-level touch feedback on mobile platforms.

Future: `navigator.vibrate(80)` on delete button press (Android only), wrapped in feature detection.

---

## CSS Animations

No new keyframe animations added to delete-specific surfaces in this sprint. All animation compliance requirements are met via:

### Existing Patterns Used

1. **Dialog reveal:** Angular Material CDK animation — respects `prefers-reduced-motion` at the browser level.

2. **Snackbar (success toast):** Angular Material MatSnackBar — slide-in/out animation. Respects system motion preferences via Material's animation config.

3. **Loading state:** The NgRx `loading: true` state driven by `deleteJob` dispatch is reflected in `loading$` which drives the reusable-table loading indicator. No button-disable animation needed — the table handles it.

---

## Effects Inventory

| Effect | Trigger | Duration | Reduced-Motion Safe |
|--------|---------|---------|---------------------|
| Confirmation dialog open | User clicks "Delete Job" in table control menu | Material CDK fade/scale | Yes — CDK |
| Loading state start | deleteJob dispatched | Immediate | N/A |
| Success toast "Job deleted." | deleteJobSuccess | 4000ms, slide-in | Yes — Material |
| Row removed from list | list replaced from deleteJobSuccess.basicList | Immediate re-render | N/A |
| Error toast (red) | deleteJobFail | 4000ms, slide-in | Yes — Material |

---

## Compliance

All animations comply with:
- `prefers-reduced-motion` via Angular Material's global animation config
- No custom animation libraries introduced
- CSS only for any custom animations (none added in this sprint)
