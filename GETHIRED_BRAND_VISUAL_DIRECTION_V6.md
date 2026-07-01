# GETHIRED BRAND VISUAL DIRECTION V6
**Date:** 2026-07-01 | **Baseline:** V5

---

## Brand Promise
"Every state gives clear, modern feedback. Every movement has a purpose."

## Personality
**Modern · Techy · Precise · Clean · Trustworthy · Premium-not-flashy**
NOT: childish, gimmicky, noisy, slow, over-animated, manipulative, fake-AI

---

## Core Visual System

### Primary Gradient (CTA Identity)
```css
background: linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%);
```
Used on: primary CTAs, active nav indicators, progress fills.
NOT on: modals backgrounds, error states, badges.

### Deep Navy (Authority/Trust)
`#0D1024` — Sidebar, modal secondary CTAs, headings on light surfaces.
Note: Company setup modal uses `#0D1B4B` — slightly bluer. V6 flags this for alignment.

### Azure (Intelligence/Highlight)
`#168BFF` — analytics numbers, data callouts, skill match scores.
Not for: primary CTAs, error states.
V6 new surface: modal uses `#2563EB` for company name highlight — flag for tokenization.

### Success Green
`#10B981` — check icons, completed states, success badges. ✅ Consistent V6.

### Amber
`#F59E0B` — trial badge, warning badges. ✅ Consistent V6.

---

## Third-Party Auth Button Visual Rules

### Google Button
- Appearance: controlled by GIS (white, Google logo). Do not override.
- Wrapper: 44px min-height, brand-radius container. ✅

### LinkedIn Button
- Color: LinkedIn `#0A66C2` / hover `#004182`. Acceptable brand deviation.
- Height: **must be 44px** (V6 fix). Currently 40px — WCAG fail.
- Border-radius: `4px` (LinkedIn's spec). Acceptable deviation, document.
- Focus ring: coral `rgba(255,112,98,0.72)` outline on focus-visible.

---

## Modal Visual Language

### Shell
- Radius: `18px` (`$gh-radius`) ✅
- Background: `#fff` ✅
- Centered, max-width `480px`, responsive mobile padding ✅

### Check/Success Icon
- Size: `72px x 72px` with `drop-shadow(0 4px 16px rgba(16,185,129,0.22))` ✅
- Confetti ring: `gh-pop-in` spring entrance. ✅

### Eyebrow Text
- 12px, 600 weight, letter-spacing `0.08em`, text-transform uppercase, color `$gh-success`. ✅
- Uses `--gh-tracking-eyebrow: 0.08em` token value (not the var() itself, but matches). ✅

### Title
- 24px, 700 weight, line-height 1.3, color navy. ✅
- Company name highlight: `#2563EB` — flag for token alignment to `#168BFF`.

### CTA Stack (Primary → Secondary → Tertiary)
- Primary: `#FF5A36` flat — acceptable modal variant; document as intentional.
- Secondary: `#0D1B4B` navy — align navy to `#0D1024`.
- Tertiary: `$gh-surface` ghost — ✅.

---

## V6 Settled Decisions

| Decision | Rationale |
|---|---|
| LinkedIn `#0A66C2` kept | Third-party auth brand compliance |
| `border-radius: 4px` on LinkedIn button | LinkedIn's spec; document departure |
| `font-weight: 500` on LinkedIn button | LinkedIn's spec; document departure |
| Flat coral `#FF5A36` on modal primary | Modal context; gradient is overkill for dialog; acceptable |
| Dialog departs from gh-form-card | Dialog ≠ settings form; larger padding intentional |
