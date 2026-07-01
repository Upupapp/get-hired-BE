# GETHIRED CORE WEB VITALS AUDIT V6
**Date:** 2026-07-01 | **Baseline:** V5

---

## §1 Estimated Metrics (Static Analysis)

| Metric | V5 Estimate | V6 Delta | V6 Estimate | Target | Status |
|---|---|---|---|---|---|
| FCP | 1.5–2.5s | None | 1.5–2.5s | <1.8s | Medium risk |
| LCP | 2.0–3.5s | None | 2.0–3.5s | <2.5s | High risk (pre-existing) |
| TTI | 3–4s | +0ms | 3–4s | <3.8s | Medium risk |
| CLS | ~0 | None | ~0 | <0.1 | Low risk |
| INP | 50–150ms | None | 50–150ms | <200ms | Low risk |

All metrics unchanged from V5. V6 code additions do not touch above-the-fold rendering paths.

---

## §2 V6 Specific CWV Analysis

### LinkedIn button (auth pages)
- Auth pages are below-the-fold for authenticated users (never rendered post-login)
- For unauthenticated users, the form column loads first (col-lg-6 order-first on mobile)
- LinkedIn button is near the bottom of the form — not LCP candidate
- Button uses inline SVG path (no image fetch) — no CLS risk

### Company setup modal
- Modal opens post-setup (user interaction required — not an automatic load)
- No LCP impact — modal content is not above-the-fold on page load
- No CLS impact — modal opens in overlay, does not shift page content
- `gh-pop-in` animation (0.45s) and `gh-fade-up` (0.35s) use `transform` + `opacity` — no layout recalculation, no CLS contribution

### LinkedIn complete page (`/linkedin/complete`)
- This is a full-page redirect landing — the spinner appears immediately
- Spinner is pure CSS animation (`border-top-color` rotation)
- Page is minimal HTML — FCP should be ~0.3–0.5s on a fast network (no heavy assets)
- The `POST /auth/linkedin/complete` call resolves server-side; typical latency 200–500ms

---

## §3 CLS Risk Assessment

### Modal animations with `fill-mode: both`
Pre-fix: Elements with `animation: gh-fade-up 0.35s ... both` start at `opacity:0; translateY(10px)`. When the modal opens, there is a short window where these elements are invisible. This is **not** a CLS issue (modal is in an overlay, not in document flow) but it IS a visual flash risk for `prefers-reduced-motion` users.

Post-fix: Reduced-motion override sets `opacity:1; transform:none; animation:none` — elements appear immediately with no shift.

---

## §4 Blocking Resources

### New in V6
None. No new `<script>` or `<link rel="stylesheet">` in index.html.

### Pre-existing (unchanged)
- Bootstrap 5.2 script (render-blocking if not deferred): `defer` attribute present — acceptable
- Google Maps JS API: `defer` present — acceptable
- Google Fonts: `preconnect` hints present — acceptable
- GIS (Google Identity Services): `async defer` — correct, non-blocking

---

## §5 Recommendations

1. **Real CWV measurement**: Use Chrome DevTools Performance panel on `/signin` with network throttling (Slow 3G) to get a real FCP/LCP reading. The estimates here are based on static analysis.
2. **LCP candidate on auth pages**: Likely the text heading "Welcome back to GetHired" — no image LCP risk.
3. **LCP on home page**: Hero image is the likely LCP candidate — V5 identified this as High risk. Adding `loading="eager"` and `fetchpriority="high"` to the hero image would help (out of scope for V6).
