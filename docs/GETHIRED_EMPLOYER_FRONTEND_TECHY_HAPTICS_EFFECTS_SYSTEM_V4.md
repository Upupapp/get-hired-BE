# GETHIRED EMPLOYER FRONTEND HAPTICS AND EFFECTS SYSTEM V4

**Document:** 25 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference

---

## 1. Overview

The GetHired employer frontend uses a layered effects system combining haptic feedback (mobile), CSS micro-interactions, Angular animation triggers, skeleton loaders, and brand visual assets. This document inventories every confirmed effect.

---

## 2. HapticFeedbackService

**File:** `get-hired-FE/src/app/` (service, exact path to be confirmed by Glob if needed)  
**Purpose:** Provides haptic feedback on mobile devices; no-ops gracefully on desktop

### Implemented Methods

| Method | Trigger Intent | UX Purpose |
|---|---|---|
| `selection()` | Tap on a selectable item | Soft selection confirmation |
| `press()` | Long-press or hold interaction | Indicates a press-hold action |
| `success()` | Completion of a positive action | Positive reinforcement |
| `warning()` | Non-blocking warning state | Gentle alert without alarm |
| `error()` | Failure / error state | Clear error signal |
| `uploadComplete()` | File upload finished | Upload confirmation |
| `scanComplete()` | Scan / parse operation finished | Processing completion |
| `actionComplete()` | Generic action resolved | General completion |
| `applicationSubmitted()` | Applicant submits application | High-value completion moment |
| `jobPublished()` | Employer publishes a job | High-value employer milestone |

All methods are available for injection into any component. Current wiring status in employer panel components should be verified component-by-component; the service itself is fully defined.

---

## 3. CSS Micro-Interactions

### .gh-pressable Class

**Purpose:** Applies a micro-scale press animation to interactive elements  
**Intended behavior:** On `:active` / tap, the element scales down slightly (e.g., `scale(0.97)`) to simulate a physical button press  
**Status:** Class is present on elements in the codebase; CSS implementation should be confirmed in the component SCSS or global styles  
**Reduced-motion:** Must be suppressed under `prefers-reduced-motion: reduce` (see Section 7)

### portal-usp-card Hover

**Component:** Public employer landing page, USP (unique selling proposition) section  
**Effect:** CSS hover state applying lift/shadow/scale  
**Status:** CSS implemented  
**Reduced-motion:** Scale transform should be suppressed; opacity/color change can remain

### Employer Portal Hero

**Effect:** Gradient mesh background, glow elements around hero section  
**Status:** CSS implemented  
**Reduced-motion:** Animated glow pulsing (if any) should be suppressed; static gradient can remain

### Mockup Animation

**Component:** Employer portal / landing  
**Effect:** Animated mockup graphic (entry or float animation)  
**Status:** CSS/Angular animation  
**Reduced-motion:** Float or bounce should be suppressed; static display of mockup is acceptable

---

## 4. Angular Animation Triggers

### mainAnimations

**File:** `get-hired-FE/src/app/shared/animations/main-animations.ts` (imported as `mainAnimations`)  
**Used in:** Multiple components including `employer-sidebar.component.ts`, `company-not-setup.component.ts`, `job-create.component.ts`

#### @animate Trigger

- **Purpose:** Entry animation for page-level elements and panels
- **Behavior:** Typically a fade-in + translate-in sequence on component or section entry
- **Reduced-motion gap:** No `prefers-reduced-motion` media query wrap confirmed in `main-animations.ts`

#### @fadeInOut Trigger

- **Purpose:** State transition between visible/hidden states (e.g., loading vs content, error vs content)
- **Behavior:** Fade in / fade out between named states

### Known Gap: No prefers-reduced-motion in main-animations.ts

The `@animate` and `@fadeInOut` triggers do not currently include a `prefers-reduced-motion: reduce` override. Users who have requested reduced motion in their OS settings will still receive the full animations.

**Resolution (backlog B08):** Add the following to `motion.scss` or to the relevant component SCSS:

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This approach does not require modifying `main-animations.ts` directly but suppresses all CSS transitions and short-circuits CSS animations for users who opt out.

For Angular-specific animations (which run via JavaScript, not CSS), the fix requires checking `Window.matchMedia('(prefers-reduced-motion: reduce)')` and conditionally skipping animation params.

---

## 5. Skeleton Loaders

### emp-dash-* Skeleton Classes

**Component:** `company-dashboard`  
**Purpose:** Show placeholder skeleton UI while dashboard data is loading  
**Implementation:** CSS classes prefixed `emp-dash-*` applying shimmer / pulse animation to placeholder shapes  
**Reduced-motion:** Shimmer/pulse animation should be suppressed; static placeholder color is acceptable

### Message Thread Loading

- Loading state for thread open not confirmed as a skeleton; may be a spinner or empty render

---

## 6. Brand Visual Assets

**Location:** `get-hired-FE/src/assets/brand/gethired-wow/`  
**Format:** SVG files  
**Usage:** Decorative brand illustrations used in employer portal and panel  
**Effect:** Static or lightly animated SVGs integrated into hero/dashboard sections  
**Reduced-motion:** Any SVG `<animate>` or CSS animation on these assets should be suppressed under `prefers-reduced-motion: reduce`

---

## 7. Full Effects Inventory by Component

| Component | Effect | Type | UX Purpose | Reduced-Motion Safe? |
|---|---|---|---|---|
| `employer-sidebar` | `@animate` entry | Angular animation | Sidebar slides/fades in | No (gap: B08) |
| `company-dashboard` | `emp-dash-*` skeletons | CSS | Loading placeholder | No (shimmer should stop) |
| `company-dashboard` | Dashboard hero gradient mesh | CSS | Premium feel, focus | Yes (static) |
| `company-not-setup` | `@animate` entry | Angular animation | Dialog fade in | No (gap: B08) |
| `job-create` | `@animate` step transitions | Angular animation | Step-change entry | No (gap: B08) |
| Employer portal | `@fadeInOut` | Angular animation | Section show/hide | No (gap: B08) |
| Employer portal | Hero glow | CSS | Visual depth | Partial |
| Employer portal | Mockup animation | CSS/Angular | Hero visual engagement | No (gap: B08) |
| Employer portal | USP card hover | CSS | Interaction feedback | Partial (scale to remove) |
| Interactive buttons | `.gh-pressable` | CSS | Press micro-scale | No (scale to remove) |
| Brand assets | SVG illustrations | SVG/CSS | Brand presence | Partial |
| Any HapticFeedbackService call | Haptic vibration | Native API | Tactile confirmation | N/A (device-side) |

---

## 8. Reduced-Motion Design Rule

When `prefers-reduced-motion: reduce` is active:

- Remove: transforms (scale, translate, rotate) on interactive elements
- Remove: bounce, float, pulse, shimmer, wave animations
- Remove: long enter/exit transitions (> 100ms)
- Keep: state changes (visible/hidden) via instant opacity toggle or display
- Keep: text-based feedback (success copy, error copy, status icons)
- Keep: color changes indicating state
- Keep: haptic feedback (separate channel, not motion)

---

## 9. Prohibited Effects

- No infinite animation loops except loading skeleton shimmers (which must pause under reduced-motion)
- No fake real-time effects (e.g., fake "user is typing" indicators, fake view counters incrementing)
- No motion that could trigger vestibular disorders (rapid flashing, spinning, parallax without opt-in)
- No animation that obscures or delays critical information (error messages, form validation)
