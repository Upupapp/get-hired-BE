# GetHired BRAND — Implementation Log (Recent Deployment V1)

**Session:** 2026-06-25
**Scope:** job-create, job-list, confirmation-dialog, F-08 states
**Prior pass:** B04/B05/B09/B13 (GETHIRED_BRAND_IMPLEMENTATION_LOG.md)

---

## Change 1 — job-create.component.scss: bg-upper-gray transition

**File:** `src/app/job/job-create/job-create.component.scss`
**Type:** Dead-transition fix + prefers-reduced-motion guard
**Risk:** Low — SCSS only, no layout behavior change

**Before:**
```scss
.bg-upper-gray {
    background: #F4F5F9;
    z-index: 99 !important;
    padding: 20px 20px 10px 25px;
    min-height: 170px;
    transition: all 0.4s ease !important;
}
```

**After:**
```scss
.bg-upper-gray {
    background: #F4F5F9;
    z-index: 99 !important;
    padding: 20px 20px 10px 25px;
    min-height: 170px;
    transition: top 0.3s ease, opacity 0.3s ease;
    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}
```

**Why:** `transition: all` with `!important` on an element whose only dynamic properties are `top` and `position` (via [ngStyle]) causes the browser to evaluate transitions for every CSS property on every change-detection cycle. Using `transition: all` is always a red flag on components with frequent Angular change-detection. Added reduce guard which was missing entirely.

---

## Change 2 — job-create.component.scss: btn-add-service :active missing transform reset

**File:** `src/app/job/job-create/job-create.component.scss`
**Type:** prefers-reduced-motion completeness fix
**Risk:** Low — SCSS only

**Before:**
```scss
.btn-add-service {
  transition: transform 0.1s ease, background 0.15s ease;
  @media (prefers-reduced-motion: reduce) {
    transition: background 0.15s ease;
  }
  &:active {
    transform: scale(0.97);
    /* no reduced-motion guard here */
  }
}
```

**After:**
```scss
.btn-add-service {
  transition: transform 0.1s ease, background 0.15s ease;
  @media (prefers-reduced-motion: reduce) {
    transition: background 0.15s ease;
  }
  &:active {
    transform: scale(0.97);
    @media (prefers-reduced-motion: reduce) {
      transform: none;
    }
  }
}
```

**Why:** Removing `transition` under reduced-motion still allows the static `transform: scale(0.97)` to apply at click time (a snap transform with no easing). The guard must also reset `transform: none` inside `:active` to ensure zero visual transform for users who opted out.

---

## Change 3 — confirmation-dialog.component.scss: dialog reveal + destructive variant

**File:** `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.scss`
**Type:** UX safety improvement + animation addition
**Risk:** Low — SCSS only; all new rules are additive. Existing callers unaffected.

**Added:**
```scss
@keyframes dialog-reveal {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.card {
    @media (prefers-reduced-motion: no-preference) {
        animation: dialog-reveal 180ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
    }
}

.btn-destructive {
    padding: 6px 20px !important;
    min-width: 100px;
    background: #dc2626 !important;
    color: #fff !important;
    border: none;
    border-radius: 5px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    transition: transform 0.1s ease, background 0.15s ease;
    @media (prefers-reduced-motion: reduce) {
        transition: background 0.15s ease;
    }
    &:active {
        transform: scale(0.97);
        @media (prefers-reduced-motion: reduce) { transform: none; }
    }
    &:hover { background: #b91c1c !important; }
    &:focus-visible {
        outline: 2px solid #dc2626;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
    }
}

.border-solid-destructive {
    border-radius: 9px;
    border: solid 2px rgba(220, 38, 38, 0.4);
    padding: 25px 25px 20px 20px !important;
}
```

**Also updated:** `.btn-primary` and `.btn-default` to add micro-scale press with reduced-motion guards (previously neither had press transitions — abrupt snap).

**Why:** The delete dialog's "Continue" button was visually identical to any save/confirm dialog. Brand red (#FF7062) is used for positive actions throughout the app. A destructive permanent delete needs a distinct signal — #dc2626 (danger red) is semantically correct and WCAG-AA against white.

---

## Change 4 — confirmation-dialog.component.html: conditional destructive styling

**File:** `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html`
**Type:** Template change — conditional class binding
**Risk:** Low — no behavior change for existing callers (data.destructive defaults to falsy)

**Before:**
```html
<div class="border-solid">
  ...
  <button type="button" (click)="submit(1)"
  class="btn btn-primary px-2 me-2">
    {{ 'DELETE_WARNING.CONTINUE_BUTTON' | translate }}
  </button>
```

**After:**
```html
<div [ngClass]="data.destructive ? 'border-solid-destructive' : 'border-solid'">
  ...
  <img ... aria-hidden="true">
  ...
  <button type="button" (click)="submit(1)"
  [ngClass]="data.destructive ? 'btn btn-destructive px-2 me-2' : 'btn btn-primary px-2 me-2'"
  [attr.aria-label]="data.destructive ? 'Confirm permanent deletion' : null">
    {{ 'DELETE_WARNING.CONTINUE_BUTTON' | translate }}
  </button>
```

**Why:** Template-driven conditional keeps the component generic — any caller can opt into destructive styling by passing `data.destructive: true`. No change to ConfirmationDialogComponent TypeScript.

---

## Change 5 — job-list.component.ts: pass destructive:true to delete dialog

**File:** `src/app/job/job-list/job-list.component.ts`
**Type:** TypeScript — data object update
**Risk:** Low — additive data property; no logic change

**Before:**
```typescript
const ref = this.dialog.open(ConfirmationDialogComponent, {
  disableClose: true,
  data: {
    action: 'Delete job',
    message: 'This action cannot be undone.',
  },
});
```

**After:**
```typescript
const ref = this.dialog.open(ConfirmationDialogComponent, {
  disableClose: true,
  data: {
    action: 'Delete job',
    message: 'This action cannot be undone.',
    destructive: true,
  },
});
```

**Why:** Activates the destructive CTA variant for the permanent job delete confirmation. The dialog already showed the correct copy ("This action cannot be undone.") — now the button visually reinforces the severity.

---

## Changes NOT Applied (out of scope / deferred)

| Issue | Decision |
|-------|----------|
| `transition: all` in inline styles on child step components | Deferred — out of scope for this audit; 4 inline styles in child HTML templates. Future CSS-only fix possible. |
| `success-snackbar` is brand red (same as error color at a glance) | Design-system decision, not a code fix. Deferred. |
| `.btn-draft-save` border-color transition — transition property but value never changes | Harmless dead transition. Not worth refactoring given class chain complexity. |
| Haptics for confirmation-dialog dismiss/confirm | TS-scope. HapticFeedbackService available; `haptics.warning()` would be appropriate on confirm-destructive. Deferred. |

---

## Files Changed

| File | Change type |
|------|-------------|
| `src/app/job/job-create/job-create.component.scss` | Fix transition:all + fix :active reduce guard |
| `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.scss` | Add dialog-reveal + btn-destructive + border-solid-destructive + press guards on existing buttons |
| `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html` | Conditional [ngClass] for destructive variant + aria-label |
| `src/app/job/job-list/job-list.component.ts` | Pass destructive:true to delete dialog |
