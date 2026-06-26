# GETHIRED BRAND — EFFECTS LIBRARY (RECENT 3)
**Date:** 2026-06-26

---

## 1. Visual Effects Catalog

### 1.1 Drop Shadow

Used consistently for card elevation:

| Element | Shadow value | Usage |
|---|---|---|
| `.card` (job detail) | `0px 10px 19px rgba(0,0,0,0.06)` | Job detail content card |
| `.gh-skeleton-card` | `0 1px 4px rgba(0,0,0,0.06)` | Skeleton loading cards |
| Card hover (global) | `0 8px 24px rgba(0,0,0,0.12)` | Hover elevation lift |
| `.gh-job-card-hover` hover | `0 4px 16px rgba(0,0,0,0.1)` | Job list card hover |
| `.gh-sticky-action-bar` | `0 -2px 8px rgba(0,0,0,0.1)` | Sticky action bar lift-shadow |

**Pattern:** Consistent use of `rgba(0,0,0, low-alpha)` shadows — brand-neutral, not tinted. Values scale with elevation tier (1–10px radius for ground-level, 19–24px for floating cards).

### 1.2 Border Radius

| Element | Radius | Usage |
|---|---|---|
| `.card` (job detail) | 10px | Main content cards |
| `.portal-bento-card` | 14px | Portal bento grid |
| `.portal-usp-card` | 16px | USP cards |
| Bottom-sheet dialog | `16px 16px 0 0` | Mobile dialog |
| `.bg-applied` chip | 6px | Applied state chip |
| `.badge-card` | 5px | Job detail badge items |
| Snackbar | Not explicitly set | Uses Angular Material default |

**Pattern:** Radius increases with component prominence (5px chips → 10px cards → 14–16px hero cards → 16px dialogs).

### 1.3 Gradient Effects

| Effect | Colors | Usage |
|---|---|---|
| Portal hero background | `linear-gradient(135deg, #FFF8F6 0%, #FFFFFF 100%)` | Warm coral tint → white |
| `btn-cta-primary` | `linear-gradient(99.75deg, $color-global-red 24.68%, #FF4D3C 91.74%)` | Primary CTA fill |
| Skeleton shimmer | `linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` | Loading state |
| Hero glow blobs | `rgba(45,212,191,0.45)` / `rgba(254,111,97,0.35)` | Decorative teal/coral glows |
| OG image | Dark navy gradient (embedded in PNG asset) | Social sharing |

### 1.4 Focus Rings

| Selector | Style | Color |
|---|---|---|
| Global `:focus-visible` | `2px solid $color-global-red-buttons; offset: 2px` | #FF7062 coral |
| `.btn-apply-now:focus-visible` | `2px solid $color-global-red-buttons; offset: 3px; radius: 5px` | #FF7062 coral |
| Breadcrumb `a:focus-visible` | `2px solid currentColor; radius: 2px` | Inherits text color |
| `.btn-link-cta:focus-visible` | `2px solid $color-global-red-buttons; offset: 2px` | #FF7062 coral |

**Pattern:** All focus rings use 2px coral outline. `.btn-apply-now` has a slightly larger offset (3px) to clear the button's own border. Breadcrumb uses `currentColor` which resolves to `#6b7280` (muted) — acceptable for a secondary nav element.

---

## 2. Effects Brand Coherence Score

| Category | Score | Notes |
|---|---|---|
| Shadows | 5/5 | Consistent elevation system |
| Radius | 4/5 | Consistent tiering, no outliers in new elements |
| Gradients | 5/5 | Warm coral family, consistent tint direction |
| Focus rings | 4/5 | Consistent; breadcrumb `currentColor` is slight divergence |
| Motion effects | 5/5 | See MOTION_TOKENS report |

**Overall: 4.6/5 — Brand-coherent**
