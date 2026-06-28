# GETHIRED_BRAND_LOADING_SYSTEM.md
## BRAND QA Cycle 11 — Loading System
_Generated: 2026-06-25_

---

## Loading Patterns in Scope

### Interview Hub Skeleton
**File:** `recruiter-interview-hub.component.scss`

- Filter chip skeletons: 3 × `.ih-skeleton-chip` (110px × 34px, border-radius 20px)
- Card skeletons: 3 × `.ih-skeleton-card` (border 1px, border-radius 10px, padding 18px 20px)
  - Each card has 3 lines: name (45% width, 12px height), job (65%), meta (30%)
- Shimmer animation: `ih-shimmer` keyframe (`background-position: -400px→400px`)

**CLS Assessment:**
- Card skeleton dimensions (border-radius 10px, padding 18px 20px) match `.ih-card` real content dimensions (border-radius 10px, padding 18px 20px) — NO CLS on transition
- Filter chip skeleton (110px × 34px) vs real `.ih-filter-chip` (height ~34px from padding 6px 16px + font 0.8125rem line-height ~20px ≈ 32–34px) — MATCHES
- Line heights in skeleton (12px) vs real text (0.875rem ≈ 14px) — minor gap but lines are just decorative skeleton elements, not slotted content — acceptable

**Shimmer Bug (FIX-01):**
```scss
// CURRENT — no-op: background-position animates but no gradient exists
.ih-skeleton-chip {
  background: #e5e7eb;
  animation: ih-shimmer 1.4s ease-in-out infinite;
}
// REQUIRED — add gradient background-image:
.ih-skeleton-chip {
  background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
  background-size: 400px 100%;
  animation: ih-shimmer 1.4s ease-in-out infinite;
}
// Same fix needed for .ih-skeleton-line
```

### Messages Inbox Skeleton
**File:** `recruiter-messages.component.scss`

- 5 × `.rm-skeleton-row` (height 72px, border-radius 12px)
- Shimmer: `rm-shimmer` with correct `background: linear-gradient(90deg, ...)` and `background-size: 400% 100%` — FUNCTIONAL
- Height 72px matches `.rm-thread-row` actual height (padding 14px 16px + ~44px content ≈ 72px) — NO CLS

### Panel Shell Loading
**File:** `employer-panel.component.html`

- Uses `<app-loading>` component — shared, not audited here
- Positioned at `margin-top: 30vh` — acceptable center-screen placement
- Protected by `loading$ | async` observable from facade

## Reduced-Motion Compliance

| Element | Mixin Applied | Verdict |
|---|---|---|
| `.ih-skeleton-chip` | `@include ambient-motion-safe` | PASS |
| `.ih-skeleton-line` | `@include ambient-motion-safe` | PASS |
| `.rm-skeleton-row` | `@include ambient-motion-safe` | PASS |
| `.rm-page` (page reveal) | `@include motion-safe` | PASS |

## Action Required

**FIX-01 (MEDIUM):** Add `background-image: linear-gradient(...)` and `background-size` to `.ih-skeleton-chip` and `.ih-skeleton-line` in `recruiter-interview-hub.component.scss` to make the shimmer animation visible.
