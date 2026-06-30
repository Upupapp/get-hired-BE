# GETHIRED_GOOGLE_AUTH_PERFORMANCE_QA_V1

## GIS Script Loading

GIS script is loaded with `async defer`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- `async`: downloads in parallel with HTML parsing
- `defer`: executes after HTML parsing completes
- Does NOT block initial page render
- GIS library: ~35KB gzipped (from Google CDN, typically cached)

## Component Initialization

`GoogleSigninButtonComponent` polls `window.google` every 100ms, max 40 attempts (4s total):
- If GIS loads in < 500ms (typical): button renders immediately
- If GIS unavailable after 4s: skeleton remains, error event emitted
- Polling is `clearInterval`-based — no memory leak

## FE Bundle Impact

`GoogleSigninButtonComponent` added to SharedModule:
- Adds to main bundle (SharedModule is eagerly loaded)
- Component size: ~2KB minified (no dependencies, small template)
- GIS itself is external CDN — not bundled

`GoogleAuthService` added to auth-auth-module lazy chunk:
- Size impact: ~3KB minified
- HTTP client already in shared bundle

`RoleClassificationComponent` added to auth-auth-module:
- Only loaded when visiting `/auth/choose-role`
- Lazy loaded with auth module

## API Call Latency

| Operation | Expected latency |
|---|---|
| GIS credential callback | < 1s (Google popup interaction) |
| `/api/auth/google/firebase-session` | 500-1500ms (Firebase REST + DB query) |
| `/api/auth/choose-role` | 500-1000ms (Firebase verifyIdToken + DB insert) |

## Caching

- GIS script: cached by browser after first load (Google CDN, long TTL)
- Firebase ID token: valid for 1 hour (Firebase default)
- GetHired session (localStorage): no expiry except Firebase token TTL

## No Performance Regressions

- `styles.scss` additions: ~30 lines, compiles to < 0.5KB in CSS bundle
- No new HTTP interceptors
- No new Angular store actions
- Existing lazy module boundaries unchanged
