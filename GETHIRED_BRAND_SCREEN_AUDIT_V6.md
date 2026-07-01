# GETHIRED BRAND SCREEN AUDIT V6
**Date:** 2026-07-01

---

## V6 Screens Audited

### 1. LinkedIn Sign-In Button (`/signin`, `/signup`)
**File:** `src/app/auth/linkedin-button/linkedin-button.component.scss`

| Check | Status | Notes |
|---|---|---|
| Touch target ≥ 44px | FAIL | height: 40px — fix required |
| Brand colors used | ACCEPTABLE | LinkedIn blue per brand guidelines |
| Focus ring present | PARTIAL | Global fallback; no component ring |
| Reduced motion | FAIL | :active transform unguarded |
| Font weight | ACCEPTABLE | 500 per LinkedIn spec |
| Border radius | ACCEPTABLE DEVIATION | 4px per LinkedIn spec |
| Hover state | ✅ | Darker LinkedIn blue |
| Active state | ✅ | Scale + darkest blue |
| Disabled state | MISSING | Not styled |
| Alignment with Google button | PARTIAL | Height mismatch |

**Screen score: 5/10** — Functional but accessibility gaps are blocking.

---

### 2. LinkedIn Complete Callback Page (`/auth/linkedin/complete`)
**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.scss`

| Check | Status | Notes |
|---|---|---|
| Loading spinner brand-aligned | FAIL | LinkedIn blue not brand |
| Reduced motion on spinner | FAIL | No guard |
| Error icon color | ✅ | `#ef4444` matches token |
| Error message styling | ✅ | Muted gray, readable |
| Retry button brand-aligned | FAIL | LinkedIn blue, should be coral |
| Retry touch target | FAIL | `padding: 10px 28px` ≠ 44px height |
| Card radius | PARTIAL | 12px vs 18px brand |
| Token usage | FAIL | All raw hex |
| Offline handling | MISSING | Infinite spinner risk |
| Haptics | MISSING | No calls |

**Screen score: 4/10** — Multiple alignment issues. Functional but not on-brand.

---

### 3. Company Setup Success Modal
**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.scss`

| Check | Status | Notes |
|---|---|---|
| Modal radius (18px) | ✅ | $gh-radius = 18px |
| Primary button touch target | ✅ | min-height: 44px |
| Success color (#10B981) | ✅ | Matches token |
| Amber badge (#F59E0B) | ✅ | Matches token |
| Navy color | PARTIAL | #0D1B4B vs token #0D1024 |
| Coral color | ACCEPTABLE DEVIATION | #FF5A36 flat vs gradient; documented |
| Azure color (#2563EB) | FLAG | Not in token system |
| Reduced motion (component level) | MISSING | Global backstop exists |
| Focus rings | PARTIAL | Azure not coral |
| Animations | ✅ | Choreography well-structured |
| gh-form-card compliance | N/A (dialog) | Documented departure |
| Global hover ring applicability | N/A | Modal uses own button classes |
| Haptics | MISSING | No TS calls |
| aria-live / role="status" | NOT IN SCSS | TS/HTML concern |

**Screen score: 7/10** — Strong visual design, token alignment gaps.

---

## Previously Audited Screens (V5 — Spot Check V6)

| Screen | V5 Score | V6 Change | Notes |
|---|---|---|---|
| /signin | 7.5/10 | No change | Google button wrapper ✅; LinkedIn now visible |
| /signup | 7.5/10 | No change | Same as signin |
| /auth/choose-role | 7/10 | No change | V5 gaps still open (selected state, haptics) |
| Dashboard | 8/10 | No change | V5 fixes holding |
| Job listings | 8/10 | No change | V5 fixes holding |

---

## V6 Screen Audit Summary

| Screen | Score | Blocking? |
|---|---|---|
| LinkedIn button | 5/10 | YES (touch target) |
| LinkedIn complete | 4/10 | YES (retry button, spinner) |
| Setup success modal | 7/10 | NO (cosmetic gaps) |

**Total new surface score: 5.3/10** — Below V5 average. LinkedIn surfaces need focused fixes.
