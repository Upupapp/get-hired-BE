# GETHIRED SEC-02 — Frontend Haptics & Effects Log

**Date:** 2026-06-25  
**Component:** `job-posts-details.component` (primary job detail surface)

---

| Effect | Class/Selector | Screen Size | UX Purpose | Data Dependency | Reduced-Motion Fallback | A11y Impact | Performance Impact | Verified |
|--------|---------------|-------------|------------|-----------------|------------------------|-------------|-------------------|----------|
| Job content reveal | `gh-job-content-reveal` | All | Gentle fade+slide on content render; orients user that page finished loading | `details$` resolved | `animation: none` | None (decorative) | 1 CSS animation, GPU-composited | Build pass |
| Applied chip reveal | `.bg-applied` | All | Applied badge pops in once confirmed from backend; signals "you've applied" without flicker | `isApplied` from backend token context | `animation: none` | Uses `role` from existing container | Minimal | Build pass |
| Error banner reveal | `.job-detail-session-banner` | All | SEC-02 403 session-expired banner slides in; anchors user attention to the problem | 403 error code | `animation: none` | `role="alert"` already on container | Minimal | Build pass |
| Error state (generic) | `.job-detail-error-state` | All | Already had role="alert"; reveal animation improves wayfinding on retry | `jobError$` | `animation: none` | Preserved existing `role="alert"` | Minimal | Build pass |
| Skeleton shimmer | `.gh-job-skeleton` | All | Utility class for future loading skeleton on job body (usable by child components) | `loading$` | `animation: none` | Hides from AT when loading (combine with `aria-busy`) | Background-position animation, non-blocking | Build pass |
| Apply CTA tap compression | `.btn-apply-now:active` | Touch + desktop | Micro-scale on press confirms tap; reduces accidental double-taps | User interaction | `transform: none` in reduced-motion | Decorative; button label unchanged | `$gh-scale-press` scale, GPU | Build pass |
| Apply CTA focus ring | `.btn-apply-now:focus-visible` | Keyboard users | High-contrast focus ring on brand color for keyboard navigation | Focus state | N/A (not animated) | Improves keyboard a11y | CSS only, zero cost | Build pass |

---

## Motion Tokens Used

- `$motion-duration-card` — card/content reveals (220ms equivalent)
- `$motion-duration-micro` — micro-interactions like tap press (80ms equivalent)
- `$motion-ease-standard` — standard easing for reveals
- `$motion-ease-decelerate` — decelerate easing for content entrance
- `$gh-scale-press` — tap compression scale (0.985 equivalent)

All tokens sourced from `src/assets/styles/_motion.scss`. No hardcoded values.

---

## Core Web Vitals Impact

None. All animations are CSS-only, GPU-composited (opacity + transform), and applied only after content is rendered. No layout-triggering properties used. No animation libraries added.
