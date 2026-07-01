# GETHIRED BRAND OFFLINE/DEGRADED SYSTEM V6
**Date:** 2026-07-01

---

## Offline Design Principles

1. **Non-blocking.** Offline banners do not prevent scroll or reading cached content.
2. **Auto-retry.** System retries silently; banner updates when reconnected.
3. **Warm tone.** Amber warning, not red error (offline is environmental, not user error).
4. **Reduced motion.** No bounce/pulse on offline banner — informational only.

---

## Offline Token Reference

| Element | Token/Value |
|---|---|
| Banner background | `rgba(245, 158, 11, 0.12)` — amber soft |
| Banner border | `1px solid rgba(245, 158, 11, 0.3)` |
| Banner icon | `#F59E0B` amber |
| Banner text | `--gh-text: #101828` |
| Retry link | `--gh-coral: #FF675D` |
| `.warn-snackbar` | `background: #b45309` (WCAG AA accessible amber) |

---

## Offline Banner Component Spec

```scss
.gh-offline-banner {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gh-text, #101828);
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

---

## V6 Offline State Coverage

| Surface | Offline Handling | Gap? |
|---|---|---|
| LinkedIn button | None (external redirect) | N/A — browser handles |
| LinkedIn complete | None — if offline, auth will fail with error | Should show error state not infinite spinner |
| Company setup modal | None — modal shows after setup complete | N/A |
| Dashboard | Not audited in V6 (V5 baseline) | — |

**V6 Gap:** LinkedIn complete page — if network drops mid-callback, the spinner will spin indefinitely. Recommend a timeout (e.g., 15s) after which the error state is shown automatically. This is a TypeScript concern, not SCSS.

---

## Degraded State (Partial API Response)

The `.warning-snackbar` class handles degraded notifications:
```css
.warning-snackbar { background-color: #b45309; color: #ffffff; }
```

Degraded data panels should use amber left-border accent:
```scss
.gh-degraded-banner {
  border-left: 4px solid #F59E0B;
  background: rgba(245,158,11,0.06);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: var(--gh-text-secondary);
}
```

---

## V6 Offline Gaps (Summary)

1. LinkedIn complete page: infinite spinner on network failure (TS concern)
2. No `gh-offline-banner` component exists yet — tracked in Backlog V6
3. No service worker / offline caching (out of BRAND scope)
