# GETHIRED BRAND — MOTION TOKENS (RECENT 3)
**Date:** 2026-06-26

---

## 1. Token Registry

**Source:** `src/assets/styles/_motion.scss`

### Duration Tokens

| Token | Value | Semantic Purpose |
|---|---|---|
| `$motion-duration-micro` | 160ms | State feedback, haptic press, error/success banners |
| `$motion-duration-card` | 220ms | Card/content arrival, breadcrumb nav (180ms — near-token), dialogs |
| `$motion-duration-drawer` | 260ms | Drawer/panel entry |
| `$motion-duration-meter-fill` | 650ms | Match meter fill (one-shot) |
| `$motion-duration-ambient` | 6000ms | Hero gradient drift, ambient loops |

### Easing Tokens

| Token | Value | Semantic Purpose |
|---|---|---|
| `$motion-ease-standard` | cubic-bezier(0.4, 0, 0.2, 1) | State changes, hover transitions, haptic press |
| `$motion-ease-decelerate` | cubic-bezier(0.0, 0.0, 0.2, 1) | Content arrival (card/page entry) — content "arrives" |

### Scale / Distance Tokens

| Token | Value | Usage |
|---|---|---|
| `$gh-scale-press` | 0.985 | Button/card tap compression |
| `$gh-shift-sm` | 4px | Small horizontal/vertical shift |
| `$gh-lift` | -2px | Card hover lift (translateY) |

---

## 2. Token Conflict Assessment

**Question from brief:** Are BRAND's motion tokens conflicting with the existing `_motion.scss` tokens from the public-portal redesign?

**Finding: NO CONFLICTS.**

The BRAND additions (lines 46–79 of `_motion.scss`) are placed in a clearly demarcated section ("BRAND additions") and extend the token set:
- They do not redefine any of the 5 duration tokens or 2 easing tokens from the portal redesign section.
- `$gh-scale-press`, `$gh-shift-sm`, and `$gh-lift` are new tokens with no name collisions.
- `.gh-pressable`, `.gh-error-panel`, `.gh-fallback-page`, `.gh-success-pulse` are new utility classes — no existing class names reused.
- `@keyframes gh-success-pulse-kf` is a new keyframe name — no collision with the portal's `gh-job-detail-reveal`, `gh-applied-chip-reveal`, `gh-error-banner-reveal`, `gh-skeleton-shimmer`.

---

## 3. Token Adoption Audit (Recent Files)

| File | Token used | Correctly? |
|---|---|---|
| `job-posts-details.component.scss` | `$motion-duration-card` (220ms) | YES |
| `job-posts-details.component.scss` | `$motion-duration-micro` (160ms) | YES |
| `job-posts-details.component.scss` | `$motion-ease-decelerate` | YES |
| `job-posts-details.component.scss` | `$motion-ease-standard` | YES |
| `job-posts-details.component.scss` | `$gh-scale-press` | YES |
| `_portal-common.scss` | `$motion-ease-standard` via literal `160ms` reference | NEAR — 160ms matches `$motion-duration-micro` but is hardcoded |
| `styles.scss` | `$motion-duration-card` (sheet-reveal 220ms) | YES |
| `styles.scss` | `$motion-ease-decelerate` (sheet-reveal) | YES |
| `styles.scss` | `$motion-duration-micro` (skeleton-reveal) | YES |
| `styles.scss` | `$gh-scale-press` (touch media query) | YES |
| `styles.scss` | `$gh-lift` (card hover) | YES |

---

## 4. Hardcoded Values (Pre-existing, Deferred)

| Location | Value | Should be |
|---|---|---|
| `#interview-list:hover` in job-posts-details.scss | `0.3s` | `$motion-duration-drawer` (260ms ≈ 0.26s) |
| `#interview-list img` | `0.8s` | Custom token or `$motion-duration-meter-fill` (650ms) |
| `job-seeker-portal.component.scss` hero reveal | `280ms` | Near `$motion-duration-drawer` (260ms) — acceptable |
| `_portal-common.scss` usp-card hover | `160ms` | `$motion-duration-micro` — semantically correct but not tokenized |

---

## 5. `@import` Chain Verification

Both `job-posts-details.component.scss` and `_portal-common.scss` correctly `@import "src/assets/styles/motion"` (or `~assets/styles/motion`). All tokens are in scope where used.
