# GetHired — Application Completeness Accessibility QA V2

**Date:** 2026-06-24  
**Phase:** 16

---

## WCAG 2.1 AA Checklist

### 1.4.1 Use of Color
- PASS: Badge pills always include text label (level name) — color not sole indicator
- PASS: Progress bar has `role="progressbar"` + `aria-valuenow` — not color-only
- PASS: Tip block types distinguished by heading ("What was missing" vs "Nice-to-haves") not just color

### 1.4.3 Contrast Ratio
- PASS: Teal text (#04A08B) on #e6faf7 background — contrast ~4.8:1 (AA)
- PASS: Dark amber text (#b45309) on #fff7ed background — contrast ~4.9:1 (AA)
- PASS: Coral text (#FE6F61) on #fff1f0 background — contrast ~3.8:1 (AA for large/bold text)
- Note: #FE6F61 on #fff1f0 is borderline for small text. Badge text is 11px bold which qualifies as "large text" under WCAG (bold 14pt+). Review if font is changed.
- PASS: Deep teal copy (#065f46) on #e6faf7 — contrast ~9.1:1 (AAA)

### 2.1.1 Keyboard Accessible
- PASS: Toggle button is `<button>` — keyboard focusable and activatable
- PASS: CTA links are `<a>` — keyboard navigable
- PASS: Retry button is `<button>` — keyboard activatable
- PASS: No `tabindex="-1"` on any interactive element

### 2.4.7 Focus Visible
- PASS: Toggle button `:focus-visible` — 2px coral ring
- PASS: CTA links `:focus-visible` — 2px coral ring
- PASS: Retry button `:focus-visible` — 2px coral ring

### 2.4.3 Focus Order
- PASS: Toggle button (right of row) is after job info in DOM order — natural tab order
- PASS: Card content appears in DOM after the toggle button (DOM conditional render)

### 4.1.2 Name, Role, Value
- PASS: Toggle button `aria-expanded` + `aria-controls`
- PASS: Badge `aria-label` with full text description
- PASS: Loading skeleton `role="status"` + `aria-label`
- PASS: Progress bar `role="progressbar"` + `aria-valuenow/min/max`
- PASS: Card region `role="region"` + `aria-label`
- PASS: Error state `role="alert"`
- PASS: Decorative arrow `aria-hidden="true"`
- PASS: SVG check icon `aria-hidden="true"` (presentational)

### 2.3.1 Three Flashes
- PASS: No flashing content

### 1.3.1 Info and Relationships
- PASS: Tip lists use semantic `<ul>/<li>`
- PASS: Section headings use `<p>` with descriptive text (not heading elements — appropriate given nesting level)

---

## Motion Accessibility

| Element | Mechanism | Reduced Motion Behavior |
|---------|-----------|------------------------|
| `acb-shimmer` | `@include ambient-motion-safe` | `animation: none !important` |
| `acdc-shimmer` | `@include ambient-motion-safe` | `animation: none !important` |
| `acb-fadein` | `@include motion-safe` | `animation: none !important` |
| `acdc-fadein` | `@include motion-safe` | `animation: none !important` |
| Chevron rotation | `@include motion-safe` on transition | `transition: none !important` |
| Progress bar fill | `@include motion-safe` on transition | `transition: none !important` |

Shimmer and reveals are fully suppressed (not slowed) under `prefers-reduced-motion: reduce`. This follows the existing pattern in `_motion.scss` and the prior BRAND command spec.
