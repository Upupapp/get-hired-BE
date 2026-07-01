# GETHIRED BRAND EMPTY/FALLBACK SYSTEM V6
**Date:** 2026-07-01

---

## Empty State Principles

1. **Not a dead end.** Every empty state has a call-to-action.
2. **Contextual.** The CTA is relevant to what's empty (e.g., "Post your first job" not "Get started").
3. **Calm.** No alarming colors. Use muted text and a simple illustration.
4. **No fake data.** Never populate empty states with sample/fake content as if it were real.

---

## Empty State Token Reference

| Element | Token/Value |
|---|---|
| Illustration container | `--gh-bg: #F6F7FB` |
| Primary text | `--gh-text: #101828`, 16px 600 |
| Secondary text | `--gh-text-secondary: #667085`, 14px 400 |
| CTA | Brand coral gradient button |
| Icon/illustration color | `--gh-text-muted: #98A2B3` |

---

## V6 New Surface Empty States

### LinkedIn Button — No Empty State Applicable
The button itself is not a data-dependent component. N/A.

### LinkedIn Complete Page — No Data Empty State
Loading → success (redirect) or error. No empty state needed. ✅

### Company Setup Modal — No Empty State Applicable
Modal shows only after successful setup. N/A.

---

## Global Empty State Patterns (V5 — confirmed V6)

### Dashboard tabs with no data
```html
<div class="gh-empty-state">
  <div class="gh-empty-state__icon">
    <!-- Icon or SVG illustration -->
  </div>
  <p class="gh-empty-state__title">No [items] yet</p>
  <p class="gh-empty-state__body">Start by [action].</p>
  <button class="btn-primary">+ [Action]</button>
</div>
```

```scss
.gh-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 12px;

  &__icon { color: var(--gh-text-muted); margin-bottom: 8px; }
  &__title { font-size: 16px; font-weight: 600; color: var(--gh-text); margin: 0; }
  &__body { font-size: 14px; color: var(--gh-text-secondary); margin: 0; max-width: 320px; }
}
```

---

## Fallback Page (`gh-fallback-page`)

Reserved in `_motion.scss`. Not yet styled. Recommendation:

```scss
.gh-fallback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  background: var(--gh-bg, #F6F7FB);
  padding: 48px 24px;
  text-align: center;
}
```

---

## V6 Empty State Gaps

None specific to V6 surfaces. Global empty state pattern needs SCSS class definition in a shared partial. Tracked in Backlog V6.
