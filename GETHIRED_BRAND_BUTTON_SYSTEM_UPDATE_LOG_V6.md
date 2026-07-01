# GETHIRED BRAND BUTTON SYSTEM UPDATE LOG V6
**Date:** 2026-07-01

---

## Button System Overview (Canonical Reference)

### Global Primary Button (`.btn-primary`)
```scss
// From styles.scss
background: linear-gradient(135deg, #FF7062 0%, #FF3D6E 100%);
border-radius: 7px;
font-weight: 500;
font-size: 14px;
line-height: 27px;
min-height: 44px;
color: #FFFFFF;
border: none;
padding: 7px 20px;

&:hover {
  opacity: 0.88;
  outline: 2px solid rgba(255, 112, 98, 0.72);
  outline-offset: 3px;
}
```

**Hover ring rule (Phase 24 — mandatory):** `outline: 2px solid rgba(255,112,98,0.72); outline-offset: 3px` on hover via `@media (hover: hover)` in styles.scss.

---

## V6 New Button Variants

### LinkedIn Button (`.gh-linkedin-btn`)
| Property | Value | Notes |
|---|---|---|
| Background | `#0A66C2` | LinkedIn brand — acceptable deviation |
| Hover background | `#004182` | LinkedIn brand |
| Active background | `#003771` | LinkedIn brand |
| Border-radius | `4px` | LinkedIn spec — documented deviation |
| Font-weight | `500` | LinkedIn spec — documented deviation |
| Height | `44px` | Fixed from 40px (FIX-001) |
| Global hover ring | NOT APPLIED | `.gh-linkedin-btn` not `.btn-primary`; own hover style |
| Focus ring | White ring + LinkedIn blue shadow | On LinkedIn blue bg — more accessible than coral |
| Reduced motion | GUARDED | `:active` transform wrapped in `prefers-reduced-motion: no-preference` |

### LinkedIn Retry Button (`.li-complete-retry-btn`)
| Property | Value | Notes |
|---|---|---|
| Background | `#FF675D` | Brand coral (FIX-005) |
| Hover | `#F25248` + coral box-shadow | Brand hover pattern |
| Border-radius | `10px` | Brand input/button radius |
| Font-weight | `600` | Brand standard (FIX-005) |
| Min-height | `44px` | Touch target (pre-existing) |
| Focus ring | `rgba(255,112,98,0.72)` coral | Brand standard |
| Global hover ring | NOT APPLICABLE | Not `.btn-primary` class |

### Setup Modal Primary (`.gh-setup-modal__btn--primary`)
| Property | Value | Notes |
|---|---|---|
| Background | `#FF5A36` (flat coral) | DOCUMENTED DEVIATION from gradient |
| Hover | `darken(#FF5A36, 6%)` + shadow | Modal-context hover |
| Active | `scale(0.978)` | Brand press token (≈$gh-scale-press) |
| Border-radius | `12px` | Between btn-radius (10px) and card-radius (18px) |
| Font-weight | `600` | Brand standard ✅ |
| Min-height | `44px` | Touch target ✅ |
| Focus ring | `2px solid #168BFF` | Azure — brand gap (should be coral) |
| Global hover ring | NOT APPLICABLE | Not `.btn-primary` class |
| Contrast | `#fff` on `#FF5A36` = 3.4:1 | WCAG FAIL — TODO A11y-V6-002 |

### Setup Modal Secondary (`.gh-setup-modal__btn--secondary`)
| Property | Value | Notes |
|---|---|---|
| Background | `#0D1024` (aligned to brand navy via FIX-006) | ✅ |
| Hover | `lighten(#0D1024, 8%)` + shadow | ✅ |
| Contrast | `#fff` on `#0D1024` = ~15:1 | WCAG PASS ✅ |

### Setup Modal Tertiary (`.gh-setup-modal__btn--tertiary`)
| Property | Value | Notes |
|---|---|---|
| Background | `#F8F9FF` ghost surface | ✅ |
| Border | `1.5px solid #E5E7EB` | ✅ |
| Hover | `#EEF2FF` + azure border | Uses `$gh-azure (#168BFF)` after fix |
| Hover text color | `$gh-azure (#168BFF)` | Azure brand ✅ |

---

## Global Hover Ring Applicability Matrix

| Button Class | Global Ring Applies? | Own Hover? | Notes |
|---|---|---|---|
| `.btn-primary` | YES | `opacity: 0.88` | Both apply |
| `.gh-linkedin-btn` | NO | `#004182 bg` | Own style |
| `.li-complete-retry-btn` | NO | Coral shadow | Own style |
| `.gh-setup-modal__btn--primary` | NO | `darken` + shadow | Own style |
| `.gh-setup-modal__btn--secondary` | NO | `lighten` + shadow | Own style |
| `.gh-setup-modal__btn--tertiary` | NO | Surface + azure | Own style |
| `.btn-outline-primary` | NO | `$color-global-red-buttons bg` | Own style |

---

## Open Button System Issues

| Issue | Component | Priority |
|---|---|---|
| Modal primary button contrast 3.4:1 (WCAG fail) | Setup modal | P1 |
| Modal primary focus ring uses azure not coral | Setup modal | P2 |
| No `.gh-btn-primary` standardized class (using `.btn-primary`) | Global | P2 |
| LinkedIn button border-radius 4px (documented deviation) | LinkedIn btn | Accepted |
| LinkedIn button font-weight 500 (documented deviation) | LinkedIn btn | Accepted |
