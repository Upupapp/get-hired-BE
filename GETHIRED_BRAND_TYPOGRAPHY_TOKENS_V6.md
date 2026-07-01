# GETHIRED BRAND TYPOGRAPHY TOKENS V6
**Date:** 2026-07-01

---

## Font Stack

**Primary font:** Manrope (all surfaces)
```css
font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
Token: `--gh-font-base`

**Exception:** Google Sign-In button — Roboto (GIS controlled, required by Google)

---

## Type Scale

| Role | Size | Line-height | Weight | Token |
|---|---|---|---|---|
| Display | 36px | 44px | 700 | `--gh-text-display-*` |
| Page heading | 28px | 36px | 700 | `--gh-text-page-*` |
| Section heading | 20px | 28px | 700 | `--gh-text-section-*` |
| Card heading | 16px | 24px | 600 | `--gh-text-card-*` |
| Body | 14px | 22px | 400 | `--gh-text-body-*` |
| Helper | 13px | 20px | 400 | `--gh-text-helper-*` |
| Label/eyebrow | 12px | 16px | 600 | `--gh-text-label-*` |
| KPI number | 32px | 40px | 700 | `--gh-text-kpi-*` |
| Table header | 12px | 16px | 700 | `--gh-text-table-header-*` |
| Table cell | 13px | 20px | 400 | `--gh-text-table-cell-*` |

---

## Letter Spacing Tokens

| Role | Value | Token |
|---|---|---|
| Normal | 0 | `--gh-tracking-normal` |
| Eyebrow (all-caps labels) | 0.08em | `--gh-tracking-eyebrow` |
| Badge | 0.02em | `--gh-tracking-badge` |

---

## Weight Tokens

| Name | Value | Token |
|---|---|---|
| Regular | 400 | `--gh-weight-regular` |
| Medium | 500 | `--gh-weight-medium` |
| Semibold | 600 | `--gh-weight-semibold` |
| Bold | 700 | `--gh-weight-bold` |

---

## V6 New Surface Typography Audit

### LinkedIn Button
```scss
font-size: 14px;    // ✅ matches --gh-text-body-size
font-weight: 500;   // DOCUMENTED DEVIATION — LinkedIn spec; brand is 600 (--gh-weight-semibold)
font-family: inherit; // ✅ inherits Manrope from body
```

### LinkedIn Complete Page
```scss
.li-complete-label { font-size: 15px; }    // MINOR: between body (14px) and card (16px)
.li-complete-error-title { font-size: 20px; font-weight: 600; }  // ✅ matches section heading
.li-complete-error-msg { font-size: 14px; line-height: 1.5; }   // ✅ matches body
.li-complete-retry-btn { font-size: 14px; font-weight: 600; }   // ✅ (updated to 600 in fix)
```
Missing: `font-family: inherit` explicit declaration (inherits from body — acceptable)

### Company Setup Success Modal
```scss
.gh-setup-modal__eyebrow {
  font-size: 12px;         // ✅ label scale
  font-weight: 600;        // ✅ label weight
  letter-spacing: 0.08em;  // ✅ matches --gh-tracking-eyebrow
  text-transform: uppercase;  // ✅ eyebrow convention
}

.gh-setup-modal__title {
  font-size: 24px;    // BETWEEN section (20px) and page (28px) — modal-specific, acceptable
  font-weight: 700;   // ✅ matches bold token
  line-height: 1.3;   // Close to page heading lh (36/28 = 1.28)
}

.gh-setup-modal__checklist-label { font-size: 14px; font-weight: 500; }  // ✅ body weight-medium
.gh-setup-modal__btn { font-size: 14px; font-weight: 600; }               // ✅ button standard
.gh-setup-modal__dashboard-link { font-size: 13px; font-weight: 500; }   // ✅ helper weight-medium
```

---

## V6 Typography Gaps

| Gap | Component | Fix |
|---|---|---|
| Loading label 15px (not a standard token size) | linkedin-complete | Change to 14px |
| Missing explicit font-family on linkedin-complete | linkedin-complete | Low — inherits correctly |
| Modal title 24px (between tokens) | setup-modal | Accept as modal-specific; document |
| font-weight 500 on LinkedIn button | linkedin-button | Accept per LinkedIn spec |

---

## Typography Update Status V6

No new tokens added. All V5 typography tokens unchanged and carry forward to V6. Gaps documented above — no token system changes required.
