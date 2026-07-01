# GETHIRED MOBILEVIEW — RELEASE GATE V6
**Date:** 2026-07-01

---

## Gate Decision: GO WITH CAUTION

---

## Gate Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | No new touch targets below 44px in V6 new surfaces | PASS (MV6-F2 fixed the dashboard link) |
| 2 | No horizontal overflow at 320px in V6 new surfaces | PASS (MV6-F1, MV6-F4 fixed) |
| 3 | LinkedIn button full-width at all breakpoints | PASS (MV6-F3 fixed) |
| 4 | LinkedIn complete page readable at all breakpoints | PASS |
| 5 | Company setup modal bottom-sheet behavior on mobile | PASS (MV6-F5 fixed :has() concern) |
| 6 | `:has()` selector has a fallback for older browsers | PASS (MV6-F5) |
| 7 | No regressions in V5 surfaces (Google button, role classification) | PASS (no changes) |
| 8 | No backend changes | PASS |
| 9 | No routing changes | PASS |
| 10 | No new features introduced | PASS |
| 11 | `prefers-reduced-motion` respected in all new surfaces | PASS |
| 12 | `aria-label`, `aria-live`, `role` attributes correct on new surfaces | PASS |

---

## Remaining Risks (not blocking)

| Risk | Severity | Notes |
|---|---|---|
| `$gh-coral` (#FF5A36) on white text — ~3.4:1 contrast ratio | MEDIUM | Below WCAG AA 4.5:1 for normal text. Affects primary CTA button in success modal. Listed in BACKLOG as A11y-V6-002. Not a mobile-specific risk. |
| Company name very long (50+ chars) on 320px | LOW | `overflow-wrap: break-word` now applied, but extremely long names may still look cramped at 320px. Acceptable UX — rare edge case. |
| `:has()` fallback relies on `gh-bottom-sheet-pane` class being applied at component level | LOW | Risk is mitigated by the fix in employer-settings.component.ts. If modal is opened from a different call site in the future, remember to include both panelClass entries. |

---

## What "GO WITH CAUTION" Means

All mobile-blocking issues are fixed. The caution flags are:
1. The contrast ratio on the coral primary button is a known deferred item (not new in V6, pre-existing)
2. The `:has()` fallback is new and untested on a physical older-Chrome device — recommend a quick smoke test

**RELEASE DECISION: GO WITH CAUTION — safe to ship once smoke-tested on mobile device.**
