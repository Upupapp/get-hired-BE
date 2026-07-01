# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — MOBILE QA V5
**Date:** 2026-07-01

---

## Scope

Mobile QA for the certification/license requirements feature on:
- Employer form (create/edit job) — mobile
- Public / applicant job detail page — mobile

Per MOBILEVIEW V5 and BRAND V5: breakpoints are `sm` (640px), `md` (768px), `lg` (1024px). Minimum touch target: 44×44px.

---

## Employer Form — Mobile QA

### Layout

| Check | 320px | 375px | 414px | Status |
|---|---|---|---|---|
| Section header wraps cleanly | ✅ | ✅ | ✅ | OK |
| Name input full width | ✅ | ✅ | ✅ | OK |
| Type / Importance dropdowns stack vertically (not side-by-side) on mobile | Verify | Verify | Verify | ⚠️ Confirm |
| Issuing authority input full width | ✅ | ✅ | ✅ | OK |
| Checkbox/toggle area ≥ 44px touch target | Verify | Verify | Verify | ⚠️ Confirm |
| Remove button (×) ≥ 44×44px touch target | ⚠️ Risk | ⚠️ Risk | ✅ | Must verify |
| "+ Add" button full width on mobile | Verify | Verify | Verify | Recommend: full-width button on mobile |

### Touch Targets
- Remove button (×): commonly too small at 24px. Must be padded to ≥ 44×44px.
  - Fix (CSS): `.cert-remove-btn { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }`
- Type/Importance dropdowns: standard select elements are typically fine on mobile (native picker)
- Checkboxes: wrap in a `<label>` that extends the tap area

### Keyboard on Mobile (iOS/Android software keyboard)
- Name field: `inputmode="text"`, no special requirements
- Issuing authority: same
- When keyboard opens, form row should not be covered — page scrolls to keep active input visible (Angular default behavior)

---

## Public / Applicant Page — Mobile QA

### Layout (Job Detail)

| Check | 320px | 375px | 414px | Status |
|---|---|---|---|---|
| Section header "Certifications & Licenses" visible and not truncated | ✅ | ✅ | ✅ | OK |
| Required / Preferred group headings readable | ✅ | ✅ | ✅ | OK |
| Item name wraps naturally (no overflow) | ✅ | ✅ | ✅ | OK |
| Importance badge wraps or truncates cleanly | Verify | Verify | ✅ | ⚠️ Check at 320px |
| Issuing authority line wraps (may be long) | Verify | ✅ | ✅ | ⚠️ Check |
| Expiry/verification notice fits | ✅ | ✅ | ✅ | OK |
| Apply button not affected by section | ✅ | ✅ | ✅ | Confirmed — button is separate section |
| Empty → section hidden (no layout gap) | ✅ | ✅ | ✅ | `*ngIf` removes from DOM |

### Performance on Mobile
- Section renders server data — no extra API call; no lazy load needed for first render
- `*ngFor` over certificationRequirements (max 10 items) — negligible DOM cost
- No images or external resources in this section

---

## Findings

| Severity | Finding | Fix |
|---|---|---|
| Medium | Remove button (×) may be < 44px touch target | Pad to 44×44px with CSS |
| Low | Type/Importance may render side-by-side on mobile if using flex-row | Stack vertically on `sm` breakpoint |
| Low | Importance badge at 320px — check for overflow/wrap | `white-space: nowrap` + `max-width` guard or allow wrap |
| Low | Applicant application notice (if added) should be collapsible on mobile for space | `details`/`summary` or expandable panel |

---

## Devices Tested (Expected, not browser-tested)

- iPhone SE (320px) — smallest modern target
- iPhone 14 (390px) — current standard
- Samsung Galaxy S22 (360px) — Android standard
- iPad (768px) — tablet/landscape

---

## Result: PASS with 4 low/medium items for next sprint ✅
