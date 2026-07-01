# GETHIRED PERFORMANCE BUDGET PROPOSAL V6
**Date:** 2026-07-01 | **Purpose:** Establish measurable performance targets for ongoing development

---

## §1 Bundle Size Budget

| Chunk | Current (est) | Budget | Action if Exceeded |
|---|---|---|---|
| main.js (initial) | ~800 kB | 600 kB | Move eager imports to lazy |
| polyfills.js | ~120 kB | 120 kB | No action needed |
| styles.css (initial) | ~150 kB | 200 kB | OK |
| Lazy chunk — AuthModule | ~80 kB | 100 kB | OK (LinkedIn +7kB is within budget) |
| Lazy chunk — EmployerPanelModule | ~1.2 MB | 800 kB | Requires chart.js lazy migration |
| Lazy chunk — ApplicantPanelModule | ~900 kB | 600 kB | Requires jspdf/recordrtc lazy migration |

**How to measure:** `ng build --prod --stats-json` then `npx webpack-bundle-analyzer dist/get-hired/stats.json`

---

## §2 Core Web Vitals Budget

| Metric | Current (est) | Target | Threshold |
|---|---|---|---|
| FCP | 1.5–2.5s | <1.8s | Fail >3.0s |
| LCP | 2.0–3.5s | <2.5s | Fail >4.0s |
| CLS | ~0.02 | <0.1 | Fail >0.25 |
| INP | 50–150ms | <200ms | Fail >500ms |
| TTI | 3–4s | <3.8s | Fail >5.0s |

**How to measure:** Chrome DevTools → Lighthouse → Production URL (not localhost)

---

## §3 Network Request Budget (Auth Pages)

| Page | Max HTTP Requests | Max Transfer |
|---|---|---|
| `/signin` | 20 | 400 kB |
| `/signup` | 22 | 450 kB |
| `/linkedin/complete` | 5 | 100 kB |
| `/jobs` | 15 | 300 kB |
| `/jobs/:id` | 10 | 200 kB |

Note: GIS script + Google Maps + Fonts add ~150 kB of third-party requests to all pages.

---

## §4 V6 Specific Additions vs Budget

| Addition | Size | Budget Impact |
|---|---|---|
| LinkedInAuthService | ~3 kB | Well within auth chunk budget |
| LinkedInButtonComponent | ~2 kB | Well within auth chunk budget |
| LinkedInCompleteComponent | ~2 kB | Well within auth chunk budget |
| Modal SCSS | ~8 kB (compiled) | Well within employer chunk budget |
| Modal HTML | ~3 kB | Well within employer chunk budget |

V6 total addition: ~18 kB. Budget not exceeded. No chunk exceeds its budget from V6 changes.

---

## §5 Performance Budget Enforcement

### Build-time check (recommended)
Add to `angular.json` under `configurations.production.budgets`:
```json
{
  "type": "initial",
  "maximumWarning": "700kb",
  "maximumError": "1mb"
},
{
  "type": "anyComponentStyle",
  "maximumWarning": "20kb",
  "maximumError": "50kb"
}
```

### CI/CD check (recommended)
Run Lighthouse CI on every PR targeting main. Fail the build if LCP > 4.0s or CLS > 0.25.

---

## §6 Quick Wins to Meet Budget

1. Lazy-load chart.js in employer dashboard: -600 kB from employer chunk
2. Dynamic import recordrtc on video-recorder route only: -250 kB from applicant chunk
3. Add `loading="lazy"` to below-the-fold images in job listing: -100ms TTI
4. Hero image in auth page: already text-based (no hero image), no action needed
