# GETHIRED EMPLOYER ACCESSIBILITY AUDIT V4

**Document:** 26 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference — gaps documented, critical gaps in backlog

---

## 1. Scope

This audit covers the employer panel frontend:

- Employer sidebar navigation
- Company dashboard (KPI cards, action center, pipeline, action items list)
- Job create / edit flow
- Applicant list and snapshot
- Message thread
- Company-not-setup dialog
- Employer public portal (landing page)

Audit method: code analysis of templates and component TypeScript. No automated axe/Lighthouse pass was run in this V4 pass.

---

## 2. Sidebar Navigation

**Component:** `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component`

### Gap: Divs Used Instead of Buttons or Anchor Tags

Sidebar nav items are rendered as `div` elements with `(click)` handlers (`changeRoute(route)`). They are not `<button>`, `<a>`, or `<nav>` elements.

**Impact:**
- Not keyboard-navigable by default (Tab key does not reach `div` elements unless `tabindex` is explicitly set)
- Screen readers cannot enumerate them as navigation items
- No implied role — assistive technology sees generic containers, not interactive controls

**WCAG criteria violated:** 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value)

### Gap: No role="navigation" on the Container

The sidebar container does not have `role="navigation"` or use the semantic `<nav>` element. Screen reader users cannot jump to the navigation landmark.

**WCAG criteria violated:** 1.3.6 (Identify Purpose), landmark structure

### Gap: No aria-label on Navigation Container

If `<nav>` or `role="navigation"` is added, it should include `aria-label="Employer navigation"` to distinguish it from other navigation regions on the page.

### Gap: No aria-current="page" on Active Item

The active sidebar item is determined by `subRouteActive(route)` and a CSS class is applied. No `aria-current="page"` attribute is set on the active item. Screen readers cannot announce which page is currently active.

**WCAG criteria violated:** 2.4.8 (Location)

### Recommended Safe Fix (Backlog B09)

Replace sidebar item `div` elements with `<button>` elements (or `<a routerLink>` if preferred). Add `tabindex="0"` at minimum as an interim fix. Add `role="navigation"` and `aria-label`. Add `[attr.aria-current]="subRouteActive(item.route) ? 'page' : null"`.

---

## 3. Dashboard

### Action Cards (buttons)

Dashboard action cards are implemented as `<button>` elements. This is correct.

**Status: PASS**

### KPI Cards (buttons)

KPI cards are implemented as `<button>` elements where clickable. This is correct.

**Status: PASS**

### Pipeline Widget

- `role="list"` on the pipeline container: PASS
- `role="listitem"` on each stage: PASS
- `aria-label` on each stage (stage name and count): PASS
- Visually-hidden screen-reader text for pipeline description: PASS

**Status: PASS**

### Dashboard Action Center Empty State

Empty-state copy is visible in-DOM. No specific ARIA annotation confirmed beyond normal text rendering.

**Status: PASS (acceptable)**

---

## 4. Applicant List and Snapshot

### Match Signals Disclaimer

- `role="note"` on the disclaimer element: PASS
- Prevents false disclaimer display when no signals available via `hasAnyMatchSignal()`: PASS

### Snapshot Card

- `role="region"` with `aria-label="Application snapshot summary"`: PASS
- Loading state: `aria-live="polite"` `aria-atomic="true"`: PASS (screen reader will announce when snapshot loads)

**Status: PASS**

---

## 5. Company-Not-Setup Dialog

### Button Present

The dialog contains a "Setup Company" button. The button element itself is correct.

**Status: Button PASS**

### Navigation Was Broken (Fixed in V4)

Before the V4 fix, `redirectToSetup()` closed the dialog but did not navigate. The button was present but non-functional. This is an accessibility issue because the user receives no feedback and is left on the same page with the dialog gone.

**Fix applied in V4:** `redirectToSetup()` now navigates to `/recruiter/company/details`.

**Status: FIXED in V4**

### Focus Management After Dialog Close

After `dialogRef.close()` is called, Angular Material's dialog should return focus to the element that triggered the dialog open. This is the default Angular Material dialog behavior.

Confirmed working: not explicitly overridden in `company-not-setup.component.ts`.

**Status: Assumed PASS (relying on Angular Material defaults); not manually verified**

---

## 6. Job Create Form

### Step Navigation

Step items use `(click)` handlers. Keyboard accessibility of the custom stepper component has not been verified in this pass.

**Status: Not verified — flag for B09 followup**

### Form Labels

Angular Reactive Forms with Material form fields typically render `<mat-label>` bound to `<mat-form-field>` which produces accessible `<label>` elements. Full verification of every field not completed in this pass.

**Status: Assumed PASS for Material form fields; custom fields unverified**

---

## 7. Skip Links

No skip-to-main-content skip link was found in the employer panel templates reviewed.

**WCAG criteria:** 2.4.1 (Bypass Blocks)  
**Status: GAP — not implemented**  
**Backlog:** Add to B09 or create new item B09a

---

## 8. Colour Contrast

Not verified via automated tooling in this pass. The V4 fix to `panelClass: ['danger-snackbar']` ensures publish-blocked errors are rendered in the correct error colour, improving contrast/semantic communication.

---

## 9. Focus Indicators

Focus ring visibility not verified in component SCSS in this pass. Angular Material components include default focus rings but custom divs used as interactive elements (sidebar) will not show focus rings by default.

**Status: Partial — gap exists for sidebar divs (covered by B09)**

---

## 10. Summary: Pass / Fail / Gap Table

| Area | Status | Notes |
|---|---|---|
| Sidebar: keyboard nav | FAIL | Divs, not buttons; not Tab-navigable |
| Sidebar: role="navigation" | FAIL | Missing landmark role |
| Sidebar: aria-label | FAIL | Missing on nav container |
| Sidebar: aria-current="page" | FAIL | Not set on active item |
| Dashboard: action cards | PASS | Correct button elements |
| Dashboard: KPI cards | PASS | Correct button elements |
| Dashboard: pipeline roles | PASS | role="list/listitem", aria-label on stages |
| Dashboard: visually-hidden text | PASS | Screen reader description present |
| Applicant snapshot: aria-live | PASS | polite + atomic on loading state |
| Applicant snapshot: role="region" | PASS | Correct region label |
| Match disclaimer: role="note" | PASS | Correct note role |
| Company-not-setup: button | PASS | Button element correct |
| Company-not-setup: navigate | FIXED | V4 fix applied |
| Focus after dialog close | ASSUMED PASS | Angular Material default |
| Skip link | GAP | Not implemented |
| Form labels (Material) | ASSUMED PASS | Standard Material pattern |
| prefers-reduced-motion | GAP | Not in main-animations.ts (B08) |
| Focus ring visibility | PARTIAL | Gap for sidebar divs |

---

## 11. Deferred

Full WCAG 2.2 AA rewrite of the sidebar is deferred to B09. The current sidebar passes visual design review but fails keyboard accessibility. It is not suitable for production under WCAG 2.1 AA standards.
