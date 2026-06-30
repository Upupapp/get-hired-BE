# GETHIRED_GOOGLE_AUTH_SEO_PUBLIC_BEHAVIOR_V1

## Robots / Indexability

| Page | robots meta | Notes |
|---|---|---|
| /signin | `noindex, nofollow` | Pre-existing, unchanged |
| /signup | `noindex, nofollow` | Pre-existing, unchanged |
| /auth/choose-role | Not set (inherits default) | Should be `noindex` — deferred to backlog |

Action: Add `this.seoService.setPageMeta({ robots: 'noindex, nofollow' })` to `RoleClassificationComponent.ngOnInit()`. Deferred — not a launch blocker.

## Public Page Behavior

### AI Job Create Panel Gate

The gate card previously had:
- "Create free employer account" (primary)
- "Already have an account? Sign in" (ghost)

After this command:
- "Continue with Google" (primary — fastest path)
- "or" divider
- "Create account with email" (secondary)
- "Already have an account? Sign in" (ghost)

All CTA buttons have `type="button"` — no accidental form submission.
Gate card is inside the existing AI panel — panel behavior unchanged.

## Google Privacy Policy / Terms

No additional terms language required specifically for Google sign-in beyond the existing "By continuing, you agree to our Terms of Service and Privacy Policy" text shown in `RoleClassificationComponent`.

Signin/signup pages should display similar notice (deferred to backlog — existing pages already have terms language in the recaptcha notice).

## Social Graph / Open Graph

No changes to Open Graph meta tags. Sign-in/sign-up pages are noindexed — no OG tags needed.

## URL Structure

No new public-facing URLs that affect SEO.
`/auth/choose-role` is transient (redirects to /signin if no pending state) — crawlers cannot reach meaningful content.

## GIS Script and Lighthouse

The GIS script `async defer` attribute ensures it doesn't impact LCP/FCP scores.
However, it adds a third-party request. Lighthouse may flag it:
- Expected impact: < 100ms LCP delay (async load)
- GIS is on Google's CDN (globally distributed, low latency)
