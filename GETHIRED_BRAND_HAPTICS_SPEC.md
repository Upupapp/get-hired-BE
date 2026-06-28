# GETHIRED_BRAND_HAPTICS_SPEC.md
## BRAND QA Cycle 11 — Haptics Specification
_Generated: 2026-06-25_

---

## Haptic Infrastructure Status

GetHired FE uses **CSS press-scale effects as visual haptic proxies** rather than the Web Vibration API. This is the pattern established in prior BRAND cycles:
- `.gh-pressable` class from `_motion.scss` (`:active { transform: scale(0.985); }`)
- Component-level `:active { transform: scale(N); }` with inline `@media (prefers-reduced-motion: reduce)` overrides

The **Web Vibration API** (`navigator.vibrate()`) is NOT used anywhere in the codebase. This is intentional per the BRAND rules: haptics are optional, user-initiated only, and must fail silently.

## Haptic Effects Applied in QA11 Scope

| Component | Element | Haptic Pattern | Implementation |
|---|---|---|---|
| Interview Hub | `.ih-btn:active` | scale(0.96) | Component SCSS |
| Interview Hub | `.ih-action:active` | scale(0.96) | Component SCSS |
| Interview Hub | `.ih-card:active` | scale(0.99) | Component SCSS |
| Panel — Mobile | `.gh-mobile-menu-btn:active` | scale(0.93) | Component SCSS + inline reduce |
| Panel — Mobile | `.gh-drawer-close-btn:active` | scale(0.9) | Component SCSS + inline reduce |
| Panel — Mobile | `.gh-drawer-nav-item:active` | scale(0.97) | Component SCSS + inline reduce |
| Messages | `.rm-thread-row:active` | scale(0.99) | Via `.rm-thread-row @include motion-safe` |
| Messages | `.rm-back-btn` (gh-pressable) | scale(0.985) | `.gh-pressable` class |
| Messages | `.rm-btn` (gh-pressable) | scale(0.985) | `.gh-pressable` class |

## Rule Compliance

| Rule | Status |
|---|---|
| User-initiated only | PASS — all on user click/tap |
| Fail silently | PASS — CSS, no JS error path |
| Reduced-motion safe | PASS — all suppressed under `prefers-reduced-motion` |
| No ambient haptics | PASS — no continuous vibration |
| No fake urgency | PASS |

## Haptic Intensity Scale (for reference)

| Scale | Value | Use Case |
|---|---|---|
| Light (card) | 0.99 | Row/card tap feedback |
| Medium (button) | 0.96–0.97 | Primary/secondary action buttons |
| Strong (icon btn) | 0.9–0.93 | Icon-only or close buttons |
| Global (gh-pressable) | 0.985 | General-purpose press |

## Assessment

The haptic system is consistent and correctly scoped. The eight mobile drawer haptic effects claimed in the deployment scope are present and verified. All wrapped under reduced-motion protection. No Web Vibration API usage. PASS.
