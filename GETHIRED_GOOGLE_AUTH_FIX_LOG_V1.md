# GETHIRED_GOOGLE_AUTH_FIX_LOG_V1

## Issues Found and Fixed During Implementation

### Fix 1: No Firebase Client SDK on FE
**Problem:** FE `package.json` has no Firebase client SDK (`firebase` package is BE-only). Could not use `signInWithPopup` from Firebase on FE.
**Fix:** Used Google Identity Services (GIS) directly. GIS provides the Google ID token via a callback, which is then sent to BE. BE exchanges it with Firebase REST API (`signInWithIdp`), producing a Firebase ID token that existing `verifyIdToken` middleware can consume.
**Impact:** Zero new FE npm dependencies. GIS loaded via `<script>` tag.

### Fix 2: Google OAuth Client ID Not in Codebase
**Problem:** Client ID was not stored in any config file.
**Resolution:** Found in `mobile/app/google-services.json` as `client_type: 3` (web client) entry: `818317489154-laldaic42nbnj3rra0o87bsa3buuo78g.apps.googleusercontent.com`
**Fix:** Added to all 3 environment files as `googleClientId` field.

### Fix 3: Missing `environment.staging.ts` Entry
**Problem:** Build with `--configuration=staging` failed: `TS2339: Property 'googleClientId' does not exist`.
**Fix:** Added `googleClientId` to `environment.staging.ts` alongside the dev and prod files.

### Fix 4: GoogleSigninButtonComponent in Wrong Module
**Problem:** `AiJobPreviewPanelComponent` is in `PublicModule`. `GoogleSigninButtonComponent` was declared in `AuthModule`. `PublicModule` doesn't import `AuthModule` (would cause routing conflicts). Build would fail with unknown component selector.
**Fix:** Moved `GoogleSigninButtonComponent` declaration from `AuthModule` to `SharedModule`. SharedModule is imported by both `AuthModule` and `PublicModule`. Component is now universally available.

### Fix 5: Node 14 Constraint (No Optional Chaining)
**Problem:** Needed to access nested object properties safely without `?.` or `??` (Node 14 doesn't support them natively in non-transpiled server-side JS).
**Fix:** All property access uses `&&` chains:
```js
// Instead of: err?.error?.message
// Use:
const body = err && err.error;
const msg = (body && body.message) || 'fallback message';
```
All BE controller code follows this pattern.
