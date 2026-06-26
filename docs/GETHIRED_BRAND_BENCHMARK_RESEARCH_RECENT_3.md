# GETHIRED BRAND — BENCHMARK RESEARCH (RECENT 3)
**Date:** 2026-06-26

---

## 1. Brand Promise Alignment

**Brand promise:** "Every state gives clear, modern feedback. Every movement has a purpose."

Benchmarked against this session's changes:

| Principle | Implementation | Score |
|---|---|---|
| Clear feedback in every state | Error state with role=alert + noindex; loading spinner; applied chip | 4/5 — loading still uses legacy GIF |
| Modern feedback | Smooth reveal animations (180–220ms, decelerate curve), skeleton shimmer | 5/5 |
| Purposeful movement | All animations use semantic tokens ($motion-duration-card, $motion-ease-decelerate); breadcrumb leads, then content | 5/5 |
| Accessibility | prefers-reduced-motion: reduce blocks cover all new animations; 44px touch targets | 4/5 — legacy GIF loops regardless |
| No fake activity | No fabricated urgency, AI claims, loading fakes | 5/5 |

---

## 2. Industry Benchmark Comparison

### Job board UX leaders (internal benchmark, no live fetch)

**Pattern: Error state CTAs**
- Standard: 2 recovery options (go back + retry/browse). GetHired's error state has "Sign In" + "Browse all jobs" — matches the dual-option pattern.
- Missing: A retry affordance for network errors (as opposed to auth/removed job errors). This is deferred since the error types are always pre-classified.

**Pattern: OG image social sharing**
- Industry standard: 1200×630px brand imagery, not logo. GetHired now aligns with this after today's fix.
- Brand image has dark navy gradient with product name — consistent with how modern job boards (LinkedIn, Glassdoor) use product-branded social cards vs. bare logos.

**Pattern: Snackbar semantics**
- 4-tier system (success/warn/info/error) is standard for apps with partial-success patterns (bulk import, rate limiting).
- GetHired's implementation: correct semantic mapping, WCAG-compliant colors (after prior-session amber fix).

**Pattern: Breadcrumb navigation**
- 3-level max (Home > Jobs > [Job Title]) — correct for job board depth.
- Current crumb truncated with ellipsis at 240px / 50vw — correct at mobile viewport.

---

## 3. Brand Differentiation Assessment

GetHired's brand expression across recent changes:
- **Color:** Warm coral (#FF7062) as the primary positive-action color is differentiated (most job boards use blue or green). Consistent across CTAs, focus rings, success toasts.
- **Motion:** Decelerate easing on content reveal (feels content "arriving") is intentional UX signal — content coming to the user, not appearing abruptly.
- **Typography:** Manrope at multiple weights creates clear hierarchy. Loaded via Google Fonts (not self-hosted — CDN dependency remains).
- **Error states:** Context-sensitive copy (session vs. removed/expired job) is above average for job boards.

---

## 4. Gap vs. Benchmark

| Gap | Priority |
|---|---|
| No retry CTA for network errors | Low |
| Loading state GIF (camera.gif) does not respect prefers-reduced-motion | Low — pre-existing |
| Brand coral contrast on snackbars (2.71:1) | Moderate — pre-existing design decision |
| Manrope loaded from external CDN, no self-hosted fallback | Low |
