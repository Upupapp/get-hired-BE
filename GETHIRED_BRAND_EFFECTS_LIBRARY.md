# GETHIRED_BRAND_EFFECTS_LIBRARY.md
## BRAND QA Cycle 11 — Effects Library
_Generated: 2026-06-25_

---

## Keyframe Animation Inventory

### From Interview Hub Component
| Name | Effect | Duration | Mixin |
|---|---|---|---|
| `ih-fadein` | `opacity 0→1, translateY(8px→0)` | `$motion-duration-card` (220ms) | `@include ambient-motion-safe` |
| `ih-shimmer` | `background-position -400px→400px` | 1.4s infinite | `@include ambient-motion-safe` |

### From Messages Component
| Name | Effect | Duration | Mixin |
|---|---|---|---|
| `rm-page-reveal` | `opacity 0→1, translateY(6px→0)` | 220ms | `@include motion-safe` |
| `rm-shimmer` | `background-position 100%→0%` | 1.4s infinite | `@include ambient-motion-safe` |
| `rm-detail-slide` | `opacity 0→1, translateX(8px→0)` | 220ms | `@include motion-safe` |
| `rm-empty-reveal` | `opacity 0→1, translateY(8px→0)` | 280ms | `@include motion-safe` |

### From `_motion.scss` (Global)
| Name | Effect | Duration | Mixin |
|---|---|---|---|
| `gh-success-pulse-kf` | `scale(1→1.04→1)` | 400ms | `@include motion-safe` |

---

## Effect Pattern Consolidation Opportunities

Three separate "fade-in from below" keyframes exist:
- `ih-fadein`: 8px Y offset, 220ms
- `rm-page-reveal`: 6px Y offset, 220ms
- `rm-empty-reveal`: 8px Y offset, 280ms

These could consolidate into a single global `@keyframes gh-reveal` with parameterized duration/offset. **Backlog item — not a blocking issue.**

## SVG Transform Effects

### Hamburger → X Morph (`employer-panel.component.scss`)
The SVG morph uses CSS `transform` on SVG `<line>` elements:
- Top: `rotate(45deg) translate(4px, 6px)` — translates in SVG user space
- Mid: `opacity: 0; scaleX(0)` — fades out
- Bottom: `rotate(-45deg) translate(4px, -6px)`

**Assessment:**
- Uses `transform-origin: center` — required for correct rotation pivot
- All transforms compositor-safe — YES (opacity, transform)
- `translate()` used as shorthand in `transform` property — not CSS `translate` property; works in all evergreen browsers
- No SVG `<path>` morphing (d attribute animation) — correct choice for simpler/more-supported approach
- Under `prefers-reduced-motion`: `@include motion-safe` on `.gh-menu-line` sets `transition: none` — hamburger stays as hamburger or X static, no morph — PASS

## Shimmer Quality Assessment

| Component | Gradient defined | Shimmer functional |
|---|---|---|
| `rm-skeleton-row` | YES (`linear-gradient(90deg, #f3f4f6 25%, #e9eaf0 50%, #f3f4f6 75%)`) | PASS |
| `ih-skeleton-chip` | NO (solid `background: #e5e7eb`) | FAIL — FIX-01 required |
| `ih-skeleton-line` | NO (solid `background: #e5e7eb`) | FAIL — FIX-01 required |

## Compositor Safety Check

All animations and transitions in QA11 scope use only:
- `transform` (translate, scale, rotate) — compositor thread
- `opacity` — compositor thread
- `background`, `background-position`, `color`, `border-color`, `box-shadow` — paint thread (acceptable for non-continuous effects)

No `width`, `height`, `top`, `left`, `margin`, or `padding` transitions. PASS.
