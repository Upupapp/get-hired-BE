# GetHired BRAND Implementation Log — RECENT_4
FE HEAD: 8a41f25 | Applied: 2026-06-26

## Changes applied by this audit

### FIX-1: HapticService injection in import-add-user dialog
File: `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

Added import:
```typescript
import { HapticService } from '@app-core/services/haptic.service';
```

Added to constructor:
```typescript
private hapticService: HapticService,
```

Added haptic calls at three outcome branches in the `companyState` subscription:
- All-success: `this.hapticService.success()` before `snackbarService.success()`
- Partial-fail: `this.hapticService.warning()` before `snackbarService.warning()`
- All-fail: `this.hapticService.error()` before `snackbarService.error()`

Rationale: HapticService was registered in CoreModule but never injected into
this dialog. Error and partial-failure outcomes had no haptic signal. Users on
supported mobile browsers (Chrome on Android) now receive:
- success: [50]ms light pulse
- warning: [50,30,50]ms double pulse
- error: [100,30,80]ms stronger pulse

### FIX-2: Result panel CSS (BEM block)
File: `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.scss`

Added the entire `.result-panel` BEM block at the end of the file.

Classes added:
- `.result-panel` — base: rounded corners, Manrope font
- `.result-panel__title` — bold 16px header
- `.result-panel__summary` — 14px body copy
- `.result-panel__failed-item` — row per failed email, hairline separator
- `.result-panel__email` — semibold email address
- `.result-panel__failed-list` — max-height 180px + overflow-y scroll (mobile scroll)
- `.result-panel__actions .btn` — min-height 44px (WCAG 2.5.5 touch target)
- `.result-panel--error` — red tinted background (#FFF0EE), dark-red left border
  (#C0392B), red title; shake animation on entry (reduced-motion guarded)
- `.result-panel--partial` — amber tinted background (#FFFBEB), amber left border
  (#B45309), amber title; no shake

Reduced-motion: shake keyframe only fires inside
`@media (prefers-reduced-motion: no-preference)`. The global contract in
`styles.scss` lines 39-45 also truncates to 0.01ms as belt-and-suspenders.

### NO-CHANGE: HapticService implementation
`src/app/core/services/haptic.service.ts` — verified correct, no changes needed.

### NO-CHANGE: Snackbar CSS
`src/styles.scss` — verified `.danger-snackbar` and `.error-snackbar` both have
`border-left: 4px solid $color-global-red` (#FE6F61). No changes needed.

### NO-CHANGE: OG image
`src/assets/brand/gethired-og-default.png` — 66,154 bytes, branded version confirmed.
No changes needed.

## Files modified
1. `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`
2. `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.scss`

## Files verified (read-only)
- `src/app/core/services/haptic.service.ts`
- `src/styles.scss` (lines 241-293, 36-45)
- `src/assets/brand/gethired-og-default.png`
- `src/app/core/core.module.ts`
- `tsconfig.json` (alias `@app-core`)
