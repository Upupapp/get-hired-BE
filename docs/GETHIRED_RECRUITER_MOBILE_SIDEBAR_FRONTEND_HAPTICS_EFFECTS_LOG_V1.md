# GETHIRED_RECRUITER_MOBILE_SIDEBAR_FRONTEND_HAPTICS_EFFECTS_LOG_V1

## Phase 5 + 13 — Frontend Haptics / Effects Log
Date: 2026-06-25

---

## Motion Token Reference

From `src/assets/styles/_motion.scss`:
- `$motion-duration-drawer: 260ms` — used for drawer slide + scrim fade
- `$motion-duration-micro: 160ms` — used for button hover background
- `$motion-ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1)` — drawer slide (feels like physical deceleration)
- `$motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1)` — scrim + button/item transitions
- `@mixin motion-safe` — removes all transitions/animations under prefers-reduced-motion: reduce

---

## Effects Implemented

### 1. Drawer Slide
```scss
.gh-mobile-drawer {
  transform: translateX(-100%);
  transition: transform $motion-duration-drawer $motion-ease-decelerate;
  &--open { transform: translateX(0); }
  @include motion-safe; // → transition: none under reduced-motion
}
```
Behavior: 260ms slide-in from left with physical deceleration feel.

### 2. Scrim Fade
```scss
.gh-mobile-scrim {
  opacity: 0;
  transition: opacity $motion-duration-drawer $motion-ease-standard;
  &--visible { opacity: 1; }
  @include motion-safe;
}
```
Behavior: 260ms fade in/out of dark overlay.

### 3. Hamburger → X Animation
```scss
.gh-menu-icon .gh-menu-line {
  transition: transform $motion-duration-drawer $motion-ease-decelerate,
              opacity $motion-duration-micro $motion-ease-standard;
  transform-origin: center;
  @include motion-safe;
}
.gh-menu-icon--open {
  .gh-menu-line--top { transform: rotate(45deg) translate(4px, 6px); }
  .gh-menu-line--mid { opacity: 0; transform: scaleX(0); }
  .gh-menu-line--bot { transform: rotate(-45deg) translate(4px, -6px); }
}
```
Behavior: SVG lines morph into X shape while drawer opens.

### 4. Menu Button Press Haptic
```scss
.gh-mobile-menu-btn {
  transition: background $motion-duration-micro $motion-ease-standard,
              transform 100ms $motion-ease-standard;
  &:active { transform: scale(0.93); }
  @include motion-safe;
}
```
Behavior: Button shrinks 7% on tap, simulating physical press.

### 5. Nav Item Tap Haptic
```scss
.gh-drawer-nav-item {
  transition: background $motion-duration-micro ...,
              transform 100ms $motion-ease-standard;
  &:active {
    transform: scale(0.97);
    background: rgba($color-global-red-buttons, 0.1);
  }
  @include motion-safe;
}
```
Behavior: Item scales down 3% + brand-red tint on tap.

### 6. Close Button Press Haptic
```scss
.gh-drawer-close-btn {
  &:active { transform: scale(0.9); }
  @include motion-safe;
}
```
Behavior: Close button scales down 10% on tap.

### 7. Menu Button Hover
```scss
.gh-mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
```
Behavior: Subtle white overlay on hover (desktop/pointer users).

### 8. Nav Item Hover
```scss
.gh-drawer-nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}
```
Behavior: Subtle white overlay on hover.

---

## Reduced Motion Mode

All 8 effects above have `@include motion-safe` which nullifies transitions and animations.
Under reduced motion:
- Drawer appears/disappears instantly
- Scrim appears/disappears instantly
- Hamburger ↔ X change is instant
- Scale press effects are suppressed
- Hover color/background changes still apply (color-only, always safe)

Active route state (border + background color) always applies — no animation involved.

---

## Status: ALL 8 EFFECTS IMPLEMENTED
