# GETHIRED_BRAND_BENCHMARK_RESEARCH.md
## BRAND QA Cycle 11 — Benchmark Research
_Generated: 2026-06-25_

---

## 1. Motion Benchmark Comparison

| Pattern | GetHired Implementation | Industry Baseline | Verdict |
|---|---|---|---|
| Drawer slide-in | `translateX(-100%) → translateX(0)`, 260ms decelerate | Google Material: 250–300ms, translateX, decelerate | PASS |
| Hamburger→X morph | SVG line transform + opacity, 260ms/160ms | Common: rotate+translate lines, 200–300ms | PASS |
| Skeleton shimmer | CSS `background-position` animation, 1.4s infinite | MDN/Skeleton UI: 1.2–1.6s | PASS |
| Card hover lift | `translateY(-2px)`, 220ms | MUI, GitHub: 2–4px lift, 200–300ms | PASS |
| Filter chip active | Color + border swap, 160ms | Notion, Linear: pill color toggle | PASS with caveat |
| Empty-state reveal | `opacity 0→1 + translateY(8px)`, 280ms | Airbnb, Stripe: 200–300ms fade+slide | PASS |
| Page reveal animation | `opacity 0→1 + translateY(6px)`, 220ms | Stripe: 200–250ms decelerate | PASS |

## 2. Accessibility Benchmark

| Check | GetHired | WCAG 2.1 AA | Status |
|---|---|---|---|
| `prefers-reduced-motion` on all transitions | `@include motion-safe` / `@include ambient-motion-safe` | Required | PASS |
| Drawer: `aria-expanded` on toggle button | Present | Required | PASS |
| Drawer: `aria-controls` references drawer id | Present (`gh-mobile-drawer`) | Required | PASS |
| Drawer: focus moved into drawer on open | 200ms setTimeout focus | Recommended | PASS |
| Drawer: Escape closes drawer | `@HostListener('document:keydown.escape')` | Recommended | PASS |
| Skeleton: `aria-busy="true"` + `aria-label` | Present on Interview Hub | Required | PASS |
| Filter chips: `aria-pressed` | Present | Required | PASS |
| Avatar image: `alt=""` (decorative) | Present (`alt=""`) | Correct for decorative | PASS |

## 3. Performance Benchmark

| Metric | GetHired Approach | Acceptable Threshold | Status |
|---|---|---|---|
| Animation: compositor-only | translateX, translateY, scale, opacity only | No paint on animate | PASS |
| Shimmer: no JS timers | Pure CSS animation | No rAF/setInterval | PASS |
| Drawer: CSS transition only | No JS animation frames | Low jank risk | PASS |
| Avatar img loading | `loading="lazy"` | Best practice | PASS |

## 4. Key Findings

**RISK-01 (MEDIUM):** Filter chip active state in Interview Hub (`ih-filter-chip--active`) uses background+border+color change — multi-dimensional, not color-only. However no `font-weight` or `outline` indicator is present for users who can perceive shape/border changes. Meets minimum standard but lacks the explicit non-color differentiation pattern (e.g. bold text, check icon, or border thickness) that the BRAND system calls for.

**RISK-02 (LOW):** Interview Hub skeleton shimmer (`ih-shimmer`) animates `background-position` but has no `background-image: linear-gradient(...)` defined on `.ih-skeleton-chip` or `.ih-skeleton-line`. The shimmer animation moves position but there is no gradient to move, making the shimmer a no-op visually. This means skeleton chips appear as flat gray blocks — which is acceptable fallback but reduces perceived quality.

**RISK-03 (LOW):** `recruiter-messages.component.scss` imports `_motion.scss` via `@import "~assets/styles/motion"` (no leading underscore). This works if Webpack resolves the tilde correctly, but is inconsistent with the Interview Hub's `@import "src/assets/styles/_motion"`. No functional bug but a fragile import path.

**RISK-04 (LOW):** The employer-panel component SCSS imports `@import "src/assets/styles/motion"` (no leading underscore, no `~`). Three different import conventions for the same file exist across 3 components. Consolidation recommended.
