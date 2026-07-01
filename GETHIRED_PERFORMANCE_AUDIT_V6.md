# GETHIRED PERFORMANCE AUDIT V6
**Date:** 2026-07-01 | **Baseline:** V5

---

## §1 Bundle Size Delta — V6 Additions

| Addition | Estimated Size | Bundle Risk |
|---|---|---|
| LinkedInAuthService | ~3 kB | None — plain HTTP + RxJS |
| LinkedInButtonComponent (template + SCSS) | ~2 kB | None — inline SVG, no images |
| LinkedInCompleteComponent (template + SCSS) | ~2 kB | None — no new deps |
| EmployerCompanySetupSuccessModal (template + SCSS) | ~6 kB | None — inline SVGs only |
| **V6 total addition** | **~13 kB** | **None** |

No new npm dependencies introduced in V6.

---

## §2 Network Requests — New in V6

### LinkedIn OAuth flow
- `window.location.href = ${api}/auth/linkedin/start?...` — browser redirect, no additional JS-side request
- `POST /auth/linkedin/complete` — 1 HTTP call during `/linkedin/complete` component init
- `POST /auth/linkedin/choose-role` — 1 HTTP call on role selection (new-user path only)
- No external scripts loaded. No CDN dependencies added.

### Company setup modal
- Modal content is pure HTML/SCSS — no image, no external fetch
- No API calls from the modal itself (data passed via `MAT_DIALOG_DATA`)
- `sessionStorage.setItem('gh_company_setup_success_seen', '1')` — synchronous, negligible

---

## §3 Core Web Vitals Impact

### FCP (First Contentful Paint)
No change from V6. LinkedIn button is inside the auth form which is lazy-loaded (AuthModule uses `RouterModule.forChild()`). Modal only opens post-login. No FCP impact.

### LCP (Largest Contentful Paint)
No change. No new hero images or above-the-fold content.

### CLS (Cumulative Layout Shift)
Modal: opens centered/bottom-sheet — no in-flow content shift. LinkedIn button replaces empty space beneath Google button. CLS not affected.

### INP (Interaction to Next Paint)
LinkedIn button click triggers `window.location.href` assignment (browser redirect) — fast, synchronous. No Angular CD cycle. Spinner in `/linkedin/complete` is a CSS-only animation. No JS-driven layout work.

---

## §4 Lazy Loading Verification

LinkedIn components (button, complete) are declared in `AuthModule` which is loaded via `loadChildren` in `app.routing.module.ts`. AuthModule is **NOT** eagerly loaded — it only loads when the user navigates to `/signin`, `/signup`, or `/linkedin/complete`. Correct.

Company setup success modal is declared in `EmployerSettingsModule` (assumed, based on directory `employer-panel/employer-settings/`). The employer panel is lazy-loaded via `loadChildren`. Correct.

---

## §5 Pre-existing Performance Risks (Unchanged from V5)

| Risk | Est. Size | Status |
|---|---|---|
| chart.js (employer dashboard) | ~600 kB | Deferred — verify lazy |
| jspdf + html2canvas | ~800 kB | Deferred — verify lazy |
| exceljs | ~400 kB | Deferred — verify lazy |
| recordrtc | ~250 kB | Deferred — move to dynamic import |
| ngx-org-chart | ~120 kB | Deferred — employer module only |

These are unchanged from V5. No action taken in V6 (out of scope for LinkedIn/modal delta).

---

## §6 Recommendations

1. **Run bundle stats after V6 deploy**: `ng build --stats-json` then analyze output to confirm V6 additions are within predicted <15 kB.
2. **CSS animation performance**: `gh-pop-in` and `gh-fade-up` in the modal use `transform` + `opacity` — both GPU-composited properties. No layout recalculation. Correct animation property choices.
3. **Spinner**: `li-spin` uses `transform: rotate()` — GPU-composited. Correct.
