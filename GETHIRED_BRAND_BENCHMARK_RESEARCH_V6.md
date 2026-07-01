# GETHIRED BRAND BENCHMARK RESEARCH V6
**Date:** 2026-07-01

---

## Third-Party Auth Button Conventions

### Industry Standards (LinkedIn, Google, Apple)
All major platforms (LinkedIn, Google, Apple, GitHub) specify their own button appearance for OAuth buttons. Key conventions:

| Provider | Required Color | Min Height | Focus | GetHired Compliance |
|---|---|---|---|---|
| Google | White `#FFFFFF` | Provider handles | Managed by GIS | ✅ (GIS manages) |
| LinkedIn | `#0A66C2` blue | Not specified | Not specified | PARTIAL (40px height gap) |
| Apple | `#000000` black | Not specified | Not specified | N/A |

**Benchmark finding:** Even LinkedIn's own documentation does not mandate touch target sizes — this is a platform/accessibility responsibility. GetHired must add `min-height: 44px` regardless of LinkedIn's spec.

---

## Success Modal Benchmarks

### Pattern Analysis — Competitor SaaS Onboarding Modals
Leading SaaS platforms (Notion, Linear, Vercel, Rippling) use:
- **Confetti/celebration animation** on workspace setup complete — industry standard ✅
- **Checklist summary** of what was configured — industry standard ✅
- **Multi-CTA stack** (primary: go to dashboard; secondary: explore feature; tertiary: skip) — industry standard ✅
- **Trial badge** on the completion modal — emerging standard for freemium SaaS ✅

GetHired's modal matches all four patterns.

### Color in Success Modals
- Most premium SaaS tools use their brand color (not a gradient) on the modal primary CTA since the gradient is reserved for page-level marketing CTAs.
- Flat coral `#FF5A36` on modal primary is consistent with this convention.
- **Benchmark verdict:** Flat coral modal CTA is industry-appropriate.

---

## Motion Benchmarks

### Spring Entrance (cubic-bezier 0.34, 1.56, 0.64, 1)
Used by: Linear, Vercel, Notion for celebration/success modals.
This curve overshoots slightly (scale past 1) before settling — adds life without gimmick.
GetHired modal uses it for confetti ring entrance. ✅ On-brand.

### Staggered fade-up
Delay: 0.15s, 0.2s, 0.25s, 0.3s, 0.38s, 0.44s across modal sections.
Industry pattern: 30–50ms stagger per element. GetHired uses 50–80ms. Slightly slower but acceptable for a celebration moment.

---

## Loading Spinner Best Practices

### Branded Spinner
- LinkedIn blue spinner on a GetHired-branded page signals the wrong brand.
- Industry standard: use host app's brand color for the loading indicator, even during third-party auth callback.
- **Benchmark verdict:** Change spinner color to `var(--gh-coral)` or GetHired navy.

### No Skeleton for OAuth Callback
OAuth callback pages are inherently transient (< 2s typical). A spinner is the correct pattern; skeleton screens are for data-loading pages where the structure is known. ✅

---

## Typography Benchmarks

### Auth Page Headlines
Industry standard: 20–28px, 700 weight for major auth moments.
LinkedIn complete page has no dedicated title in loading state (only a label paragraph). Consider adding a 16px "Connecting your account..." heading above the label for branded feel.

---

## Competitive Context

GetHired's brand is positioned between:
- **Workday/SAP** (enterprise, heavy, slow) — GetHired should be noticeably lighter.
- **Indeed/LinkedIn** (utilitarian, not premium) — GetHired should be noticeably more polished.
- **Rippling/Lattice** (premium SaaS) — GetHired should match this tier's polish level.

V6 modal is on par with Rippling-tier modals. Main gap is token consistency and accessibility, not visual design quality.
