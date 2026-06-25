# NOTIFY-P2: Frontend Haptics & Effects Log

**Date:** 2026-06-26

---

## Toast duration changes

| Outcome | Old duration | New duration | Reason |
|---------|-------------|-------------|--------|
| All success | 4000ms | 4000ms | Unchanged |
| Partial success | N/A | 6000ms | Extra reading time for "N added, M couldn't" copy |
| Duplicate only | N/A | 5000–6000ms | "Already in list" needs time to read |
| All failed | N/A | 6000ms | Longer dwell for error to register |

---

## Color semantics (toast panel classes)

| Class | Color | Semantic |
|-------|-------|----------|
| `success-snackbar` | Brand red-buttons | Positive outcome — contacts added |
| `danger-snackbar` | `#FE6F61` | Failure — no contacts added |
| `warning-snackbar` | `#f59e0b` amber | Partial — some added, some failed |
| `info-snackbar` | `#6b7280` neutral gray | No-op — duplicates, nothing changed |

---

## Motion / animation considerations

No new enter/exit animations are added to toasts in this patch. The existing Angular Material `MatSnackBar` uses its built-in slide-in-from-bottom enter animation, consistent across all panelClass variants. The `panelClass` only controls background color/color, not animation.

---

## Haptics (mobile)

No haptic feedback is emitted by the Angular Web app — haptics are outside Angular Material's scope and not currently implemented in this codebase. Mobile haptics are deferred to a future native-wrapper layer.

---

## Accessibility note (see ACCESSIBILITY_LOG for full detail)

Toast dismissal: All snackbars use Angular Material's built-in ARIA management. The `danger-snackbar` and `warning-snackbar` announce via `role="alert"` / `aria-live="assertive"`. The `info-snackbar` and `success-snackbar` use `aria-live="polite"`. See ACCESSIBILITY_LOG.
