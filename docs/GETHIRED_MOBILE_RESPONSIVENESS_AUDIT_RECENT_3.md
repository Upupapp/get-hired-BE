# GETHIRED_MOBILE_RESPONSIVENESS_AUDIT_RECENT_3
## Mobile Responsiveness Audit — OPTIMIZE Round 3
Date: 2026-06-26

---

## SCREENSIZE DEFAULT (SSR)

All components that read `window.innerWidth` now default `screenSize` to `1600` on the server (the wide-layout assumption). This means SSR-rendered HTML uses the wide-layout breakpoint. When the browser hydrates, `ngOnInit` reads the real `window.innerWidth` (guarded with `isPlatformBrowser`), and `@HostListener('window:resize')` tracks subsequent resizes.

**Hydration CLS risk:** The initial SSR render at 1600px width may differ from the hydrated layout on a 375px mobile device — this is the standard Angular Universal mobile hydration gap. It was present before this round's changes and is unchanged by them. The `onResize` handlers will correct the layout on first user interaction. This is a known limitation, not a regression.

Components fixed for `window.innerWidth` SSR safety this round:
- `views/home/pages/job-posts/job-posts.component.ts` (FIX-R3-005)

Previously fixed (V5):
- `jobs/job-posts-list/job-posts-list.component.ts`
- `public/public-list/public-list.component.ts`
- `public/public-search/public-search.component.ts`

---

## MOBILE-SPECIFIC RISKS REMAINING (backlog)

1. **`@HostListener('window:resize')` in `public-details.component.ts`** — `window.innerWidth` read inside @HostListener is browser-only (correct), but `screenSize` defaults to 1600 on SSR. No regression from this round.

2. **Responsive layouts not audited this round** — no template/SCSS changes made. Mobile layout regressions from prior rounds are unchanged.
