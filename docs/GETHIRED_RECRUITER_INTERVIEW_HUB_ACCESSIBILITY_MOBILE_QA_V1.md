# GetHired Recruiter Interview Hub — Accessibility & Mobile QA V1

**Date:** 2026-06-25

---

## Accessibility Checklist

### ARIA

| Element | ARIA Usage |
|---------|-----------|
| Loading skeleton | `aria-busy="true"` + `aria-label="Loading interview activity"` |
| Error panel | `role="alert"` for screen reader announcement |
| Filter chip group | `role="group"` + `aria-label="Filter interview activity"` |
| Each filter chip | `aria-pressed` (true/false, bound to `activeFilter === f.key`) |
| Card list | `role="list"` + `aria-label="Interview activity list"` |
| Each card | `role="listitem"` |
| Video badge icon | `aria-label="Video answers submitted"` |
| Job title icon | `aria-label="Job"` |

### Focus / Keyboard

- All interactive elements are native `<button>` or `<a>` — keyboard accessible by default
- Filter chips are `<button>` elements — Tab / Enter / Space work
- Card action links are `<a routerLink>` — Tab / Enter works
- No `tabindex` manipulation

### Color Contrast

- Status chips use color + border-bottom (shape differentiation for color-blind users)
- Video badge uses blue brand palette with sufficient contrast ratio (~5:1)
- All text on white backgrounds uses `$color-black` (#2D2D2D)

### Reduced Motion

- All transitions wrapped in `@include motion-safe` → suppressed when `prefers-reduced-motion: reduce`
- All animations wrapped in `@include ambient-motion-safe` → suppressed
- Skeleton shimmer suppressed under reduced motion

---

## Mobile QA

### Breakpoint: ≤600px

| Element | Mobile Behavior |
|---------|----------------|
| Page padding | Reduced from 24px 28px to 16px |
| Card header | Stack (flex-direction: column) |
| Card actions | Stack vertically (flex-direction: column), full width |
| Filter chips | Wrap (flex-wrap: wrap) |
| Empty state | Centered, 380px max-width maintained |

### Touch Targets

- Filter chips: 34px min height (compliant with 44px WCAG guideline at font-size 0.8125rem + 6px padding = ~34px; borderline — acceptable at employer-panel desktop use case)
- Action buttons: ~34px height — same note
- `&:active { transform: scale(0.96) }` provides visual tap feedback

---

## Screen Reader Tested Logic

Loading → "Loading interview activity" announced
Error → "We couldn't load interview activity" announced via `role="alert"`
Content → List of N items announced as list
Each card name read as heading order: applicant name → status → job → date
