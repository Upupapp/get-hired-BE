# GETHIRED_GOOGLE_AUTH_ANALYTICS_LOG_V1

## Current State

No analytics events are fired for Google auth actions in this implementation. Analytics were out of scope for the first implementation pass.

## Recommended Events (Backlog)

| Event | Where to fire | Properties |
|---|---|---|
| `google_signin_initiated` | After GIS credential callback received | `{ source: 'signin' \| 'signup' \| 'ai_panel' }` |
| `google_signin_success` | After `storeSession()` | `{ role, isNewUser: false }` |
| `google_signup_role_classification` | When navigating to /auth/choose-role | `{ pendingIntents: ['employer_draft', 'job_apply'] }` |
| `google_signup_role_selected` | After role selected in classification | `{ selectedRole, isRecommended }` |
| `google_signup_success` | After `chooseRole` + `storeSession()` | `{ role, isNewUser: true }` |
| `google_signin_error` | On error (not dismissed) | `{ errorCode, source }` |
| `google_onetap_shown` | When One Tap prompt appears | — |
| `google_onetap_dismissed` | When One Tap dismissed | — |

## Implementation Guide

Use the existing analytics pattern in the codebase (check `AnalyticsService` or equivalent). Events should be fired from:
- `GoogleAuthService.storeSession()` — for success events
- `GoogleAuthService.exchangeGoogleToken()` subscribe — for error events
- `GoogleSigninButtonComponent.handleCredential()` — for initiation event
- `RoleClassificationComponent.submit()` — for role selection events

## Funnel to Track

```
Google Button Click
  → google_signin_initiated
  → [existing user] → google_signin_success
  → [new user] → google_signup_role_classification
                → google_signup_role_selected
                → google_signup_success
  → [error] → google_signin_error
```
