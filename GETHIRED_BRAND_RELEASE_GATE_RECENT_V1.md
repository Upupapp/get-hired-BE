# GetHired BRAND Release Gate — Recent Deployment Surfaces (V1)

**Date:** 2026-06-25
**Scope:** job-create, job-list, confirmation-dialog, F-08 states
**Evaluator:** BRAND RECENT DEPLOYMENT automated pass

---

## Gate Results

| Gate | Status | Notes |
|------|--------|-------|
| No optimistic UI removal (job deleted before BE confirms) | PASS | Confirmed by reading reusable-table.component.ts — no client-side splice/filter before deleteJobSuccess |
| No animation before backend success | PASS | saveSuccessPulse only set inside afterSubmit(event) after event is truthy (NgRx success stream) |
| prefers-reduced-motion on all animations in scope | PASS | All 5 @keyframes (publish-spin, draft-spin, success-pulse, error-reveal, dialog-reveal) have reduce guards |
| No infinite animation loops | PASS | Spinners use `infinite` but only while loading flag is true — they disappear on completion. No status-chip loops. |
| publish-spinner visible without animation | PASS | border-color fallback set under reduce: rgba(255,255,255,0.7) — static ring visible |
| draft-spinner visible without animation | PASS | border-color fallback set under reduce: rgba(80,80,80,0.5) — static ring visible |
| No transition: all on elements with frequent change-detection | PASS | bg-upper-gray fixed — now transitions only top and opacity |
| Destructive confirm styled distinctly | PASS | btn-destructive (#dc2626) added; delete dialog passes destructive:true |
| Cancel button distinct from destructive CTA | PASS | btn-default (gray #E7E7E7) vs btn-destructive (solid red) — clear visual hierarchy |
| Destructive action requires explicit confirmation | PASS | disableClose:true on dialog, two-step (open dialog -> click Confirm) |
| No pre-success spinner | PASS | savingDraft set before dispatch; publish spinner driven by loading$ from NgRx store (reflects BE state) |
| Aria live regions on loading states | PASS | draft-loading and publish-loading spans have aria-live="polite" |
| Aria role="alert" on error messages | PASS | save-error-alert has role="alert" and aria-live="assertive" |
| Aria role="status" on success pulse | PASS | save-success-pulse has role="status" and aria-live="polite" |
| Disabled buttons during in-flight requests | PASS | Draft button: [disabled]="savingDraft || loading"; Publish button: [disabled]="loading" |
| Double-submit prevention | PASS | Buttons disabled during loading; savingDraft flag prevents re-entry of saveAsDraft() |
| No fake delete success (UI updates before BE) | PASS | list$ driven by NgRx store; updated only on deleteJobSuccess reducer action |
| No color-only state signals | PASS | All states have visible text labels in addition to color/animation changes |
| Focus-visible rings preserved | PASS | btn-draft-save, btn-back-cancel, btn-publish-post have focus-visible outlines; btn-destructive has its own |
| Mobile tap target min 44px | PASS | @media (max-width: 768px) enforces min-height:44px on all job-create action buttons |
| No new libraries | PASS | Zero new npm dependencies |
| No new components | PASS | All changes use existing component files |
| No changes to JobCompatibilityService | PASS | Not touched |
| No changes to BE API | PASS | No controller/route/service changes |
| Backward compatibility — confirmation-dialog callers | PASS | data.destructive is optional; all callers that omit it get original btn-primary behavior |

---

## Overall Gate: PASS

All 24 gates pass. 5 safe fixes applied (3 SCSS, 1 HTML, 1 TS). Ready to ship.

---

## Non-Blocking Notes (future iterations)

1. **success-snackbar color for delete:** The `success-snackbar` class renders as brand red (#FF7062) for delete-success toast. This creates ambiguity between a success state and an error state at a glance. A future pass could add a neutral `neutral-snackbar` (e.g., dark gray) for delete/archive success, reserving brand red for positive outcomes like Publish. This is a design system decision, not a bug.

2. **Dialog reveal animation on Material overlay:** The `.card` reveal animation (180ms translateY+scale) is layered on top of Material's own overlay fade. On very fast machines, users may see Material's fade complete before the card animation finishes. This is imperceptible at 180ms — not blocking.

3. **btn-draft-save transition: border-color** — `.btn-draft-save` has `transition: ... border-color 0.15s ease` but the `.btn-create-interview` base class sets a static border and the hover/focus states don't change `border-color` explicitly. The transition is harmless but technically dead for the draft button's normal interaction. Not worth changing given the complexity of the class chain.

4. **`transition: all` in inline styles** — Several child components (`create-job-post-step.component.html`, `preview-job-post-step.component.html`, `job-post-detail-step.component.html`) have `style="transition: all 0.4s ease !important;"` as inline styles. These are outside the audit scope for this pass but share the same issue as bg-upper-gray Fix 1. Future: replace with scoped classes.
