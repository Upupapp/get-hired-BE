# GETHIRED_GOOGLE_ONETAP_FEDCM_CONTINUE_AS_UX_V1

## One Tap Overview

Google One Tap is the modal prompt that appears in the corner of the browser showing "Continue as [Name]?" when a user has an active Google session. It is rendered by GIS automatically when `google.accounts.id.initialize()` is called.

## Implementation

One Tap is automatically enabled via GIS initialization in `GoogleSigninButtonComponent`:
```ts
google.accounts.id.initialize({
  client_id: window.__GH_GOOGLE_CLIENT_ID__,
  callback: this.handleCredential.bind(this),
});
```

When this runs (on any page with the Google button), GIS automatically shows the One Tap prompt if:
- User has an active Google session in the browser
- User has not previously dismissed it (Google tracks this)
- The page URL is in the allowed JavaScript origins for the OAuth client

The One Tap prompt fires the same `callback` as the regular button click. No separate handler needed.

## FedCM (Federated Credential Management)

FedCM is a browser-level API that Chrome uses as a privacy-preserving replacement for third-party cookies in OAuth flows. GIS automatically uses FedCM in supported browsers (Chrome 117+).

FedCM shows as a native browser dialog (not a popup), making it more trustworthy and harder to dismiss accidentally. The credential flow is identical — same callback receives the Google ID token.

## Dismissal Handling

```ts
onGoogleError(errorCode: string): void {
  if (errorCode === 'google_popup_closed' || errorCode === 'google_prompt_dismissed') return;
  this.googleError = '...';
}
```

One Tap dismissal emits `'google_prompt_dismissed'` — silently ignored. No error shown to the user.

## Pages Where One Tap Can Appear

One Tap fires on any page that mounts `GoogleSigninButtonComponent`:
- `/signin` — signs in existing user
- `/signup` — signs in or starts role classification
- Public pages with AI Job Create panel open (when panel has a gate card showing)

## One Tap NOT on Authenticated Pages

The GIS `initialize()` call only runs inside `GoogleSigninButtonComponent`, which is only rendered on auth/public pages. Authenticated employer/applicant pages don't mount this component.

## Auto-Select

`autoSelect: false` (default behavior) — One Tap does not auto-confirm without user gesture. This respects the user's conscious choice and avoids unexpected sign-ins.

## disableAutoSelect()

`GoogleAuthService.disableAutoSelect()` is available for future use to suppress One Tap after a sign-out, preventing the "Continue as [Name]?" prompt from immediately appearing after logout.
