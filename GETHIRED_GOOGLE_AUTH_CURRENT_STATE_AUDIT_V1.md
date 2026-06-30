# GETHIRED_GOOGLE_AUTH_CURRENT_STATE_AUDIT_V1

## Pre-Implementation State

Before this command ran:
- No Google auth of any kind
- No GIS script tag in index.html
- No Firebase client SDK on FE (only Firebase Admin on BE)
- No `googleClientId` in any environment file
- No `typings.d.ts` for GIS types
- No role classification UI
- AI Job Create gate had only email-based CTAs

## Post-Implementation State

### New FE Files
- `src/typings.d.ts` — GIS type declarations
- `src/app/auth/services/google-auth.service.ts` — token exchange + session
- `src/app/auth/google-signin-button/google-signin-button.component.ts/html/scss`
- `src/app/auth/role-classification/role-classification.component.ts/html/scss`

### Modified FE Files
- `src/index.html` — GIS script tag added
- `src/environments/environment.ts` — googleClientId added
- `src/environments/environment.prod.ts` — googleClientId added
- `src/environments/environment.staging.ts` — googleClientId added
- `src/app/auth/auth.module.ts` — RoleClassificationComponent + APP_INITIALIZER; removed GoogleSigninButtonComponent declaration (moved to SharedModule)
- `src/app/auth/signin/signin.component.ts/html` — Google button + handlers
- `src/app/auth/signup/signup.component.ts/html` — Google button + handlers
- `src/app/shared/shared.module.ts` — GoogleSigninButtonComponent declared + exported
- `src/app/public/employer-portal/ai-job-preview-panel/ai-job-preview-panel.component.ts/html` — Google button in gate card

### New BE Files
- `controllers/googleAuthController.js` — firebase-session + choose-role
- `routes/googleAuthRoutes.js` — route definitions

### Modified BE Files
- `server.js` — googleAuthRoutes mounted at /api

## Authentication Stack After Implementation

```
FE: Google Identity Services (GIS) → googleIdToken
  → POST /api/auth/google/firebase-session
  → BE: Firebase REST signInWithIdp → firebaseIdToken
  → BE: firebaseAdmin.verifyIdToken() → verified
  → BE: DB lookup / insert
  → BE: buildSessionResponse()
  → FE: storeSession() → localStorage → navigate
```

No new npm packages added to either FE or BE.
