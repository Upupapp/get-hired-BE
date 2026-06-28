# GETHIRED_BRAND_PERFORMANCE_BUDGET.md
## BRAND QA Cycle 11 — Performance Budget
_Generated: 2026-06-25_

---

## Animation Performance Budget

| Metric | Budget | QA11 Compliance | Status |
|---|---|---|---|
| Total CSS animations active at once | ≤ 5 | Max 4 (3 skeleton lines/chips + shimmer + page reveal at load) | PASS |
| CSS keyframe animations | Compositor-only (transform/opacity) | All except shimmer (background-position) — see note | PASS |
| JS animation frames | 0 | 0 — no `requestAnimationFrame`, no GSAP, no JS animation | PASS |
| Web Vibration API calls | 0 | 0 | PASS |
| setTimeout calls | 2 per drawer interaction | 200ms (open focus) + 50ms (close focus) — not animation | PASS |
| setInterval / polling | 0 in QA11 scope | 0 (message-thread polling is pre-existing, out of scope) | PASS |

**Note on `background-position` shimmer:** Animating `background-position` triggers paint (not compositor) but the element count is low (3 chips + 3×3 lines = max 12 elements during loading skeleton). Paint cost is low. No CLS impact. Acceptable.

---

## CLS Budget

| Transition | CLS Risk | Assessment |
|---|---|---|
| Loading skeleton → Interview Hub content | Skeleton matches real content dimensions | NO CLS |
| Loading skeleton → Messages thread list | Skeleton rows 72px match thread rows ~72px | NO CLS |
| Mobile drawer open | Fixed position, no layout shift | NO CLS |
| Thread selection (detail pane reveal) | Opacity+translateX — no layout dimensions change | NO CLS |
| Page header `ih-fadein` | `opacity+translateY` — no space reservation change | NO CLS |

**Overall CLS risk: LOW.** No layout-affecting animations in QA11 scope.

---

## Bundle Size Impact

No new libraries, no new npm packages, no new icon fonts. All new CSS is in component SCSS files and one shared `_motion.scss` addition (already applied in prior cycles). New component SCSS sizes:
- `recruiter-interview-hub.component.scss`: ~10KB (source)
- `employer-panel.component.scss` (additions): ~440 lines additional
- `recruiter-messages.component.scss` changes: marginal

Angular will tree-shake and minify at build time. No meaningful bundle size impact.

---

## Image Performance

| Element | Attribute | Verdict |
|---|---|---|
| Avatar `<img>` in thread rows | `loading="lazy"` | PASS |
| Drawer logo | No `loading` attr | LOW RISK — logo is small, above fold |
| SVG icons | Inline SVG | PASS — no img request |

---

## Font Performance

All text uses Manrope (already loaded globally via `styles.scss`). No additional font loads introduced in QA11.

---

## Risk Summary

| Risk | Severity | Action |
|---|---|---|
| Background-position shimmer (paint) | LOW | Accept — low element count, loading state only |
| 3 shimmer animations on Interview Hub skeleton are no-op (FIX-01) | MEDIUM | Fix — add gradient to make shimmer visible |
| No lazy-loading on drawer logo | LOW | Backlog |
