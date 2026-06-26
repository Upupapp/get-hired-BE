# NOTIFY-P1 Frontend Accessibility Log
**GETHIRED_NOTIFY_P1_PAYMONGO_FRONTEND_ACCESSIBILITY_LOG_V2**
Run: 2026-06-26 | FE HEAD: 553ce0c

---

## NOTIFY-P1 A11y Impact: NONE

NOTIFY-P1 is a backend fix. No FE HTML, ARIA attributes, or focus management was changed. This document records the existing a11y baseline for payment/subscription surfaces.

---

## Payment/Subscription A11y Baseline

### subscriptions.component.html

| Element | A11y state |
|---------|-----------|
| Progress bars | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` present ✅ |
| Plan badge (subscription name) | Rendered as `<span>` inside text — readable by SR ✅ |
| History table | `<div>` table with no `role="table"` | gap (existing, not introduced by NOTIFY-P1) |
| "Upgrade Plan" / "Pay now" buttons | `<button>` — keyboard accessible ✅ |
| Alert icon for usage limit | `<i class="bi bi-exclamation-circle text-danger">` — icon-only, no aria-label | gap |
| Amounts | `{{ sub.price | currency }}` — readable by SR ✅ |

### employer-subscription.component

- Delegates to `<app-subscriptions>` — no additional a11y concerns.

### Payment state changes — SR announcements

**Current:** No `role="status"` or `aria-live` region for subscription state changes.
**Gap:** When subscription becomes active after payment, there is no programmatic announcement to screen readers.

**Not introduced by NOTIFY-P1:** This gap pre-exists and is unchanged.

---

## A11y Gaps (Pre-Existing, Not Introduced by NOTIFY-P1)

| Gap | Severity | Location |
|-----|----------|---------|
| History `<div>` table missing `role="table"`, `role="row"`, `role="cell"` | Moderate | subscriptions.component.html |
| Alert icon for usage limit has no `aria-label` or SR-only text | Moderate | subscriptions.component.html |
| No `role="status"` / `aria-live` for subscription activation | Moderate | subscriptions.component |
| No "Verifying payment" pending state — SR cannot know to wait | Moderate | (no component for this exists) |
| "Invoice" download link (`<a>` with no href) — not keyboard-reachable | High | subscriptions.component.html |

---

## No A11y Regressions from NOTIFY-P1

No FE changes were made. All existing a11y properties are preserved.

---

## Recommendations for P2 A11y Sprint

1. Add `role="status"` wrapper for subscription activation feedback
2. Add `aria-label` to the usage-limit alert icon
3. Fix `<a>` invoice links to have `href` (or use `<button>`)
4. When payment pending state is added (P2 UX), use `aria-busy="true"` on the plan card during verification
5. For payment history table: add `role="table"` / column headers with `scope="col"`
