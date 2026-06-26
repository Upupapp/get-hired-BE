# GETHIRED OPTIMIZE FIX LOG — RECENT_4

**Date:** 2026-06-26
**FE HEAD:** 8a41f25  |  **BE HEAD:** 35f7754

---

## FIX 01 — import-add-user: complete unsubscribe$ Subject in ngOnDestroy

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`
**Lines changed:** ngOnDestroy (lines 286-288 -> 286-290)
**Type:** Memory leak fix / correctness
**Risk:** None — completing a Subject has no side effects; it cannot trigger any subscriber because the Subject was never used with `takeUntil`.

**Before:**
```ts
ngOnDestroy(): void {
  if (this.req) { this.req.unsubscribe(); }
}
```

**After:**
```ts
ngOnDestroy(): void {
  if (this.req) { this.req.unsubscribe(); }
  this.unsubscribe$.next();
  this.unsubscribe$.complete();
}
```

**Rationale:** `unsubscribe$` was declared as `private unsubscribe$ = new Subject<void>()` but never nexted or completed. RxJS internals hold a list of observers against an open Subject; completing it signals finalization and allows GC. This also future-proofs the component — if a `takeUntil(this.unsubscribe$)` is added to a future Observable chain, the teardown will work correctly without touching `ngOnDestroy` again.

---

## FIX 02 — CoreModule: remove duplicate provider entries for root-scoped services

**File:** `src/app/core/core.module.ts`
**Lines changed:** providers array
**Type:** Correctness / singleton integrity
**Risk:** None — removing services from `providers` that are already `providedIn: 'root'` makes no functional change to injection (they continue to be injected from the root injector). If any component was accidentally getting the CoreModule-scoped copy instead of the root copy, it will now get the root copy — which is the intended singleton.

**Before:**
```ts
providers: [CoreService, SnackbarService, HapticService]
```

**After:**
```ts
// SnackbarService and HapticService are providedIn: 'root' — do not list
// them here or Angular creates a second injector-scoped instance that
// shadow-registers over the root singleton, breaking any component that
// injects the root instance (they get the CoreModule-scoped copy instead).
providers: [CoreService]
```

**Rationale:** When a service declares `providedIn: 'root'`, Angular registers it with the root injector. If it is ALSO listed in a module's `providers` array, Angular creates a SECOND instance scoped to that module's injector. Any component declared inside that module's compilation scope then receives the module-scoped instance, while all other components get the root instance. This means two separate `SnackbarService` / `HapticService` instances exist at runtime — wasting memory and potentially causing subtle bugs if any state were ever added to these services.

---

## FIX 03 — avatar.component.html: add width attribute to star.svg images

**File:** `src/app/applicant/profile-details/components/avatar/avatar.component.html`
**Lines changed:** 16-20
**Type:** CLS (Cumulative Layout Shift) fix
**Risk:** None — adding an HTML `width` attribute to `<img>` elements is a safe, additive change.

**Before:** `<img src="...star.svg" height="17px" class="me-1">` (5 images, no width)
**After:** `<img src="...star.svg" width="17" height="17" class="me-1">` (5 images, explicit dimensions)

**Rationale:** Without both `width` and `height`, the browser cannot compute the aspect ratio before the image loads, so it reserves zero width in the layout and shifts content when the SVG loads. `width` + `height` lets the browser pre-allocate the correct space. Note: unitless integer values (`17` not `17px`) are used per HTML spec for `width`/`height` attributes.

---

## FIX 04 — public-company-details.component.html: add width attribute to star.svg images

**File:** `src/app/companies/public-company-details/public-company-details.component.html`
**Lines changed:** 12-16
**Type:** CLS fix (same as Fix 03)
**Risk:** None

**Before:** `<img src="...star.svg" height="17px" class="me-1">` (5 images, no width)
**After:** `<img src="...star.svg" width="17" height="17" class="me-1">` (5 images, explicit dimensions)

---

## FIX 05 — public-list.component.ts: add isPlatformBrowser guard to onResize HostListener

**File:** `src/app/public/public-list/public-list.component.ts`
**Lines changed:** onResize method (lines 66-69)
**Type:** SSR safety fix
**Risk:** None — guard is a no-op in browser; prevents a potential `ReferenceError: window is not defined` in SSR.

**Before:**
```ts
@HostListener('window:resize', ['$event'])
onResize(event: any) {
  this.screenSize = window.innerWidth;
}
```

**After:**
```ts
@HostListener('window:resize', ['$event'])
onResize(_event: any) {
  // OPTIMIZE-R4: guard with isPlatformBrowser — HostListeners can fire
  // during SSR hydration on some Angular Universal versions and would throw
  // a ReferenceError because `window` is not defined on the server.
  if (isPlatformBrowser(this.platformId)) {
    this.screenSize = window.innerWidth;
  }
}
```

**Rationale:** `ngOnInit` already guarded `window.innerWidth` with `isPlatformBrowser`, but the resize handler was unguarded. Angular Universal SSR emulates DOM events during hydration on some configurations, and `window` is not available in the Node.js environment. Adding the guard makes `onResize` consistent with `ngOnInit`.

---

## Files NOT modified (confirmed clean)

- `src/app/core/services/snackbar.service.ts` — no leaks, correct
- `src/app/core/services/haptic.service.ts` — no leaks, correct
- `helpers/firebaseFunctions.js` (BE) — axios usage is one-shot, no interceptors
- `controllers/paymentController.js` (BE) — axios usage is one-shot, no interceptors
- `src/assets/brand/gethired-og-default.png` — 65 KB, well within crawler limits
- `src/app/views/home/pages/job-post-details-apply/.../applicant-avatar.component.html` — already has width+height
- `src/app/views/home/pages/company-details/.../company-banner.component.html` — already has width+height

## Changes NOT made (explicitly deferred)

- Migration of 38 legacy `this.snackBar.open()` calls to SnackbarService — safe but out of scope per task brief; recommend in a future NOTIFY cycle.
- Auth, payments, routing, MATCH logic — untouched per hard constraint.
