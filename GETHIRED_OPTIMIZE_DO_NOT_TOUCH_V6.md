# GETHIRED OPTIMIZE DO-NOT-TOUCH V6
**Date:** 2026-07-01 | These items must not be changed without a dedicated, careful session.

---

## Authentication Flow Files

### `linkedin-auth.service.ts`
**Reason:** Core LinkedIn OAuth state machine. `storeSession()` writes to localStorage with role-based routing. Any change risks breaking sign-in for all LinkedIn users. The `_pendingToken` in-memory state bridges the ticket exchange to the role-classification page — clearing it at the wrong time breaks new-user onboarding.

### `auth.module.ts`
**Reason:** Route registration for all auth pages including `linkedin/complete`. Changing route paths would break the LinkedIn OIDC redirect URI configured in the LinkedIn Developer App (which must exactly match `/linkedin/complete`).

### `app.routing.module.ts`
**Reason:** Angular 13 root routing has a documented quirk with empty-path routes and PublicModule ordering. See embedded comments in the file. Do not reorder routes without dedicated testing.

---

## Modal Opening Logic

### Wherever `EmployerCompanySetupSuccessModalComponent` is opened (employer-settings or company setup component)
**Reason:** The `MatDialogRef` + `MAT_DIALOG_DATA` injection pattern must stay intact. The modal close values ('post_job', 'complete_profile', 'view_profile', 'dashboard') are likely handled by the opener component's `afterClosed()` subscription. Changing close values breaks the caller.

---

## Global Style Files

### `styles.scss` — BL-010 bottom-sheet section (lines 540–591)
**Reason:** Universal dialog bottom-sheet behavior for ALL modals on mobile. Changing the `max-height`, `border-radius`, or `align-items` affects every MatDialog in the app.

### `styles.scss` — Global prefers-reduced-motion block (lines 42–48)
**Reason:** The `* { animation-duration: 0.01ms !important }` is the global safety net for all animation/transition. Removing or scoping it differently would silently re-enable animations for users with motion sensitivity everywhere.

---

## robots.txt

### Existing Disallow entries
**Reason:** Removing any of the existing `/admin/`, `/recruiter/`, `/user/`, etc. entries would expose private routes to search indexing.

### Sitemap declaration
**Reason:** `Sitemap: https://gethiredonline.app/sitemap.xml` — if removed, Google Search Console loses the sitemap hint.

---

## index.html

### Google Analytics gtag
**Reason:** Removing or modifying the GA4 snippet breaks analytics tracking for the entire product.

### GIS script tag
**Reason:** `<script src="https://accounts.google.com/gsi/client" async defer>` is required for Google One Tap. Removing it breaks Google sign-in globally.

### Organization JSON-LD
**Reason:** Static brand entity registered with Google. Changing the URL or name causes re-verification with Search Console.
