# GETHIRED BRAND — BACKLOG (RECENT 3)
**Date:** 2026-06-26
**Scope:** Carry-forward deferred items from all 3 BRAND audit rounds + new items from this session.

---

## Priority Legend
- **P1** — Blocks WCAG AA conformance or causes visible brand regression; fix before next major release
- **P2** — Notable UX / accessibility gap; fix in next brand sprint
- **P3** — Low-impact cleanup; fix when touching the file
- **P4** — Enhancement; consider for roadmap

---

## Active Backlog

| ID | File | Issue | Priority | Source |
|---|---|---|---|---|
| BR-01 | `styles.scss` + `colors.scss` | `.success-snackbar`, `.danger-snackbar`, `.error-snackbar` brand coral contrast vs white = ~2.7:1 (WCAG AA requires 4.5:1) | P1 | All audit rounds |
| BR-02 | `src/app/shared/components/inline-loading/` | `<img>` (camera.gif) has no `alt` attribute | P2 | V5 + RECENT_3 |
| BR-03 | `src/app/shared/components/inline-loading/` | camera.gif loops regardless of `prefers-reduced-motion: reduce` — cannot suppress with CSS alone; requires CSS-spinner replacement | P2 | V5 + RECENT_3 |
| BR-04 | `job-posts-details.component.html` | Share icon `<img>` with `(click)` handler has no semantic role, no focus, no accessible label | P2 | RECENT_3 |
| BR-05 | `_portal-common.scss` | `.btn-cta-primary` has no explicit `focus-visible` brand ring — relies on browser default | P3 | V5 |
| BR-06 | `job-posts-details.component.html` | "Browse all jobs" error CTA uses Bootstrap `.btn-outline-secondary` — not brand-tokenized | P3 | V5 |
| BR-07 | `job-posts-details.component.scss` | `#interview-list` hover transitions use hardcoded `0.3s`/`0.8s` with no `prefers-reduced-motion` guard | P3 | V5 |
| BR-08 | `job-posts-details.component.scss` | `.gh-job-skeleton` is defined but not rendered in the template (spinner used instead) | P4 | RECENT_3 |
| BR-09 | Various component SCSS | `$color-teal-accent` / `#2dd4bf` literal used instead of token in some places | P3 | V5 |
| BR-10 | `styles.scss` | Breadcrumb link/text colors (`#6b7280`, `#374151`) are literals — no `$color-text-muted` token in `colors.scss` | P3 | V5 |
| BR-11 | `index.html` | Manrope/DM Sans/Poppins loaded from Google Fonts CDN — no self-hosted fallback for CDN outage | P3 | All rounds |
| BR-12 | `src/app/shared/animations/main-animations.ts` | `@animate` BrowserAnimationsModule timing not audited for `prefers-reduced-motion` compliance | P2 | RECENT_3 |
| BR-13 | Various | `.portal-jobs-fallback` section — no retry CTA for network-level errors (as opposed to empty data) | P4 | RECENT_3 |
| BR-14 | Job detail | No "taking longer than expected" message after ~15s load timeout | P4 | RECENT_3 |

---

## Closed Items (Fixed in This or Prior Sessions)

| ID | Issue | Session fixed |
|---|---|---|
| FIXED-01 | `.warning-snackbar` hardcoded `#f59e0b` amber contrast 2.15:1 | RECENT_DEPLOYMENT_REPORT |
| FIXED-02 | Breadcrumb `ease-out` raw string → `$motion-ease-decelerate` token | V5 |
| FIXED-03 | `.gh-breadcrumb-nav` missing from `prefers-reduced-motion: reduce` block | V5 |
| FIXED-04 | `btn-cta-primary` hover `translateY` unguarded under reduced motion | V5 |
| FIXED-05 | `portal-usp-card` hover unguarded under reduced motion | V5 |
| FIXED-06 | `seeker-mock-card` hover unguarded under reduced motion | V5 |
| FIXED-07 | `index.html` static `og:image` pointing to `logo.png` despite branded image existing | RECENT_3 (this session) |
