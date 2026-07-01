# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — ACCESSIBILITY QA V5
**Date:** 2026-07-01

---

## WCAG 2.1 AA Audit

### Employer Form — Certification Section

| Check | Standard | Status |
|---|---|---|
| Section heading present ("Certifications & Licenses") | 1.3.1 Info & Relationships | ✅ |
| Form fields have visible labels | 1.3.1 / 2.4.6 | ✅ (Name, Type, Importance, Issuing authority) |
| Labels programmatically associated with inputs | 1.3.1 | Verify: `for` attribute or `aria-labelledby` required |
| Checkbox/toggle for expiryRequired has label | 1.3.1 | Verify: "Valid/unexpired document may be requested" label wired |
| Checkbox/toggle for verificationRequired has label | 1.3.1 | Verify: "Employer may ask for proof" label wired |
| Add button has descriptive text | 2.4.6 | ✅ "+ Add certification or license" |
| Remove button accessible label | 4.1.2 | ⚠️ Verify: "× remove" button should have `aria-label="Remove [req name]"` — not just "×" |
| Focus management after add | 2.4.3 | ⚠️ Recommend: focus moves to new row's name input after add |
| Focus management after remove | 2.4.3 | ⚠️ Recommend: focus moves to "Add" button after row removed |
| Error message linked to field | 1.3.1 / 3.3.1 | ⚠️ Verify: error text associated via `aria-describedby` |
| Color contrast — badge labels | 1.4.3 (4.5:1) | ✅ Required: `#B91C1C` on `#FDECEA` (check); Preferred: `#15803D` on `#F0FDF4` (check) |
| Color contrast — form labels | 1.4.3 | ✅ Inherits GetHired global label style |
| Keyboard: add row with Enter/Space | 2.1.1 | ✅ (native button) |
| Keyboard: remove row with Enter/Space | 2.1.1 | ✅ (native button) |
| Keyboard: navigate between fields in each row | 2.1.1 | ✅ (standard tab order) |
| No trap focus in section | 2.1.2 | ✅ |

---

### Public / Applicant Display

| Check | Standard | Status |
|---|---|---|
| Section announced to screen readers | 1.3.1 | ✅ `aria-label="Certifications & Licenses"` on section |
| List structure: `<ul>`/`<li>` with roles | 1.3.1 | ✅ `role="list"` / `role="listitem"` |
| Required/Preferred group headings (`<h4>`) | 1.3.1 | ✅ Semantic heading hierarchy |
| Badge text readable by screen readers | 1.3.1 | ✅ Text visible, not icon-only |
| Importance badge uses color + text (not color alone) | 1.4.1 | ✅ "Required" / "Preferred" text present |
| Notices (expiry/verification) have sufficient contrast | 1.4.3 | ✅ (check muted text: `#6B7280` on white = 4.6:1 — passes AA) |
| Section hidden correctly when empty | 1.3.1 | ✅ `*ngIf="length > 0"` — hidden from DOM and SR |
| No decorative-only icon without aria-hidden | 1.1.1 | Verify: any icons in section have `aria-hidden="true"` |

---

## Issues Found

| Severity | Issue | Recommendation |
|---|---|---|
| Medium | Remove button "×" may lack accessible label | Add `aria-label="Remove [name]"` or `aria-label="Remove certification requirement"` |
| Low | Focus not managed after row add/remove | Add `focusNewRow()` / `focusAddButton()` calls in component TS |
| Low | Error message may not be programmatically linked | Add `aria-describedby="error-name-{index}"` to name input |
| Low | Checkbox labels need `for`/`id` pairing confirmed | Audit in browser with screen reader |

---

## Screen Reader Experience (Expected)

**Adding a requirement (keyboard-only):**
1. User tabs to "+ Add certification or license" button
2. Presses Enter → new row added → (if focus management implemented) focus moves to new name field
3. Types credential name
4. Tabs through Type dropdown → Importance dropdown → Issuing authority → checkboxes
5. Tabs to next row or back to Add button

**Applicant reading requirements (screen reader):**
1. "Section: Certifications & Licenses"
2. "Heading: Required"
3. "List, 2 items"
4. "Item 1: PRC License. License. Licensing and Registration Division. Valid/unexpired document may be requested."
5. "Item 2: BOSH Certificate. Certification. DOLE-accredited training provider."
6. "Heading: Preferred"
7. ...

---

## Result: PASS with 4 low/medium items for next sprint ✅
