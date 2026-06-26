# GETHIRED BRAND — OFFLINE / DEGRADED SYSTEM (RECENT 3)
**Date:** 2026-06-26

---

## 1. Current Offline Coverage

### What exists
- **HTTP error interception:** `unauthorize.interceptor.ts` catches 429 (rate limit) and shows `.warn-snackbar`.
- **Job detail error state:** catches any API failure on the job fetch including network errors — shows "This job isn't available" with Browse CTAs. This is not specifically branded as an offline state but functionally handles it.
- **No Service Worker / PWA shell:** GetHired is not a PWA. No offline cache, no background sync, no offline page route.

### Gap summary
Full offline experience is out of scope for this audit cycle. The app is not a PWA and no offline-specific brand treatment is required at this stage.

---

## 2. Degraded State Coverage

### API latency / slow response
- User sees `<app-inline-loading>` indefinitely until response arrives or times out.
- No timeout UI or "taking longer than expected" message.
- Gap: Medium — long loads get no secondary feedback.

### Session expiry while viewing job
- `job-posts-details.component.ts` handles this: `jobError$` receives "Unable to load this job for the current session." which triggers the "Session required" branch with a "Sign In" CTA.
- This is correct and branded.

### Rate limiting (429)
- `unauthorize.interceptor.ts` catches 429 and shows `.warn-snackbar` (amber #b45309, 5.02:1 contrast — WCAG AA pass).
- No retry countdown or automatic retry. Informational only.
- Assessment: Adequate for current scale.

---

## 3. Recommendations (Deferred)

| ID | Recommendation | Priority |
|---|---|---|
| OF1 | Add timeout fallback (15–20s) on job fetch with "Taking longer than expected — check your connection" | Low |
| OF2 | Consider Service Worker shell for PWA experience | Low |
| OF3 | Retry button on 429 snackbar (countdown timer) | Low |
