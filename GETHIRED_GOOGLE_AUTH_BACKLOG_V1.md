# GETHIRED_GOOGLE_AUTH_BACKLOG_V1

## P1 — Admin Actions Required Before Live

| Item | Owner | Notes |
|---|---|---|
| Add production domain to Google OAuth authorized JS origins | Admin | Google Cloud Console → OAuth 2.0 client |
| Add `localhost:4200` to authorized JS origins (dev) | Admin | Needed for local testing |
| Verify Firebase Google provider enabled for `get-hired-363107` | Admin | Firebase Console → Authentication → Sign-in method |
| Add production domain to Firebase authorized domains | Admin | Firebase Console → Authentication → Settings |

## P2 — Near Term

| Item | Priority | Notes |
|---|---|---|
| Analytics: track Google auth events (sign-in, sign-up, role selection) | P2 | Via existing analytics service |
| Unit tests for googleAuthController.js | P2 | See TEST_LOG for test list |
| Unit tests for GoogleAuthService | P2 | See TEST_LOG for test list |
| Rate limiter: Redis-backed for multi-instance scaling | P2 | Current in-memory is fine for single Linode |
| `disableAutoSelect()` call after sign-out | P2 | Prevents "Continue as X?" after explicit logout |
| "Sign out of Google" on GetHired logout | P2 | `google.accounts.id.disableAutoSelect()` |

## P3 — Deferred

| Item | Priority | Notes |
|---|---|---|
| Show One Tap on applicant job detail page (Apply gate) | P3 | Currently only on signin/signup/AI panel |
| Link existing accounts via profile settings | P3 | "Connect Google account" in account settings |
| Google account unlink option | P3 | For users who signed up with Google and want email/password |
| Refresh token rotation via Firebase REST | P3 | Current tokens expire per Firebase TTL |
| Google auth on admin panel | P3 | NOT recommended; admin should use email/password |
| Server-side One Tap hint via `login_hint` | P3 | Pre-fill email in One Tap for returning users |

## Known Technical Debt

| Item | Notes |
|---|---|
| In-memory rate limiter resets on restart | Acceptable for single-instance; needs Redis at scale |
| `window.confirm()` for role conflict warning | Replace with a modal dialog in a future polish pass |
| `window.__GH_GOOGLE_CLIENT_ID__` global | Temporary bridge pattern; could be injected via Angular DI token instead |
| GIS script tag in index.html | Could be loaded lazily via dynamic script injection to reduce initial bundle impact |
