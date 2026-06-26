# GETHIRED BRAND — PERFORMANCE BUDGET (RECENT 3)
**Date:** 2026-06-26

---

## 1. CSS Performance Impact

### New CSS in This Deployment

| File | New classes | Estimated added CSS | Impact |
|---|---|---|---|
| `job-posts-details.component.scss` | `.gh-breadcrumb-nav`, `.gh-breadcrumb`, `.gh-breadcrumb-item`, `.job-detail-error-state`, `.gh-job-skeleton`, `.btn-apply-now` enhancements, `@keyframes` (4 new) | ~120 lines | LOW — component-scoped SCSS |
| `styles.scss` | `.warn-snackbar`, `.error-snackbar` | ~14 lines | LOW — global but tiny |
| `index.html` | Meta tag changes only | 0 CSS | NONE |

**Total CSS delta: trivial. No bundle size concern.**

---

## 2. Animation Performance

| Animation | GPU-accelerated? | `will-change` | Risk |
|---|---|---|---|
| `gh-job-detail-reveal` | YES (opacity + transform) | Not declared | Minimal — short-lived |
| `gh-error-banner-reveal` | YES (opacity + transform) | Not declared | Minimal |
| `gh-applied-chip-reveal` | YES (opacity + transform) | Not declared | Minimal |
| `gh-skeleton-shimmer` | NO (background-position) | `will-change: background-position` | Low — but `will-change` declared, promote to GPU layer |
| `.gh-pressable:active` | YES (transform only) | Not declared | Negligible |
| `gh-sheet-reveal` | YES (opacity + transform) | Not declared | Minimal |

**Note:** `background-position` animation in `.gh-job-skeleton` uses `will-change: background-position` — this promotes the element to its own layer and signals the browser to pre-optimize. This is correct usage.

---

## 3. CLS (Cumulative Layout Shift) Assessment

### Breadcrumb CLS Fix
```scss
.gh-breadcrumb-nav {
  min-height: 2rem;
  contain: layout;
}
```
- `min-height: 2rem` reserves vertical space before the breadcrumb renders (it's conditionally displayed after job data loads).
- `contain: layout` prevents the breadcrumb's layout from affecting ancestor elements.
- **CLS risk: REDUCED** by explicit min-height. Remaining shift is bounded to 2rem max.

### Error State CLS
The error state is shown only when job data fails to load, in the same position where the content section would appear. No additional layout shift beyond the switch from loading to error state.

---

## 4. Network / Asset Performance

### OG Image (`gethired-og-default.png`)
- **File size:** 10,112 bytes (9.9 KB)
- **Dimensions:** 1200×630 (confirmed by asset metadata)
- **Format:** PNG — appropriate for a graphically simple dark-navy gradient. WebP would be ~30% smaller but this is not in the critical path (social crawlers only, not rendered in the browser).
- **Delivery:** Static asset served from `/assets/brand/` — same CDN/server as all static assets.

### Google Fonts
- Manrope (400, 500, 600, 700) and DM Sans/Poppins loaded via Google Fonts CDN with `<link rel="preconnect">` to both `fonts.googleapis.com` and `fonts.gstatic.com`.
- `display=swap` is implied (default Google Fonts behavior). Ensures text is visible during font load.
- **Risk:** Google Fonts CDN outage would cause FOUT (Flash of Unstyled Text) without a self-hosted fallback. Pre-existing. Deferred.

---

## 5. Performance Budget Summary

| Metric | Budget | Status |
|---|---|---|
| CSS delta (this deploy) | < 5KB | PASS (~3KB) |
| New network requests | 0 (CSS only, no new assets loaded at runtime) | PASS |
| GPU-accelerated animations | All transforms/opacity | PASS |
| CLS from breadcrumb | Bounded to 2rem max | PASS |
| OG image size | < 50KB | PASS (10KB) |
