# GETHIRED_GOOGLE_AUTH_PLACEMENT_MAP_V1

## Where Google Auth Appears

### 1. Sign-In Page (/signin)
**File:** `src/app/auth/signin/signin.component.html`
**Position:** After email+password submit button, before "Don't have an account?" link
**Button label:** `signin_with` (renders "Sign in with Google")
**Handler:** `onGoogleCredential(googleIdToken)` → `onGoogleError(errorCode)`

### 2. Sign-Up Page (/signup)
**File:** `src/app/auth/signup/signup.component.html`
**Position:** After email+password submit button, before "Already have an account?" link
**Button label:** `signup_with` (renders "Sign up with Google")
**Handler:** `onGoogleCredential(googleIdToken)` → `onGoogleError(errorCode)`

### 3. AI Job Create Panel Gate (public employer landing)
**File:** `src/app/public/employer-portal/ai-job-preview-panel/ai-job-preview-panel.component.html`
**Position:** Gate card CTA section — first/primary option, above "Create account with email" button
**Button label:** `continue_with` (renders "Continue with Google")
**Handler:** `onGoogleCredential(googleIdToken)` → `onGoogleError(errorCode)`

---

## Divider Pattern

All three locations use:
```html
<div class="gh-auth-divider" aria-hidden="true">
  <span class="gh-auth-divider-line"></span>
  <span class="gh-auth-divider-text">or</span>
  <span class="gh-auth-divider-line"></span>
</div>
```

Styles in `styles.scss` (global). Divider is `aria-hidden` — not interactive, decorative separator.

---

## One Tap / FedCM Placement

**Note:** One Tap prompt is initiated via `GoogleAuthService.showOneTapPrompt()`. In this implementation, the `GoogleSigninButtonComponent` uses `google.accounts.id.initialize()` which also enables One Tap for the page when called. One Tap will appear on pages where the component is mounted, if the user has an active Google session and hasn't dismissed it.

**Eligible pages:**
- /signin
- /signup
- Any page with an AI Job Create panel open

One Tap is NOT shown on:
- /admin (admin users don't use Google auth)
- Authenticated employer/applicant pages (already logged in)

---

## GIS Script Tag

Added to `src/index.html`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

Loaded once globally. Component polls `window.google` until available.

---

## Component Declaration

`GoogleSigninButtonComponent` is declared in **SharedModule** (not AuthModule) so it is available to:
- `AuthModule` (via SharedModule import)
- `PublicModule` (via SharedModule import)
- Any other module that imports SharedModule

Selector: `<app-google-signin-button>`
