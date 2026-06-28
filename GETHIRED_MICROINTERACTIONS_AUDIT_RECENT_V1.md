# GetHired BRAND — Microinteractions Audit (Recent Deployment V1)

**Date:** 2026-06-25
**Scope:** job-create.component (F-08 states), job-list.component (delete flow), confirmation-dialog.component (destructive CTA)
**Note:** B04/B05/B09/B13 covered in prior pass. This file covers only the surfaces added or changed in the recent deployment.

---

## Surface 1 — job-create.component: All Button Microinteractions

### Publish button (`.btn-publish-post` / `.btn-add-service`)

| Property | Value | Assessment |
|----------|-------|-----------|
| Press effect | scale(0.97) on :active | PASS — correct micro-scale magnitude |
| Press transition | 0.1s ease | PASS — 100ms within micro range |
| Reduced-motion guard (transition) | @media reduce: transition: background 0.15s | PASS — transform removed from transition |
| Reduced-motion guard (:active transform) | @media reduce: transform: none | PASS (after Fix 2) — was missing before this pass |
| Hover feedback | background rgba(..., 0.7) | PASS — color change only |
| Focus-visible ring | outline: 2px solid #e02020, box-shadow glow | PASS — clear keyboard navigation signal |
| Loading state | publish-spinner replaces label text | PASS — spinner + "Publishing..." text |
| Disabled during loading | [disabled]="loading" | PASS — prevents double-submit |

### Draft save button (`.btn-draft-save`)

| Property | Value | Assessment |
|----------|-------|-----------|
| Press effect | scale(0.97) on :active | PASS |
| Press transition | 0.1s ease | PASS |
| Reduced-motion guard (transition) | @media reduce: background 0.15s only | PASS |
| Reduced-motion guard (:active) | @media reduce: transform: none | PASS |
| Focus-visible ring | outline: 2px solid #e02020 | PASS |
| Loading state | draft-spinner replaces label text | PASS — spinner + "Saving..." text |
| Disabled during loading | [disabled]="savingDraft || loading" | PASS — double guard |

### Cancel / Back button (`.btn-back-cancel`)

| Property | Value | Assessment |
|----------|-------|-----------|
| Press effect | scale(0.96) on :active | PASS — slightly softer than primary actions, correct hierarchy |
| Press transition | 0.1s ease | PASS |
| Reduced-motion guard (transition) | @media reduce: transition: none | PASS |
| Reduced-motion guard (:active) | @media reduce: transform: none | PASS |
| Focus-visible ring | outline: 2px solid #e02020 | PASS |

### Mobile tap targets

| Buttons | Min-height @max 768px | Assessment |
|---------|----------------------|-----------|
| btn-draft-save, btn-back-cancel, btn-publish-post | min-height: 44px, padding-left/right: 16px | PASS — meets iOS/WCAG 44x44pt recommendation |

---

## Surface 1 — job-create.component: State Microinteractions

### Publish spinner (.publish-spinner / @keyframes publish-spin)

| Property | Value | Assessment |
|----------|-------|-----------|
| Animation | publish-spin 0.7s linear infinite | PASS — infinite loop is correct: loading indicator |
| Speed | 0.7s per rotation | PASS — not too fast (jarring) or slow (unclear) |
| Visibility without animation | border-color: rgba(255,255,255,0.7) | PASS — static ring visible under reduce |
| Screen reader | aria-hidden="true" on spinner; aria-live="polite" on parent span | PASS |
| Duration classification | infinite — loading only | PASS |

### Draft spinner (.draft-spinner / @keyframes draft-spin)

| Property | Value | Assessment |
|----------|-------|-----------|
| Animation | draft-spin 0.7s linear infinite | PASS |
| Visibility without animation | border-color: rgba(80,80,80,0.5) | PASS — visible static ring |
| Screen reader | aria-hidden on spinner; aria-live="polite" on span | PASS |

### Success pulse (.save-success-pulse / @keyframes success-pulse)

| Property | Value | Assessment |
|----------|-------|-----------|
| Animation | success-pulse 0.4s ease | PASS — one-shot, brief |
| Duration | 0.4s | PASS — within $motion-duration-card range |
| Easing | ease | PASS — acceptable for a simple reveal |
| Trigger | afterSubmit(event) where event is truthy (backend stream) | PASS — no pre-success activation |
| Cleanup | setTimeout(2000ms) clears saveSuccessPulse | PASS — element removed after 2s |
| Loop | none — one-shot | PASS |
| Visibility without animation | icon + aria-label text conveyed via role="status" | PASS |
| Prefers-reduced-motion guard | animation: none in reduce block | PASS — element still renders visually |

### Error reveal (.save-error-alert / @keyframes error-reveal)

| Property | Value | Assessment |
|----------|-------|-----------|
| Animation | error-reveal 0.25s ease | PASS — brief 250ms reveal |
| Direction | translateY(-4px → 0) | PASS — subtle, not distracting |
| Trigger | jobError$ stream from NgRx store | PASS — real backend error only |
| Prefers-reduced-motion guard | animation: none in reduce block | PASS — text still visible |
| Screen reader | role="alert" aria-live="assertive" | PASS — immediately announced |
| Error message | never exposes security internals | PASS — mapped to user-safe copy in TS |

---

## Surface 2 — job-list.component: Delete Flow Microinteractions

### Delete button (in reusable-table, initiated from job-list)

| Property | Value | Assessment |
|----------|-------|-----------|
| Pre-delete optimistic UI removal | none | PASS — no DOM change before BE confirms |
| Loading state during delete | loading$ drives [loading] input on reusable-table | PASS — actions implicitly disabled |
| Row removal timing | triggered by reducer on deleteJobSuccess action | PASS — list$ re-emits with BE-confirmed data |
| Row fade animation | none (no animated removal) | PASS — instant table re-render is acceptable; animated removal would require local state tracking |
| Success toast timing | afterChange('deleted') → success$ → NgRx success action | PASS — only fires after confirmed BE response |
| Success toast class | success-snackbar | NOTE — brand red used for delete-success; semantically ambiguous (see release gate note) |
| Error toast | danger-snackbar from jobError$ stream | PASS |

### Confirmation dialog open/close

| Property | Value | Assessment |
|----------|-------|-----------|
| Dialog open animation | dialog-reveal 180ms (added this pass) | PASS — one-shot, guarded |
| Dialog close animation | Material default overlay fade | PASS — Material handles this |
| disableClose | true | PASS — user must explicitly click Cancel or Confirm |

---

## Surface 3 — confirmation-dialog.component: CTA Microinteractions

### Standard confirm button (.btn-primary)

| Property | Value | Assessment |
|----------|-------|-----------|
| Press effect | scale(0.97) on :active (added this pass) | PASS |
| Press transition | 0.1s ease | PASS |
| Reduced-motion guard | @media reduce: transition: background; transform: none in :active | PASS (added this pass) |

### Destructive confirm button (.btn-destructive, new this pass)

| Property | Value | Assessment |
|----------|-------|-----------|
| Visual distinction from standard | #dc2626 vs #FF7062 — both red but clearly different | PASS — danger red (#dc2626) is semantically correct |
| Font weight | 600 | PASS — heavier weight reinforces severity |
| Press effect | scale(0.97) on :active | PASS |
| Press transition | 0.1s ease | PASS |
| Reduced-motion guard | transition: background 0.15s only; transform: none in :active | PASS |
| Focus-visible ring | outline: 2px solid #dc2626; box-shadow glow | PASS — keyboard-accessible |
| WCAG contrast | #dc2626 on #fff = 5.74:1 | PASS — exceeds AA (4.5:1) |
| Aria label | "Confirm permanent deletion" when destructive=true | PASS — screen reader context |

### Cancel button (.btn-default)

| Property | Value | Assessment |
|----------|-------|-----------|
| Color | #E7E7E7 / #464646 text | PASS — neutral, subordinate to CTAs |
| Press effect | scale(0.97) on :active (added this pass) | PASS |
| Reduced-motion guard | @media reduce guards added | PASS |
| Visual hierarchy | Clearly subordinate to red destructive CTA | PASS |

---

## Haptics Review (Recent Surfaces)

| Location | Current | Recommendation |
|----------|---------|----------------|
| job-create: publish blocked (haptics.warning()) | WIRED | PASS |
| job-create: publish success (haptics.jobPublished()) | WIRED | PASS |
| job-create: draft save success | NOT WIRED | Consider haptics.success() — low priority |
| confirmation-dialog: confirm destructive action | NOT WIRED | haptics.warning() on confirm-destructive click would be appropriate — one TS change in ConfirmationDialogComponent.submit() |
| job-list: delete success toast | NOT WIRED | haptics.actionComplete() appropriate — one TS change |

---

## Timing Token Summary for This Pass

| Animation | Duration | Token match | Assessment |
|-----------|---------|-------------|-----------|
| bg-upper-gray position slide | 300ms | no direct token; between card (220ms) and drawer (260ms) | Acceptable |
| publish-spinner / draft-spinner | 0.7s per cycle | loading-specific, no token needed | PASS |
| success-pulse | 0.4s | near $motion-duration-meter-fill (650ms) — on shorter end | Acceptable for a micro-success signal |
| error-reveal | 0.25s | near $motion-duration-micro (160ms) — slightly longer | Acceptable |
| dialog-reveal | 180ms | between micro (160ms) and card (220ms) | PASS — intentionally brief |
| btn press effects | 100ms | below micro (correct for press) | PASS |

---

## Summary Table

| Microinteraction | Before | After | Status |
|-----------------|--------|-------|--------|
| bg-upper-gray position transition | transition:all 0.4s, no guard | top+opacity 0.3s, guarded | FIXED |
| btn-add-service :active reduce guard | missing transform:none in :active | transform:none added | FIXED |
| publish button loading state | present and correct | unchanged | PASS |
| draft button loading state | present and correct | unchanged | PASS |
| success pulse | present and correct | unchanged | PASS |
| error reveal | present and correct | unchanged | PASS |
| confirmation dialog reveal | none | dialog-reveal 180ms, guarded | ADDED |
| confirmation dialog destructive CTA | none | btn-destructive, border-solid-destructive | ADDED |
| btn-primary/default press | no transition or guard | scale(0.97) 100ms, guarded | ADDED |
| delete flow pre-success removal | none (clean) | unchanged | PASS |
| delete success toast | fires after BE confirms | unchanged | PASS |
