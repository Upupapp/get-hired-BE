# NOTIFY-P2: Accessibility Log

**Date:** 2026-06-26

---

## Toast ARIA behavior

Angular Material `MatSnackBar` renders into a `mat-snack-bar-container` with `role="status"` and `aria-live="polite"` by default. All four toast classes (success, danger, warning, info) use this container.

**Concern:** The `danger-snackbar` (all invites failed) is an error outcome and ideally should use `aria-live="assertive"` so screen readers interrupt current reading. Angular Material does not expose per-call ARIA live region customization on the `open()` API in Angular 13. Mitigation: the `panelClass` approach is consistent with the existing `danger-snackbar` usage across 13+ files in this codebase, and the 6000ms duration gives screen reader users adequate time to encounter the announcement.

**Future enhancement:** Consider a custom snackbar component that sets `aria-live="assertive"` for error outcomes. Logged in BACKLOG.

---

## Copy accessibility

| Outcome | Message | Notes |
|---------|---------|-------|
| 1 invite sent | "Invite sent." | Short, clear |
| N invites sent | "5 invites sent." | Numeric, no ambiguity |
| Partial success | "3 sent. 2 couldn't be added." | Both counts explicit |
| All failed | "No contacts were added." | States what happened, not cause |
| Duplicate single contact | "This contact is already in your list." | Describes the state |
| Duplicate single candidate | "This candidate is already in your list." | Same pattern |
| Duplicates only (bulk) | "No new contacts were added. These contacts are already in your list." | Full sentence |
| All failed (bulk) | "No contacts were added." / "No candidates were added." | Distinguishes flow |

All messages avoid:
- Technical jargon (no "HTTP 422", "DUPLICATE_CONTACT", "null response")
- Blaming the user ("Your import failed" → "No contacts were added")
- False claims ("Successfully added" when nothing was added)

---

## Focus management

No change. The existing dialog close behavior (`dialogRef.close(null)`) returns focus to the trigger element. No additional focus trapping is introduced by this patch.

---

## Color contrast

`warning-snackbar` (`#f59e0b` on white text `#ffffff`): contrast ratio ≈ 2.5:1 — below WCAG AA 4.5:1 for small text. This is a known limitation of amber/yellow warning colors. Mitigation: the copy already conveys the outcome in words; color is supplementary. Logged in BACKLOG for color refinement.

`info-snackbar` (`#6b7280` on `#ffffff`): contrast ratio ≈ 5.7:1 — passes WCAG AA for normal text.
