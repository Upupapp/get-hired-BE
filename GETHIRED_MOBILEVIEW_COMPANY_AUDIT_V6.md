# GETHIRED MOBILEVIEW — COMPANY AUDIT V6
**Date:** 2026-07-01 | **Scope:** Company profile and setup surfaces

---

## Summary

Company-related surfaces from V4/V5 carry forward as PASS. The company setup success modal is the one new company-related surface in V6 and is fully audited in `GETHIRED_MOBILEVIEW_EMPLOYER_AUDIT_V6.md`.

---

## Carry-Forward Status

| Surface | V5 Status | V6 Change | V6 Status |
|---|---|---|---|
| Company public profile (/company/:slug) | PASS | None | PASS |
| Company profile subtabs (mobile stack) | PASS | None | PASS |
| Company settings (employer-side) | PASS | None | PASS |
| Company users management | PASS | None | PASS |
| Company setup wizard | PASS | None | PASS |
| Company setup success modal | NEW V6 | Full audit — 3 fixes applied | PASS (after fixes) |

---

## Company Setup Success Modal — Quick Reference

All details in EMPLOYER_AUDIT_V6. Key facts:
- Bottom-sheet on ≤560px via `border-radius: 18px 18px 0 0` ✓
- 3 CTA buttons (flex-column, full-width, 44px height each) ✓
- Company name `overflow-wrap: break-word` added (MV6-F1) ✓
- Dashboard link `min-height: 44px` added (MV6-F2) ✓
- `:has()` fallback via `gh-bottom-sheet-pane` class (MV6-F5) ✓

---

## V6 Company Result: PASS (after V6 fixes)
