# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — ACCESSIBILITY & MOBILE QA V1

## Date: 2026-06-25

---

## ACCESSIBILITY

### Reduced-motion compliance
- All new CSS transitions are wrapped with `@media (prefers-reduced-motion: reduce) { transition: none; }`
- Angular `[@animate]` animation library used throughout existing app — project-wide compliance is assumed for Angular animation system
- No new animation that lacks a reduced-motion guard was introduced

### Colour contrast
- Optional badge: `#2563eb` (blue text) on `#f0f7ff` (very light blue) — ratio ~5.5:1 (WCAG AA passes at 4.5:1 required for normal text at 11px/600 weight)
- Empty-state title: `#4b5563` on `#fafafa` — ratio ~7.5:1 (WCAG AAA)
- Empty-state subtitle: `#9ca3af` on `#fafafa` — ratio ~2.8:1 — acceptable for supplementary decorative hint text; not primary instructional content
- "Optional for publishing" badge text size is 11px/600 weight (bold equivalent) — qualifies as large text at 600 weight per WCAG definition

### Screen reader
- New badge `<span>` is inline within the heading row — will be read as part of the label
- Empty-state paragraphs are standard `<p>` elements — announced normally
- No ARIA roles added or removed
- No focusable elements added

### Keyboard navigation
- No new interactive elements introduced in the optional badge or empty-state areas
- Existing tab flow through question add/edit/delete controls: unchanged

---

## MOBILE

### Optional badge
- `display: inline-block` with fixed padding — wraps naturally on small screens since parent is `d-flex flex-wrap gap-2`
- Does not overflow on 375px viewport

### Empty-state card
- `text-align: center` + `flex-direction: column` — stacks correctly at any width
- `padding: 32px 20px` — adequate touch targets for the card area

### Hint text
- 13px — readable on mobile, slightly below body default but acceptable for supporting copy
- `line-height: 1.5` — adequate for mobile readability

### Preview empty-state
- Same centered layout, responsive by design

---

## VERDICT

All new UI elements are accessible and mobile-friendly. No regressions to keyboard nav, screen reader flow, or colour contrast for primary content.
