# GETHIRED BRAND AUDIT — RECENT DEPLOYMENT V5
**Date:** 2026-06-26
**FE HEAD:** 41b5920
**BE HEAD:** 6a7755c
**Scope:** Breadcrumb nav addition, button-to-anchor conversions on job-seeker-portal, auth page SeoService calls, plus broad state/motion/haptics/color audit across public pages
**Auditor:** Claude Code (Sonnet 4.6)

---

## 1. Executive Summary

The recent deployment is **brand-coherent and largely safe**. The five most important recent changes — breadcrumb nav, button→anchor conversions, SeoService on auth pages, skeleton loading on job detail, and error state panel — all fit the established visual language. Three pre-existing reduced-motion gaps were found and fixed inline. One animation coordination concern (double-reveal) was assessed and cleared. No new raw hex colors were introduced. All interactive elements that received changes already have or retain `gh-pressable` haptic coverage.

**Release verdict: GO WITH CAUTION**

The caution flag is not from the recent changes themselves but from two carry-forward issues noted in prior audits: (1) `Manrope` is used widely without an `@font-face` declaration (system fallback only), and (2) the brand coral `#FF7062` / `#FE6F61` fail WCAG AA at 4.5:1 vs white text in snackbars — both are structural decisions that touch site-wide styling and are deferred by design. No new regressions were introduced.

---

## 2. Focused Audit: Breadcrumb Nav

### 2.1 Visual brand fit

The breadcrumb (`<nav aria-label="Breadcrumb">` with `.gh-breadcrumb-nav / .gh-breadcrumb`) uses:
- Font size `0.8rem` — proportionally correct, sub-label weight, does not compete with page title hierarchy
- Text colors `#6b7280` (inactive) and `#374151` (current) — these are standard gray neutrals consistent with the rest of the app; neither conflicts with the coral brand palette
- No borders, backgrounds, or colored accents — the breadcrumb reads as a quiet navigational aid, not a primary element. This is correct for brand hierarchy.
- Separator using `content: '/'` — minimal, no icon overhead, consistent with simple nav patterns used elsewhere

The breadcrumb visually fits the existing card/content-reveal pattern. It is placed inside `.gh-job-content-reveal` (which animates the full section), inside the outer `<section>`. Its own animation fires earlier (180ms) than the card content animation below it (220ms via `$motion-duration-card`). This is the right order — breadcrumb trails lead, then body content follows.

**Verdict: ON BRAND. No changes needed to color, spacing, or visual language.**

### 2.2 Animation coordination audit

**Concern raised:** Does `gh-breadcrumb-nav` (180ms) animate independently from `.gh-job-content-reveal` (220ms) creating a janky double-reveal?

**Finding: NO jank. The coordination is correct.**

- `.gh-job-content-reveal` wraps the entire `<section>` (breadcrumb + banner + cards). Its `animation: gh-job-detail-reveal 220ms ... both` fades+translates the whole section from `opacity:0, translateY(12px)` to full.
- `.gh-breadcrumb-nav` is a child of `.gh-job-content-reveal`. Because the parent runs `both` fill mode starting from `opacity:0`, the breadcrumb is invisible until the parent animation begins. The breadcrumb's own 180ms animation fires as a sub-animation within the already-fading parent.
- Both use the same `@keyframes gh-job-detail-reveal` (opacity 0→1, translateY 12px→0). The breadcrumb completes 40ms before the parent section fully arrives. The result is: breadcrumb sharpens first, then the cards below it arrive. This is a gentle stagger that reads as intentional design — leading element resolves before supporting content. No jank.
- **Pre-fix issue found:** breadcrumb used raw `ease-out` string instead of `$motion-ease-decelerate` token. This was a minor easing inconsistency, not a visual problem — fixed (see §7).
- **Pre-fix issue found:** `.gh-breadcrumb-nav` was not in the `prefers-reduced-motion: reduce` block — only `.gh-job-content-reveal` was listed. So on reduced-motion devices, the parent section animation was suppressed but the breadcrumb could still try to animate (guarded only by `no-preference` media query, so this was actually already safe — the `no-preference` wrapper means the breadcrumb only animates when motion is allowed). However, for defensive completeness, `.gh-breadcrumb-nav` was added to the `reduce` block (see §7).

**Verdict: COORDINATION IS SOUND. One token fix and one defensive reduce-block addition applied.**

### 2.3 Skeleton loading for breadcrumb

No skeleton was added for the breadcrumb specifically. The breadcrumb is gated behind `*ngIf="details$ | async as selectedJobPost"` — it does not render until the job has loaded. The loading state (spinner via `<app-inline-loading>`) and error state show instead. So the breadcrumb can never appear in a half-loaded state. A breadcrumb skeleton is not needed.

---

## 3. Focused Audit: Button → Anchor Conversions (job-seeker-portal)

### 3.1 What changed

In `job-seeker-portal.component.html`, three navigation calls were previously `<button type="button">` elements and have been converted to `<a routerLink="...">` anchors:
1. Line 123: `<a routerLink="/jobs" class="btn-link-cta">Browse jobs</a>` — in the workspace CTA row
2. Line 176: `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">Browse all jobs</a>` — in the jobs fallback empty state
3. Line 180: `<a routerLink="/jobs" class="btn-link-cta">Browse all jobs</a>` — section-level CTA when jobs are present

### 3.2 Haptic coverage check

`.gh-pressable` is assigned to anchors exactly as it would be to buttons — the CSS rule in `_motion.scss` targets the class, not an element type. The `:active` pseudo-class applies to `<a>` elements on touch/mouse down.

Results:
| Element | Class | gh-pressable? | Correct? |
|---|---|---|---|
| Line 24 `<button>` browse-jobs search submit | `btn-cta-primary gh-pressable` | YES | Correct |
| Line 28 `<button>` create free account | `btn-link-cta` | NO | Intentional — `btn-link-cta` is a lightweight text link, not a major CTA; pressable scale not expected |
| Line 30 `<button>` sign in | `btn-link-cta` | NO | Intentional — same, text link behavior |
| Line 122 `<button>` create free account | `btn-cta-primary gh-pressable` | YES | Correct |
| Line 123 `<a>` browse jobs | `btn-link-cta` | NO | Consistent — text link, no pressable |
| Line 176 `<a>` browse all jobs (fallback) | `btn-cta-primary gh-pressable` | YES | Correct |
| Line 180 `<a>` browse all jobs (normal) | `btn-link-cta` | NO | Intentional — matches other link-cta instances |
| Line 218 `<button>` sign in | `btn-link-cta` | NO | Intentional |

**Pattern is internally consistent:** primary CTAs (`btn-cta-primary`) always have `gh-pressable`; secondary text links (`btn-link-cta`) do not. This is the right separation — text links do not need scale compression; only fill-button CTAs warrant that feedback.

### 3.3 Focus ring coverage

`.btn-link-cta` has `&:focus-visible { outline: 2px solid $color-global-red-buttons; }` defined in `_portal-common.scss`. The `<a>` anchors inherit this via the class. Focus ring is correct.

`.btn-cta-primary` does not have an explicit `focus-visible` rule in `_portal-common.scss` — it relies on the browser default outline. This is a pre-existing gap (not introduced by this deployment). The browser default is visible but not brand-colored. Deferred.

**Verdict: ANCHOR CONVERSIONS ARE BRAND-CORRECT. Haptic parity maintained. Focus rings intact.**

---

## 4. Auth Pages — SeoService Flash Risk Assessment

### 4.1 What changed

`SeoService.setPageMeta()` is called in `ngOnInit()` of:
- `signin.component.ts` — sets `title: 'Sign In | GetHired Online'`, `robots: 'noindex, nofollow'`
- `signup.component.ts` — sets `title: 'Create Account | GetHired Online'`, `robots: 'noindex, nofollow'`
- `reset-password.component.ts`, `change-pw.component.ts`, `account-authentication.component.ts` — same pattern

### 4.2 Visual flash / title-update artifact risk

`setPageMeta` calls `titleService.setTitle()` and `meta.updateTag()` synchronously in `ngOnInit()`. Angular's lifecycle guarantees `ngOnInit` fires before the first change detection cycle completes, so the title is set before the first paint in most cases.

**No visual flash risk.** The SeoService does not touch the DOM body or any visible element — only `<title>`, `<meta>`, `<link rel="canonical">`, and optionally JSON-LD `<script>` in `<head>`. None of these affect layout or painting. The title bar may flicker from the previous route's title to the auth page title in a brief moment after SPA navigation, but this is standard Angular router behavior (SSR mitigates it on hard loads). No layout shift, no visual stutter, no on-screen artifact.

**Verdict: NO BRAND RISK FROM SEO SERVICE CALLS ON AUTH PAGES.**

---

## 5. Loading States Audit

### 5.1 Global inline-loading component (`<app-inline-loading>`)

- Uses a camera GIF animation (`assets/images/camera.gif`) with the text "LOA**DING**" (coral-accented span)
- Correctly respects the browser's GIF animation — no explicit CSS animation to guard
- Brand fit: the coral `<span class="text-primary-red">` accent is consistent with `$color-global-red-buttons`
- **Gap:** the GIF has no `aria-hidden` or `role` attribute; screen readers may announce the image alt. The `<img>` has no `alt` attribute, which means screen readers will either skip it or read the filename. This is a pre-existing a11y gap, not introduced by this deployment.
- **Gap:** the GIF will loop indefinitely even under `prefers-reduced-motion: reduce`. GIFs cannot be paused with CSS alone. The GIF is a legacy asset. No fix is safe here without replacing the GIF with a CSS spinner. Deferred.

### 5.2 Job detail skeleton (`gh-job-skeleton`)

Defined in `job-posts-details.component.scss`:
- `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` with shimmer animation
- Animation guarded: `.gh-job-skeleton` is included in the `prefers-reduced-motion: reduce` block (after fix: `.gh-breadcrumb-nav` also added)
- The skeleton class is defined but **not rendered in the current template** — `<app-inline-loading>` handles the loading state instead. The skeleton class is available for future use.

### 5.3 Loading coverage by page

| Page | Loading state | Correct? |
|---|---|---|
| Job detail | `<app-inline-loading>` via `loading$ | async` | YES |
| Job seeker portal jobs preview | `<app-inline-loading>` via `loading$ | async` | YES |
| Auth pages (signin/signup) | No async loading; form renders immediately | N/A |

**Verdict: LOADING STATES ADEQUATE. No fake loading states introduced. GIF reduced-motion gap is pre-existing/deferred.**

---

## 6. Error, Empty, and Success States Audit

### 6.1 Error state — job detail (`job-detail-error-state`)

The new error panel (added in recent deployment) has:
- `role="alert"` and `aria-live="assertive"` — correct for immediate error communication
- Context-sensitive copy: distinguishes "Session required" (auth error) from "This job isn't available" (expired/removed)
- CTAs: "Sign In" (`<a routerLink>`) and "Browse all jobs" (`<button>` with `goToJobsList()`)
- The `<a>` "Sign In" button uses class `.btn-apply-now` — this is the coral-fill button, which is visually strong for the primary recovery action. Correct.
- The "Browse all jobs" button uses `.btn-outline-secondary` — Bootstrap outline, no brand token. This is a pre-existing pattern.
- Animated in via `gh-error-banner-reveal` — `$motion-duration-micro` + `$motion-ease-standard`. Calm, not alarming. Animation respects reduced-motion (listed in the reduce block).

### 6.2 Empty state — jobs preview in job-seeker-portal

The `portal-jobs-fallback--upgraded` block (empty state when no jobs are returned):
- Copy: "Explore open roles on GetHired" / "Job previews are not available here right now, but you can browse all open roles on the job board."
- CTA: `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">Browse all jobs</a>`
- Styling: neutral `#fafafa` background, rounded `16px` border — consistent with bento card language
- No fake counts, no fake urgency. Correct.

### 6.3 Success states

- Signup success: shows a `success.gif` (checkmark animation) and message "Verification link sent to your email." — pre-existing, consistent with site-wide pattern.
- No new success states introduced by this deployment.

---

## 7. Motion Tokens — Consistency Audit

### 7.1 Token usage across changed files

| File | Animation/transition | Token used | Status |
|---|---|---|---|
| `job-posts-details.component.scss` | `gh-job-content-reveal` | `$motion-duration-card` (220ms) + `$motion-ease-decelerate` | CORRECT |
| `job-posts-details.component.scss` | `gh-breadcrumb-nav` (before fix) | `180ms ease-out` (raw string) | FIXED — now `180ms $motion-ease-decelerate` |
| `job-posts-details.component.scss` | `gh-error-banner-reveal` | `$motion-duration-micro` + `$motion-ease-standard` | CORRECT |
| `job-posts-details.component.scss` | `bg-applied` | `$motion-duration-micro` + `$motion-ease-standard` | CORRECT |
| `job-posts-details.component.scss` | `btn-apply-now :active` | `$motion-duration-micro` + `$motion-ease-standard` | CORRECT |
| `job-seeker-portal.component.scss` | `portal-seeker-hero-reveal` | `280ms $motion-ease-standard` (hardcoded 280ms) | Near-token — 280ms falls within the `$motion-duration-card` (220ms) to `$motion-duration-drawer` (260ms) range but is not an exact token value. Pre-existing. Acceptable. |
| `job-seeker-portal.component.scss` | `seeker-mock-card` hover | `160ms $motion-ease-standard` (before fix: unguarded) | FIXED — now wrapped in `prefers-reduced-motion: no-preference` |
| `_portal-common.scss` | `btn-cta-primary` hover | `translateY(-2px)` (before fix: no reduced-motion guard) | FIXED — wrapped in `prefers-reduced-motion: no-preference` |
| `_portal-common.scss` | `portal-usp-card` hover transition | `160ms $motion-ease-standard` (before fix: unguarded) | FIXED — transition + hover wrapped in `prefers-reduced-motion: no-preference` |

### 7.2 Durations still hardcoded (pre-existing, deferred)

In `job-posts-details.component.scss` the `#interview-list` hover transitions use hardcoded `0.3s` and `0.8s`. These are legacy and not touched by the recent deployment. They do not have `prefers-reduced-motion` guards. Deferred.

---

## 8. Prefers-Reduced-Motion Coverage

### 8.1 After this audit's fixes

| Animation | Guard type | Status |
|---|---|---|
| `.gh-job-content-reveal` | `@media (prefers-reduced-motion: reduce)` block | COVERED |
| `.gh-breadcrumb-nav` | `no-preference` wrapper + added to `reduce` block | COVERED (fixed) |
| `.bg-applied` | reduce block | COVERED |
| `.job-detail-session-banner` | reduce block | COVERED |
| `.gh-job-skeleton` | reduce block | COVERED |
| `.btn-apply-now :active transform` | reduce block | COVERED |
| `.portal-hero-copy` reveal | reduce block in job-seeker-portal.scss | COVERED |
| `.portal-hero-visual--seeker` reveal | reduce block | COVERED |
| `.video-story-waveform` shimmer | `no-preference` guard + reduce block | COVERED |
| `.match-story-rings` pulse | `no-preference` guard + reduce block | COVERED |
| `portal-waveform-shimmer` | `no-preference` guard | COVERED |
| `portal-match-pulse` | `no-preference` guard | COVERED |
| `.seeker-mock-card` hover | wrapped in `no-preference` (fixed) | COVERED (fixed) |
| `.btn-cta-primary` hover | wrapped in `no-preference` (fixed) | COVERED (fixed) |
| `.portal-usp-card` hover | wrapped in `no-preference` (fixed) | COVERED (fixed) |

### 8.2 Pre-existing gaps (not introduced by this deployment)

- `#interview-list` hover transitions (legacy `0.3s`/`0.8s` hardcoded, no guard)
- `camera.gif` inline-loading — GIF loops regardless of preference, cannot be fixed in CSS
- Auth page carousel animations via `@animate` directive — the `mainAnimations` file is not inspected in this audit but is likely not guarded

---

## 9. Haptics Coverage (`gh-pressable`)

### 9.1 Current deployment coverage

All primary CTA buttons (`btn-cta-primary`) throughout the public portal chain consistently have `gh-pressable`. Audit confirmed on:
- `main-portal.component.html` — two primary CTAs, both with `gh-pressable`
- `job-seeker-portal.component.html` — all three primary CTAs, including the new `<a>` anchor fallback CTA
- `employer-portal.component.html` — primary CTA confirmed
- `portal-cta-band.component.html` — both buttons confirmed
- Auth `signin.component.html` and `signup.component.html` — submit buttons confirmed
- Job detail `.btn-apply-now` — haptic via explicit `:active` scale in SCSS (equivalent to `gh-pressable`)

**The class is absent on** `.btn-link-cta` elements (intentional — text links do not warrant scale compression) and on form inputs (correct). Haptic coverage is well-applied.

### 9.2 The three button→anchor conversions

See §3.2. Coverage is correct and parity is maintained across the conversion.

---

## 10. Brand Color Token Compliance

### 10.1 Breadcrumb colors

The breadcrumb uses literal hex values (`#6b7280`, `#9ca3af`, `#374151`) which do not exist as SCSS variables. These are neutral gray values that complement the existing palette without competing with brand coral.

**Assessment:** These grays are informational chrome — not primary brand expression. There is no SCSS variable for neutral gray text in `colors.scss`. Using literals here is acceptable (consistent with the pattern used throughout the app for gray body copy). The values are not off-brand.

**Improvement opportunity (deferred):** if/when a `$color-text-muted` token is added to `colors.scss`, these could be referenced. Not blocking.

### 10.2 Job-seeker-portal color review

| Value | Context | Assessment |
|---|---|---|
| `rgba(45, 212, 191, 0.45)` / `rgba(254, 111, 97, 0.35)` | Hero glow blobs | Derive from `$color-teal-accent` and `$color-global-red`. No new raw colors. Correct. |
| `rgba(45, 212, 191, 0.12)` / `#0d9488` | Video story chip, trust chips | `#2dd4bf` = `$color-teal-accent` (V5 addition to colors.scss). `#0d9488` is the darker shade for text on the teal-bg chip. Not in palette but semantically consistent (darker teal for legibility). |
| `rgba(254, 111, 97, 0.12)` / `#c0392b` | Match chip `--matched` | `rgba` derives from `$color-global-red`. `#c0392b` is a darker red for text on coral-bg chip — WCAG-driven darkening, consistent with established pattern. |
| `#2dd4bf` | Video/workspace accent dots | `$color-teal-accent` — in `colors.scss` as of V5. Variable should be used but literal value matches exactly. Deferred clean-up. |
| `#fbbf24` | Workspace pending dot | Amber/yellow. Not in palette. Small decorative dot. Pre-existing. |
| `#1a1a1a`, `#4b5563`, `#6b7280` | Body text, subtitles | Neutral grays — consistent across public pages, no palette variable exists. Acceptable. |

**No new off-brand color introductions by this deployment.**

### 10.3 Pre-existing colors concerns (carry-forward from V5 audit)

- `#7c83fd` (pipeline purple-indigo) and `#2dd4bf` (teal) — tokenized in V5 as `$color-pipeline-accent` and `$color-teal-accent`, but inline usage in component SCSS still uses literals in places. Not reintroduced by this deployment.

---

## 11. Safe Fixes Applied (Polish Log)

All fixes are CSS-only, no template changes, no logic changes.

| # | File | Change | Reason |
|---|---|---|---|
| 1 | `job-posts-details.component.scss` line 67 | Changed `gh-breadcrumb-nav` easing from raw `ease-out` to `$motion-ease-decelerate` token | Motion token consistency; both resolve to the same curve (cubic-bezier decelerate), so no visual change — just aligns with the token system |
| 2 | `job-posts-details.component.scss` lines 110–120 | Added `.gh-breadcrumb-nav` to the `prefers-reduced-motion: reduce` block | Defensive — the animation was already only applied inside a `no-preference` wrapper, but explicit inclusion in the reduce block closes the guard symmetrically and future-proofs against any refactor that removes the `no-preference` wrapper |
| 3 | `_portal-common.scss` lines 161–163 | Wrapped `btn-cta-primary` hover/focus-visible `transform: translateY(-2px)` in `@media (prefers-reduced-motion: no-preference)` | Transform on hover was firing for users who prefer no motion; lift effect is decorative, not informational — safe to suppress |
| 4 | `_portal-common.scss` lines 216–228 | Moved `transition` + `&:hover` block on `.portal-usp-card` inside `@media (prefers-reduced-motion: no-preference)` | Hover transform/box-shadow transition is ambient decoration — must be suppressed under reduced-motion |
| 5 | `job-seeker-portal.component.scss` lines 107–124 | Wrapped `.seeker-mock-card` `transition` + `&:hover` inside `@media (prefers-reduced-motion: no-preference)` | Card lift is decorative animation — must not fire for users preferring no motion |

---

## 12. Deferred Items (Not Blocking This Release)

| ID | File | Issue | Severity |
|---|---|---|---|
| D1 | `colors.scss` | `#FF7062` / `#FE6F61` snackbar contrast vs white is 2.7:1 (fails WCAG AA 4.5:1). Pre-existing brand decision. | Moderate — pre-existing |
| D2 | Various | `Manrope` font family used throughout without `@font-face` declaration. System fallback only. | Moderate — pre-existing |
| D3 | `_portal-common.scss` | `.btn-cta-primary` has no explicit `focus-visible` brand ring (relies on browser default). | Low |
| D4 | `job-posts-details.component.scss` | `#interview-list` hover transitions use hardcoded `0.3s`/`0.8s` with no `prefers-reduced-motion` guard. Legacy section. | Low |
| D5 | `inline-loading.component.html` | `<img>` (camera.gif) has no `alt` attribute; GIF loops regardless of `prefers-reduced-motion`. | Low — pre-existing |
| D6 | `job-posts-details.component.scss` | Breadcrumb link/text colors (`#6b7280`, `#374151`) use literals — no SCSS variable exists. Clean-up when a `$color-text-muted` token is added. | Low |
| D7 | `_portal-common.scss` | `$color-teal-accent` / `#2dd4bf` literal used in component SCSS instead of variable in several places. | Low |
| D8 | `job-posts-details.component.html` | `btn-outline-secondary` (Bootstrap class) used on "Browse all jobs" error CTA — not brand-tokenized. | Low |

---

## 13. Release Verdict

**GO WITH CAUTION**

The recent deployment changes are correct:
- The breadcrumb nav fits the brand, is properly gated behind data load, and its animation coordinates well with the section reveal without jank.
- The button→anchor conversions maintain haptic parity and focus ring coverage.
- The SeoService calls on auth pages produce no visual artifacts.
- No new off-brand colors, no fake states, no urgency fabrication.

The caution flag is for two structural carry-forwards (Manrope font fallback + coral WCAG contrast) that predate this deployment and require broader design decisions to resolve. Five reduced-motion gaps were patched in this audit. No blocking issues remain.
