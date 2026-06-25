# GETHIRED_RECRUITER_MOBILE_SIDEBAR_ANALYTICS_PLAN_V1

## Phase 15 — Analytics Plan
Date: 2026-06-25

---

## Current Analytics State

No analytics SDK (Google Analytics, Segment, Mixpanel, etc.) was found in the employer-panel or main app files. This plan documents events to add when an analytics solution is integrated.

---

## Recommended Events

| Event Name | Trigger | Properties |
|-----------|---------|------------|
| `employer_mobile_drawer_open` | `openMobileNav()` called | `{ source: 'hamburger_button' }` |
| `employer_mobile_drawer_close` | `closeMobileNav()` called | `{ source: 'scrim' | 'escape_key' | 'close_button' | 'navigation' }` |
| `employer_mobile_drawer_nav_tap` | Nav item click in drawer | `{ destination: route, label: 'Dashboard' | 'Jobs' | ... }` |
| `employer_mobile_topbar_view` | Top bar visible (breakpoint) | Can be passive/scroll-based |

---

## Implementation Pattern (when analytics added)

```typescript
// In openMobileNav():
this.analyticsService.track('employer_mobile_drawer_open', { source: 'hamburger_button' });

// In closeMobileNav(source: string = 'programmatic'):
this.analyticsService.track('employer_mobile_drawer_close', { source });
```

---

## Priority

- P2: Nice to have for UX optimization
- No analytics is better than fake/broken analytics
- Do not add console.log or debug tracking in production code

---

## Status: PLAN ONLY — no implementation (no analytics SDK present)
