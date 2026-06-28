# GETHIRED_BRAND_IMPLEMENTATION_LOG.md
## BRAND QA Cycle 11 — Implementation Log
_Generated: 2026-06-25_

---

## Code Changes Applied This Cycle

### FIX-01: Interview Hub Shimmer Gradient
**File:** `src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.scss`
**Status:** APPLIED

**Problem:** `.ih-skeleton-chip` and `.ih-skeleton-line` used `background: #e5e7eb` (solid color) while animating `background-position`. A solid background has no visible gradient, making the shimmer animation a no-op — skeletons appeared as flat gray rectangles with no shimmer effect.

**Fix:** Added `background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)` and `background-size: 400px 100%` to both `.ih-skeleton-chip` and `.ih-skeleton-line`. The keyframe `ih-shimmer` (`background-position: -400px 0 → 400px 0`) now animates a visible gradient, producing the intended shimmer effect.

**Diff summary:**
```
.ih-skeleton-chip:
  - background: #e5e7eb;
  + background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
  + background-size: 400px 100%;

.ih-skeleton-line:
  - background: #e5e7eb;
  + background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
  + background-size: 400px 100%;
```

**Reduced-motion impact:** None — `@include ambient-motion-safe` was already present; the gradient is applied to the `background` property (not `animation`), so under reduced-motion the element shows the gradient without animation (neutral appearance).

---

## Pre-existing Fixes Confirmed in Scope (Applied in Prior Cycles)

### FIX-02: Avatar Broken Image Handler (Messages)
**File:** `src/app/employer-panel/recruiter-messages/recruiter-messages.component.html`
**Status:** ALREADY APPLIED (confirmed in current file at lines 96–106)

The avatar `<img>` already has `(error)="t['_photoError'] = true"` and the initials fallback uses `*ngIf="!t.applicantPhotoUrl || t['_photoError']"`. This correctly shows initials when the image URL is present but the image fails to load.

This is a stronger pattern than the simple `t.applicantPhotoUrl = null` approach because it:
- Preserves the original URL (available for debugging/retry)
- Uses an explicit error flag (`_photoError`) rather than mutating the data model

---

## Changes NOT Applied (Deferred to Backlog)

| Ref | Description | Reason Deferred |
|---|---|---|
| RISK-01 | Add non-color indicator to IH filter chip active state | Visual-only, no accessibility blocker under current audit |
| RISK-04 | Normalize `_motion.scss` import paths | Cosmetic, not functional |
| RISK-05 | Replace hardcoded 120ms/140ms in Messages with `$motion-duration-micro` | Minor drift, not user-perceptible |
| RISK-07 | Fix contrast on IH active filter chip | Requires visual design decision; color ratio is marginal |
| BACKLOG-E1 | Add "Show all applicants" CTA to IH filter-empty | Enhancement, not regression |
| BACKLOG-E2 | Add entry animation to `.ih-empty` | Enhancement |
| BACKLOG-S1 | Semantic `.success-snackbar--true` with green | Enhancement |
| BACKLOG-O1/O2 | Offline detection and banner | New feature |
| BACKLOG-C1–C3 | Copy and icon improvements | Enhancement |

---

## Summary

- Total files modified: 1
- Total fixes applied: 1 (FIX-01)
- Pre-existing fixes confirmed: 1 (FIX-02)
- No auth/payment/route/core-business-logic changes
- No new npm packages
- No new SCSS variables introduced
- All existing motion tokens preserved
