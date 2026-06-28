# GETHIRED ACCESSIBILITY AUDIT — RECENT DEPLOYMENT V1
**Scope:** B04, B05, B09, B13  
**Date:** 2026-06-25  
**Standard:** WCAG 2.1 AA

---

## B13 — JobReadinessBarComponent

| Criterion | Status | Evidence |
|---|---|---|
| Progress bar role | PASS | `role="progressbar"` on `.jrb-bar-track` |
| aria-valuemin/max/now | PASS | All three present as dynamic bindings |
| aria-label on bar | PASS | `"Job readiness {N} percent"` |
| Level chip label | PASS | `aria-label="Job readiness: {levelLabel}"` |
| Icons hidden | PASS | All icons have `aria-hidden="true"` |
| Skeleton accessible | PASS | `aria-busy="true"` + `aria-label="Computing job readiness"` on skeleton wrapper |
| Not color-only | PASS | Icon + text inside every level chip |
| Focus ring | PASS | No interactive elements in bar component |
| Reduced-motion | PASS | `@include motion-safe` on fill transition; `@include ambient-motion-safe` on shimmer and glow |

**Result: PASS**

---

## B13 — JobReadinessChipsComponent

| Criterion | Status | Evidence |
|---|---|---|
| Blocking chips keyboard | PASS | `<button type="button">` — natively keyboard accessible (Tab/Enter/Space) |
| Recommended chips keyboard | PASS | Same |
| Complete chips — not interactive | PASS | `<div role="listitem">` — not focusable, appropriate for read-only state |
| Optional chips — not interactive | PASS | Same |
| aria-label on blocking chips | PASS | `"{label} — required to publish. Click to go to this section."` |
| aria-label on recommended chips | PASS | `"{label} — recommended. Click to go to this section."` |
| aria-label on complete chips | PASS | `"{label} — complete"` |
| Role="list" on rows | PASS | `role="list"` on `.jrc-chips-row` |
| Role="listitem" on chips | PASS | All chips have `role="listitem"` |
| Not color-only | PASS | Icon + text + group label on every chip group |
| Focus ring | PASS | `&:focus-visible { outline: 2px solid currentColor; outline-offset: 2px }` |
| All-complete state | PASS | `role="status" aria-live="polite"` |
| Icons hidden | PASS | All decorative icons have `aria-hidden="true"` |
| Reduced-motion | PASS | `@include ambient-motion-safe` on enter animation and nudge |

**Result: PASS**

---

## B09 — EmployerCompanyComponent (subtabs)

| Criterion | Before fix | After fix | Evidence |
|---|---|---|---|
| role="tablist" | PASS | PASS | Present on `<nav>` |
| role="tab" | PASS | PASS | Present on each button |
| aria-selected | PASS | PASS | Dynamic binding `[attr.aria-selected]` |
| aria-controls | FAIL | PASS | Added `[attr.aria-controls]="'cp-tabpanel-' + tab.id"` |
| Tab id | FAIL | PASS | Added `[id]="'cp-tab-' + tab.id"` |
| role="tabpanel" | PASS | PASS | Present on each panel div |
| aria-labelledby on panel | FAIL | PASS | Added `aria-labelledby="cp-tab-N"` on each panel |
| Panel id | FAIL | PASS | Added `id="cp-tabpanel-N"` on each panel |
| Focus ring on tabs | PASS | PASS | `:focus-visible { outline: 2px solid $cp-tab-active }` |
| Keyboard nav (arrow keys) | DEFERRED | DEFERRED | Click-only; arrow-key nav is best practice for tablist but deferred as behavioral change |

**Result: PASS (after FIX-04). Arrow-key nav deferred.**

---

## B05 — EmployerJobDashboardComponent

| Criterion | Status | Evidence |
|---|---|---|
| Action cards keyboard | PASS | All five cards are `<button type="button">` |
| Action card aria-label | PASS | Each button has descriptive `aria-label` |
| Error state announcement | PASS | `role="alert"` on error state div |
| Loading state announcement | PASS | `aria-busy="true"` + `aria-label="Loading job details"` on skeleton |
| Success banner | PASS | `role="status" aria-live="polite"` |
| Optional improvements | PASS | `role="status" aria-live="polite"` |
| Edit button in improvements chip | PASS | `<button type="button">` with `aria-label="Edit your job post to add optional improvements"` |
| Improvements count | PASS | `[attr.aria-label]="count + ' optional improvements'"` on count badge |
| Status chip | PASS | `[attr.aria-label]="'Job status: ' + getStatusLabel(job)"` |
| Icons | PASS | All emoji icons wrapped in `aria-hidden="true"` spans |
| Not color-only on status | PASS | Text + color on status chip |

**Result: PASS**

---

## B04 — Create Interview (optional badge + empty state)

| Criterion | Status | Evidence |
|---|---|---|
| Optional badge readable | PASS | `<span class="interview-optional-badge">Optional for publishing</span>` — plain text, screen-reader readable |
| Empty state | PASS | `<p class="interview-empty-title">No interview questions added yet.</p>` — plain paragraph |
| Empty state subtitle | PASS | `<p>You can publish now and add questions later.</p>` |
| Empty state image | PASS | `alt="No questions yet"` on image |
| Interview list | PASS | Questions listed as structural sections with text labels |

**Result: PASS**

---

## Summary

| Feature | Overall |
|---|---|
| B13 — Readiness Bar | PASS |
| B13 — Readiness Chips | PASS |
| B09 — Company Subtabs | PASS (after FIX-04) |
| B05 — Job Dashboard | PASS |
| B04 — Interview optional | PASS |

**Known deferred item:** B09 subtab arrow-key keyboard navigation (WAI-ARIA tabs pattern recommends left/right arrows to move between tabs). This is an employer-facing internal UI with only 3 tabs, accessible by Tab key. Deferred as a behavioral change requiring new HostListener logic.
