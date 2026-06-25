# GETHIRED_RECRUITER_MOBILE_SIDEBAR_STATES_LOG_V1

## Phase — States / UX States Log
Date: 2026-06-25

---

## Drawer States

| State | Class | Visual | Pointer Events |
|-------|-------|--------|---------------|
| Closed (default) | `gh-mobile-drawer` | translateX(-100%), off-screen | Scrim: pointer-events none |
| Open | `gh-mobile-drawer--open` | translateX(0), visible | Scrim: pointer-events auto |
| Transitioning open | During CSS transition | Sliding in, 260ms | Scrim fading in simultaneously |
| Transitioning closed | During CSS transition | Sliding out, 260ms | Scrim fading out |

---

## Scrim States

| State | Class | Opacity | Pointer Events |
|-------|-------|---------|---------------|
| Hidden | `gh-mobile-scrim` | 0 | none |
| Visible | `gh-mobile-scrim--visible` | 1 | auto |

---

## Hamburger Button States

| State | Visual |
|-------|--------|
| Default | 3 horizontal lines |
| Hover | background rgba(255,255,255,0.1) |
| Focus-visible | 2px brand-red outline |
| Active (press) | scale(0.93) |
| Drawer open | Animated to X (top/bot rotate, mid fade) |

---

## Drawer Nav Item States

| State | Visual |
|-------|--------|
| Default | rgba(255,255,255,0.75) color, transparent left border |
| Hover | rgba(255,255,255,0.07) background, white color |
| Focus-visible | 2px brand-red inset outline |
| Active (press) | scale(0.97), rgba red 10% background |
| Active route | #67627E background, #FF7062 3px left border, white, bold |

---

## Reduced Motion States

All CSS transitions are wrapped with `@include motion-safe`, which resolves to:
```css
@media (prefers-reduced-motion: reduce) {
  transition: none !important;
  animation: none !important;
}
```

Under reduced motion:
- Drawer appears/disappears instantly (no slide)
- Scrim appears/disappears instantly (no fade)
- Hamburger icon changes instantly (no line animation)
- Button/item press effects: no scale transform

Active state (color/background/border) always applies — safe for reduced motion.

---

## Loading State (parent component)

Panel loading state is handled by existing `#panelLoading` template (ngIf on employee$ async).
Mobile top bar and drawer are inside the `*ngIf` section, so they only appear after employee profile loads — consistent with existing pattern.

---

## Status: VERIFIED
