# GETHIRED_BRAND_MOTION_TOKENS.md
## BRAND QA Cycle 11 — Motion Tokens + Reconciliation
_Generated: 2026-06-25_

---

## Existing Token Inventory (`_motion.scss`)

### Duration Tokens
| Token | Value | Intended Use |
|---|---|---|
| `$motion-duration-micro` | 160ms | Microinteractions (hover, press) |
| `$motion-duration-card` | 220ms | Card enter, page reveals |
| `$motion-duration-drawer` | 260ms | Drawers, dialogs |
| `$motion-duration-meter-fill` | 650ms | Match meter (one-shot) |
| `$motion-duration-ambient` | 6000ms | Hero ambient drift |

### Easing Tokens
| Token | Value | Intended Use |
|---|---|---|
| `$motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `$motion-ease-decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Enter animations (decelerate into place) |

### Scale/Shift Tokens (BRAND additions)
| Token | Value | Use |
|---|---|---|
| `$gh-scale-press` | 0.985 | `.gh-pressable` button press |
| `$gh-shift-sm` | 4px | Small shift/nudge |
| `$gh-lift` | -2px | Card hover lift (translateY) |

### Mixin Inventory
- `@mixin motion-safe` — disables `transition` + `animation` under `prefers-reduced-motion: reduce`
- `@mixin ambient-motion-safe` — disables only `animation` under reduce (not transition)

---

## Token Usage Audit — QA11 Scope

### Interview Hub
| Property | Value Used | Correct Token | Match |
|---|---|---|---|
| `.ih-header` animation duration | `$motion-duration-card` (220ms) | `$motion-duration-card` | PASS |
| `.ih-btn` transition | `$motion-duration-micro` | `$motion-duration-micro` | PASS |
| `.ih-filter-chip` transition | `$motion-duration-micro` | `$motion-duration-micro` | PASS |
| `.ih-card` transition | `$motion-duration-card` | `$motion-duration-card` | PASS |
| `.ih-card:hover` translateY | `$gh-lift` (-2px) | `$gh-lift` | PASS |
| `.ih-action` transition | `$motion-duration-micro` | `$motion-duration-micro` | PASS |

### Mobile Panel
| Property | Value Used | Correct Token | Match |
|---|---|---|---|
| `.gh-mobile-menu-btn` transition | `$motion-duration-micro` | `$motion-duration-micro` | PASS |
| `.gh-menu-line` transition | `$motion-duration-drawer` / `$motion-duration-micro` | Appropriate per element | PASS |
| `.gh-mobile-scrim` transition | `$motion-duration-drawer` | `$motion-duration-drawer` | PASS |
| `.gh-mobile-drawer` transition | `$motion-duration-drawer` | `$motion-duration-drawer` | PASS |
| `.gh-drawer-nav-item` transition | `$motion-duration-micro` | `$motion-duration-micro` | PASS |

### Messages Inbox
| Property | Value Used | Correct Token | Match |
|---|---|---|---|
| `.rm-page` animation | 220ms | `$motion-duration-card` | DRIFT — hardcoded |
| `.rm-chip` transition | 140ms | `$motion-duration-micro` (160ms) | DRIFT — see RISK-05 |
| `.rm-thread-row` transition | 120ms | `$motion-duration-micro` (160ms) | DRIFT — see RISK-05 |
| `.rm-skeleton-row` animation | 1.4s | n/a (not in token system, acceptable) | OK |
| `.rm-detail-reveal` animation | 220ms | `$motion-duration-card` | DRIFT — hardcoded |
| `.rm-empty-state--reveal` animation | 280ms | Between `$motion-duration-card` and `$motion-duration-drawer` | Minor drift |

---

## RISK-05: Duration Drift in Messages Inbox

`recruiter-messages.component.scss` uses hardcoded values (140ms, 120ms) instead of SCSS variables. These were likely written before the token system was available (or independently). They are close to but not aligned with `$motion-duration-micro` (160ms).

**Impact:** Low — timing feels similar but is technically inconsistent with the token system.

**Fix:** Replace hardcoded duration literals in `recruiter-messages.component.scss` with `$motion-duration-micro` where they should be 160ms, or introduce a new `$motion-duration-fast: 120ms` token if the 120ms value is intentional.

---

## RISK-04: Import Path Inconsistency

Three components import `_motion.scss` differently:
1. `recruiter-interview-hub`: `@import "src/assets/styles/_motion"` — absolute, with underscore
2. `recruiter-messages`: `@import "~assets/styles/motion"` — tilde-relative, no underscore
3. `employer-panel`: `@import "src/assets/styles/motion"` — absolute, no underscore, no tilde

All currently resolve, but this fragility could break on build config changes. Recommend standardizing to `@import "src/assets/styles/_motion"`.

---

## No New Tokens Needed

The existing token set fully covers all QA11 UI patterns. No new duration, easing, or scale tokens are required.
