# GETHIRED BRAND EFFECTS LIBRARY V6
**Date:** 2026-07-01

---

## Shadow System

### Card Shadows
| Level | Value | Use |
|---|---|---|
| Subtle | `0 2px 8px rgba(0,0,0,0.06)` | Dashboard cards, KPI cards |
| Standard | `0 4px 22px rgba(0,0,0,0.07)` | gh-form-card standard |
| Elevated | `0 8px 24px rgba(0,0,0,0.12)` | Card hover state |
| Modal | `0 20px 60px rgba(16,24,40,0.18)` | Modal overlay |
| Dropdown | `0 8px 30px rgba(16,24,40,0.12)` | Menus, dropdowns |

### Button Shadows
| Button | Default Shadow | Hover Shadow |
|---|---|---|
| Primary (gradient) | `0 4px 12px rgba(255,112,98,0.28)` | `0 6px 18px rgba(255,112,98,0.38)` |
| Modal primary (coral flat) | `0 4px 14px rgba(255,90,54,0.30)` | `0 6px 18px rgba(255,90,54,0.38)` |
| Modal secondary (navy) | `0 2px 8px rgba(13,27,75,0.18)` | `0 4px 14px rgba(13,27,75,0.26)` |
| LinkedIn button | `0 1px 3px rgba(0,0,0,0.18)` | `0 2px 6px rgba(0,0,0,0.22)` |

---

## Filter Effects

### Success Icon Drop Shadow
```scss
filter: drop-shadow(0 4px 16px rgba(16, 185, 129, 0.22));
```
Used on: `.gh-setup-modal__check-icon`. ✅ On-brand.

### Gradient Text (Not in use — documented for reference)
```scss
// Reserved for future use — landing page hero text
background: linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

---

## Shimmer Effect

```scss
// Reusable shimmer base
.gh-shimmer-base {
  background: linear-gradient(90deg, #f0edf8 25%, #e6e2f2 50%, #f0edf8 75%);
  background-size: 1600px 100%;
  animation: gh-shimmer-v6 1.4s ease-in-out infinite;
  @include ambient-motion-safe;  // stops under prefers-reduced-motion
}
```

---

## Border Effects

### Form/Card Border (gh-form-card standard)
```
border: 1.5px solid #DDD8F0
```

### Ambient Border (dashboard cards)
```
border: 1px solid #E7EAF3  /* --gh-border */
```

### Trial Badge Border
```
border: 1px solid rgba(245, 158, 11, 0.28)
```

### Focus Ring (brand standard)
```
outline: 2px solid rgba(255, 112, 98, 0.72);
outline-offset: 3px;
```

---

## Gradient Backgrounds

### Primary CTA
```css
background: linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%);
```

### Navy sidebar / secondary
```css
background: linear-gradient(135deg, #0D1024 0%, #211A3D 55%, #311A35 100%);
```

### Azure analytics
```css
background: linear-gradient(135deg, #168BFF 0%, #22D3EE 100%);
```

---

## V6 Effects Audit

| Effect | Surface | Status |
|---|---|---|
| Drop shadow on check icon | Setup modal | ✅ Implemented |
| Button hover shadows | Setup modal | ✅ Implemented |
| LinkedIn button shadow | LinkedIn button | ✅ Implemented |
| Coral focus ring | LinkedIn button | MISSING — global fallback only |
| Spinner border effect | LinkedIn complete | PARTIAL — wrong color |
| Shimmer skeleton | Not used in V6 surfaces | N/A |
