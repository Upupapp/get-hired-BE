# GETHIRED_BRAND_ERROR_SYSTEM.md
## BRAND QA Cycle 11 — Error System
_Generated: 2026-06-25_

---

## Error State Coverage

### Interview Hub Error
**Trigger:** `!loading && error`
**Container:** `.ih-error` (role="alert")
**Copy:**
- Heading: "We couldn't load interview activity." — clear, calm, not alarming
- Body: "This might be a temporary issue. Try again or return to your dashboard." — action-oriented
**Actions:** "Try again" (primary button, calls `retry()`) + "Back to dashboard" (ghost, routerLink)
**Semantics:** `role="alert"` — announced immediately on appearance to screen readers

**Verdict:** PASS — meets BRAND rules (calm copy, dual CTA, role=alert, no color-only indicator)

### Messages Inbox Error
**Trigger:** `!loading && error`
**Container:** `.rm-state-panel.rm-state-panel--error` (role="alert")
**Copy:**
- Heading: "We couldn't load your messages" — clear
- Body: "Please try again. If the issue continues, go back to your dashboard." — dual option
**Actions:** "Try again" (primary, `[disabled]="retrying"`) + "Back to dashboard" (outline)
**Semantics:** `role="alert"`

**Verdict:** PASS — disabled state on retry button prevents double-submit

### Panel Shell Error
**Trigger:** `loading$` emits false, `employee$` never emitted
**Container:** `.gh-fallback-page` (role="alert", inline style)
**Copy:** "We couldn't load your profile. Please refresh the page or sign in again." — with sign-in link
**Verdict:** PASS — functional. Noted: inline styles should migrate to CSS class (backlog item)

## Error Styling

| Component | Border | Background | Color indicator | Verdict |
|---|---|---|---|---|
| IH error | None | White | None | PASS — calm |
| RM error | `#fca5a5` (red) | `#fff7f7` (pink) | Color + border — not color-only (text also changes) | PASS |

## Rules Compliance

- No alarming animations on error panels (BRAND rule: "calm, not alarming") — PASS
- `.gh-error-panel` / `.gh-fallback-page` classes exist in `_motion.scss` with comment "no animation by default" — PASS
- Error states have text content independent of color — PASS
- Retry logic resets loading flag before re-fetch (prevents stale error display) — PASS
