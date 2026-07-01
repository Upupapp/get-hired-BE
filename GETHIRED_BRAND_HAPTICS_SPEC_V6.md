# GETHIRED BRAND HAPTICS SPEC V6
**Date:** 2026-07-01

---

## Haptics Philosophy

- **User-initiated only.** Never trigger haptics on page load, background events, low scores, or rejection notifications.
- **Fail silently.** All haptic calls wrapped in try/catch. No UI impact if device doesn't support.
- **Proportional.** Light for minor interactions, medium for confirmations, heavy/success for milestone moments.
- **Mobile only.** `navigator.vibrate()` or HapticService — no effect on desktop.

---

## Haptic Levels (GetHired Standard)

| Level | Duration | When |
|---|---|---|
| `light()` | 10ms | Card tap, chip select, toggle |
| `medium()` | 25ms | Form submit, confirm action |
| `success()` | 15ms + 10ms (two-tap) | Auth complete, profile saved, job posted |
| `error()` | 50ms long | Auth failure, form validation fail |
| `warning()` | 30ms | Offline, rate limit hit |

---

## V6 New Surface Haptic Calls

### LinkedIn Button
| Trigger | Haptic | Notes |
|---|---|---|
| Button tap | `HapticService.light()` | Tap feedback before redirect |

**Status:** Not implemented. Tracked as backlog item.

### LinkedIn Complete Page (Callback)
| Trigger | Haptic | Notes |
|---|---|---|
| Auth success → before navigation | `HapticService.success()` | Celebrate LinkedIn connect |
| Auth error state shows | `HapticService.error()` | Signal failure |

**Status:** Not implemented. Tracked as backlog item.

### Company Setup Success Modal
| Trigger | Haptic | Notes |
|---|---|---|
| Modal mounts (user just completed setup — user-initiated) | `HapticService.success()` | Milestone moment |
| Primary CTA tap ("Go to Dashboard") | `HapticService.medium()` | Navigation confirmation |

**Status:** Not implemented. Tracked as backlog item.

---

## HapticService Reference

```typescript
// Usage pattern (TypeScript — not SCSS)
import { HapticService } from 'src/app/services/haptic.service';

// In component
constructor(private haptic: HapticService) {}

// On user-initiated action
this.haptic.light();    // 10ms
this.haptic.medium();   // 25ms
this.haptic.success();  // milestone
this.haptic.error();    // failure

// Service wraps navigator.vibrate() with graceful fallback
```

---

## Haptic Safety Rules

1. NEVER vibrate on page load, route change, or background refresh
2. NEVER vibrate on notifications the user didn't trigger
3. NEVER vibrate on score/match % results (passive data display)
4. NEVER vibrate on rejection or negative feedback delivery
5. ALWAYS check if the user action caused the trigger (button tap, form submit, modal confirm)

---

## V6 Haptic Coverage Map

| Surface | Light | Medium | Success | Error | Status |
|---|---|---|---|---|---|
| LinkedIn button tap | Needed | — | — | — | Missing |
| LinkedIn auth success | — | — | Needed | — | Missing |
| LinkedIn auth error | — | — | — | Needed | Missing |
| Setup modal mount | — | — | Needed | — | Missing |
| Setup modal primary CTA | — | Needed | — | — | Missing |
| All auth form submits (V5) | — | Needed | — | — | Missing (V5 backlog) |

**Note:** All haptic gaps are TypeScript concerns, not SCSS. They are documented here for completeness and flagged in the master backlog.
