# GETHIRED BRAND — COMPONENT CHOREOGRAPHY (RECENT 3)
**Date:** 2026-06-26

---

## 1. Job Detail Page — Animation Choreography

### State: Loading → Content Arrival

```
t=0ms    User navigates to /jobs/details/:id
         → <app-inline-loading> appears (GIF)
         → loading$ = true
         
t=0 → API response
         
t=API+0ms  loading$ = false, details$ = job
           <app-inline-loading> removed
           
t=API+0ms  <section class="gh-job-content-reveal"> appears
           Animation: gh-job-detail-reveal 220ms ease-decelerate
           (opacity 0→1, translateY 12px→0)
           
t=API+0ms  <nav class="gh-breadcrumb-nav"> (child of gh-job-content-reveal)
           Animation: gh-job-detail-reveal 180ms ease-decelerate
           Breadcrumb resolves 40ms BEFORE main section completes.
           Effect: nav leads, content follows. Correct visual hierarchy.
           
t=API+220ms Content fully visible.
```

### State: Error Arrival

```
t=0ms    User navigates to /jobs/details/invalid-id
         → <app-inline-loading> appears
         
t=API error
         loading$ = false, jobError$ = "..."
         
t=error+0ms .job-detail-error-state appears
           Animation: gh-error-banner-reveal 160ms ease-standard
           (opacity 0→1, translateY -8px→0 — slides from above)
           
t=error+160ms Error state fully visible. Screen reader announces role="alert".
```

### State: Already Applied

```
t=API+0ms  details.isApplied = true
           .bg-applied chip appears
           Animation: gh-applied-chip-reveal 160ms ease-standard
           (opacity 0→1, scale 0.9→1 — "pops in")
           
t=API+160ms Applied chip fully visible.
```

---

## 2. Choreography Rules

| Rule | Applied? |
|---|---|
| Content arrives with decelerate easing (ease into view) | YES |
| Errors arrive with standard easing (state-change feel) | YES |
| Breadcrumb leads before body content | YES — 180ms vs 220ms |
| No competing animations at same timestamp | YES — loading disappears before content reveals |
| Parent opacity-0 prevents child flash during parent animation | YES — `fill: both` on `gh-job-content-reveal` |

---

## 3. `@animate` Directive Coordination

The legacy `[@animate]` directives in the template (lines 27, 44, 220 in `job-posts-details.component.html`) use Angular's `mainAnimations` BrowserAnimationsModule. These:
- Fire within the `*ngIf="details$"` block — only execute after the parent `gh-job-content-reveal` starts.
- Use `delay` parameters (`300ms`, `400ms`, `150ms * i`) — the banner headline and card body arrive slightly after the breadcrumb/section outer wrapper. This extends the natural stagger.
- Not inspected in detail for `prefers-reduced-motion` compliance. Pre-existing.

---

## 4. Dialog / Sheet Choreography

Mobile (≤767px): `mat-dialog-container` slides up from bottom via `gh-sheet-reveal` (220ms, decelerate).
Desktop: Standard MatDialog center-fade (Angular Material default).
Consistent with the "content arriving" pattern — decelerate easing signals the dialog is delivering content to the user.
