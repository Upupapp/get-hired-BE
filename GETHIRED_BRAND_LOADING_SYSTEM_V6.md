# GETHIRED BRAND LOADING SYSTEM V6
**Date:** 2026-07-01

---

## Loading Pattern Hierarchy

| Context | Pattern | Token |
|---|---|---|
| Full page / dashboard | Shimmer skeleton | `.gh-dashboard-skeleton` |
| Data card | Shimmer skeleton | `.gh-plan-health-skeleton` |
| OAuth callback | Centered spinner | Brand coral |
| Button submit | Spinner inline | Brand coral 20px |
| Meter/score | Fill animation | `.gh-plan-meter` |
| KPI reveal | Fade + scale | `.gh-dashboard-kpi` |

---

## Spinner Spec

```scss
// GetHired brand spinner — use this for all non-skeleton loading states
.gh-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(255, 103, 93, 0.15);  // coral at 15% opacity
  border-top-color: var(--gh-coral, #FF675D);   // brand coral
  border-radius: 50%;
  animation: gh-spin 0.7s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-top-color: transparent;
    // Show static coral ring instead
    border-color: rgba(255, 103, 93, 0.4);
  }
}

@keyframes gh-spin {
  to { transform: rotate(360deg); }
}
```

---

## LinkedIn Complete Page — Loading Fix

**Current (V6 gap):**
```scss
.li-complete-spinner {
  border-top-color: #0A66C2;  // LinkedIn blue — wrong
  animation: li-spin 0.7s linear infinite;  // no reduced-motion guard
}
```

**Recommended fix:**
```scss
.li-complete-spinner {
  border-top-color: var(--gh-coral, #FF675D);  // brand coral

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-color: rgba(255, 103, 93, 0.4);
    border-top-color: transparent;
  }
}
```

---

## Skeleton Shimmer Tokens (V5 — unchanged V6)

```scss
// Shimmer base
background: linear-gradient(90deg, #f0edf8 25%, #e6e2f2 50%, #f0edf8 75%);
background-size: 1600px 100%;
animation: gh-shimmer-v6 1.4s ease-in-out infinite;
@include ambient-motion-safe;  // stops for reduced-motion users
```

Sizes:
- Card: `border-radius: 16px`
- Pill/meter: `border-radius: 8px`
- Input: `border-radius: 10px`

---

## Loading State Copy Rules (from UX Copy Guide V6)

- "One moment…" — generic callback
- "Connecting your LinkedIn account…" — LinkedIn complete page
- "Setting up your workspace…" — company setup (not applicable here, this is post-setup)
- Never: "Loading…" alone — always contextualize
- Never: "Please wait" — passive, adds no information

---

## Loading Duration Targets

| Context | Target | Token |
|---|---|---|
| OAuth callback (LinkedIn) | < 2s typical | N/A |
| Dashboard initial load | < 800ms skeleton → content | `--gh-motion-analysis: 720ms` |
| Button action feedback | < 120ms to show spinner | `--gh-motion-micro: 160ms` |
| Meter fill reveal | 600ms | `--gh-motion-meter: 600ms` |
