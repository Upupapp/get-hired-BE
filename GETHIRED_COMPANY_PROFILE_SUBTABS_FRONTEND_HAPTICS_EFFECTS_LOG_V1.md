# Frontend Effects Log — Company Profile Subtabs

## All Effects Implemented

### 1. Tab Active Underline Glow
```scss
.cp-subtab-underline {
  position: absolute;
  bottom: -2px;
  height: 3px;
  background: $color-global-red;
  transform: scaleX(0);
  transition: opacity .2s ease, transform .22s cubic-bezier(.4,0,.2,1);
  // Active state:
  .cp-subtab-btn--active & { opacity: 1; transform: scaleX(1); }
}
```
Effect: Underline slides in from center when tab becomes active.
Reduced-motion fallback: `transition: none` → underline appears immediately without animation.

### 2. Tab Panel Entry Fade+Slide
```html
[@animate]="{value:'*', params:{ y:'12px', delay:'40ms' }}"
```
Effect: New panel fades in and slides up 12px on tab switch (uses existing `mainAnimations`).
Reduced-motion fallback: Angular's animation system respects CSS `prefers-reduced-motion`; additionally our SCSS `transition: none / animation: none` covers all sub-animations.

### 3. Tab Button Press Micro-Interaction
```scss
.cp-subtab-btn:active {
  transform: scale(0.97);
  transition: transform .08s ease;
}
```
Effect: Subtle scale-down on press (haptics analog for desktop/tablet).
Reduced-motion fallback: `transform: none; transition: none`.

### 4. Field Focus Glow
Inherited from existing Bootstrap `.form-control:focus` + existing SCSS in `company-details-form.component.scss`. No new focus glow added in this version (existing is sufficient).

### 5. Empty State Reveal
```scss
@keyframes cp-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cp-empty-state--reveal {
  animation: cp-reveal .35s ease both;
}
```
Effect: Empty state sections gently fade and slide up into view.
Reduced-motion fallback: `animation: none` → appears immediately.

### 6. Skeleton Shimmer Loading
```scss
@keyframes cp-skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.cp-skeleton {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  animation: cp-skeleton-shimmer 1.5s infinite ease-in-out;
}
```
Effect: Wave-shimmer on loading placeholders for Brand/Benefits tabs.
Reduced-motion fallback: `animation: none` → static grey blocks.

### 7. Inline Link Hover
```scss
.cp-inline-link:hover { color: darken($cp-tab-active, 10%); }
```
Effect: Subtle color darken on hover.
Reduced-motion: Not animation, just color change — always safe.

## Haptic Notes
No `navigator.vibrate()` calls added (desktop employer panel, not mobile-first). Tab press micro-scale serves as the haptic analog.

## Reduced-Motion Master Override (in component SCSS)
```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```
This covers ALL of the above effects within the component scope.
