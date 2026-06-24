# GetHired V5 Brand Audit Report

**Date:** 2026-06-24
**Scope:** 9 FE files changed in V5 deployment
**Auditor:** Claude Code automated brand review

---

## Executive Summary

V5 is largely on-brand. The mobile nav bar, onboarding checklist, and employer signup copy all align with GetHired's coral/red primary palette and dark-sidebar employer shell. The biggest systemic issue is **font-family drift**: new V5 components consistently use `Manrope` while the brand font stack (fonts.scss) defines only `Circular-Regular`, `Circular-Book`, and `Uni-Sans-Bold`. `Manrope` is used across V5 without a `@font-face` declaration, relying on system/CDN fallback. A secondary issue is **motion token bypass**: several duration/easing values in the dashboard SCSS are hardcoded instead of using the `$motion-duration-*` / `$motion-ease-*` variables from `_motion.scss`. Color usage is largely correct; the two hardcoded hex instances of `#FF7062` in the mobile nav active/create states should reference `$color-global-red-buttons`. The onboarding checklist introduces two unlisted accent colors (`#7c83fd` purple-indigo, `#2dd4bf` teal) that are used in other parts of the employer dashboard (GH1) but are not in `colors.scss` — these are design-system orphans with no variable to reference. Three safe fixes were applied. Remaining issues are catalogued as deferred recommendations.

**Risk summary:**
- 2 critical: hardcoded `#FF7062` in mobile nav (should be `$color-global-red-buttons`)
- 2 moderate: `Manrope` used without `@font-face`; motion duration tokens bypassed in dashboard
- 3 low: unlisted accent colors, inline `style=` in fallback panel, animation duration outlier
- 0 blocking: no off-brand colors introduced, no accessibility regressions, no missing reduced-motion gates

---

## 1. Color Consistency Findings

### 1.1 Mobile nav bar — `employer-panel.component.scss`

| Location | Value | Finding |
|---|---|---|
| `.gh-mobile-nav` background | `$color-global-sidebar-employer-user-menu` | **Correct.** Variable used. |
| `.gh-mobile-nav-item` color (inactive) | `rgba(255, 255, 255, 0.55)` | Acceptable; no matching variable exists for dimmed-white states. |
| `.gh-mobile-nav-item--active` color | `#FF7062` | **Bug.** Should be `$color-global-red-buttons` (#FF7062 = same value but unlinked). |
| `.gh-mobile-nav-item--create` color | `#FF7062` | **Bug.** Same as above. |
| `.gh-mobile-nav-item--create` background | `rgba(255, 112, 98, 0.15)` | **Bug.** Derived from `#FF7062` but hardcoded; should be `rgba($color-global-red-buttons, 0.15)`. |
| `.gh-mobile-nav-item:focus-visible` outline | `rgba(255, 112, 98, 0.85)` | **Bug.** Same derivation issue. |
| Separator border | `rgba(255, 255, 255, 0.12)` | Acceptable; no variable for separator-on-dark exists. |
| Pre-existing `.sidebar-separator-*` backgrounds | `#333` | Pre-existing. Not introduced by V5. |
| Pre-existing `#body-main-container` background | `#2222` | Pre-existing (invalid 4-digit hex, renders transparent). Not introduced by V5. |

### 1.2 Fallback error panel — `employer-panel.component.html` (inline styles)

| Location | Value | Finding |
|---|---|---|
| Fallback `<p>` color | `#444` inline style | Off-brand; should be `#2D2D2D` (`$color-black`) or `#1a1830`. Also, inline style instead of class. |
| Fallback sign-in link color | `#FF7062` inline style | Correct value but expressed as inline style. Should use a class that references `$color-global-red-buttons`. |

### 1.3 Company dashboard — `company-dashboard.component.scss`

| Location | Value | Finding |
|---|---|---|
| `.emp-dash` background | `#f8f9fb` | Acceptable neutral; no variable exists but color is consistent with `$color-global-sidebar-applicant-gray` (#F6F7FB). |
| `.emp-dash-hero` gradient | `#1a1830`, `#2a2348`, `#1e1b3a` | Established dark purple system (from GH1, not V5-new). Not off-brand. |
| `.emp-dash-hero-eyebrow` | `rgba(254, 111, 97, 0.85)` | Correct derivation from `$color-global-red` (#FE6F61). No variable exists for the alpha form. |
| `.emp-dash-chip` color/border | `#FE6F61` | **Correct.** Matches `$color-global-red`. |
| `.emp-dash-review-initials` gradient | `#7c83fd`, `#2dd4bf` | Unlisted accent (see §1.4). |
| `.emp-dash-review-stage` color/background | `#7c83fd` | Unlisted accent (see §1.4). |
| `.emp-dash-pipeline-bar` background | `rgba(124, 131, 253, 0.5)` | Unlisted accent. |
| Onboarding done-state green | `#04a08b`, `rgba(4, 160, 139, 0.1)` | Matches `$color-green-secondary`. **Correct** (variable should be used but value is exact match). |
| `.emp-dash-onboarding-check` border | `#c5c0d4` | Unlisted neutral. No variable exists for it. |
| `.emp-dash-action-empty` background | `#f3f2f9` | Consistent with existing purple-tinted neutral pattern. No variable. |
| Error state background | `#fff3f2` | Correct semantic red-tint (derived from `$color-global-red`). No variable. |

### 1.4 Unlisted accent colors — design-system orphans

Two colors appear throughout the employer dashboard (pre-existing GH1 components and new V5 onboarding steps) that are **not declared in `colors.scss`**:

- `#7c83fd` — purple-indigo, used as accent for pipeline bars and stage badges
- `#2dd4bf` — teal-green, used in avatar gradient

These are internally consistent (same values used in multiple components) but have no variable, making future theme changes fragile. These predate V5 but V5 reuses them. Deferred to §8.

### 1.5 Signup component — `signup.component.scss`

V5 added only `.gh-signup-subtitle`:
- `color: #6b6887` — exact match to the dashboard's secondary-text color. No variable, but the value is consistent.
- `font-family: 'Manrope', sans-serif` — see Typography section.

---

## 2. Typography Findings

### 2.1 Font family: Manrope used without @font-face

`fonts.scss` declares three faces: `Circular-Regular`, `Circular-Book`, `Uni-Sans-Bold`. `Manrope` is not declared.

V5 components that use `Manrope`:
- `employer-panel.component.scss` line 149: `.gh-mobile-nav-label { font-family: 'Manrope', sans-serif; }`
- `signup.component.scss` line 465: `.gh-signup-subtitle { font-family: 'Manrope', sans-serif; }`
- `employer-panel.component.html` line 83: inline `style="font-family: Manrope, sans-serif;"`

Note: `Manrope` is also used extensively in pre-existing signup component rules (lines 48, 50, 66, 79, 86, etc.), the `main-title`, `title-sub`, etc. — so this is not a V5-introduced regression. V5 followed the existing pattern. The underlying issue is that `Manrope` is presumably loaded from the global styles or via Google Fonts (not visible in the file listing), but it is not in `fonts.scss`. If Manrope stops loading, all of these fall back to `sans-serif`.

**Company dashboard** (`company-dashboard.component.scss`) uses no explicit `font-family` declaration in any of the new V5 rules — it inherits from the panel shell.

### 2.2 Font weights

| Component | Weight | Assessment |
|---|---|---|
| Mobile nav label | `500` | Correct for labels. |
| Dashboard section titles | `700` | Correct for headings. |
| Onboarding step title | `700` | Correct. |
| Onboarding step desc | `12px / inherited 400` | Correct for body/caption. |
| Signup subtitle | `400` (default) | Correct for subtitle. |
| Onboarding CTA button | `600` | Correct for button labels. |

No weight inconsistencies found in V5 additions.

### 2.3 Font sizes

| Element | Size | Brand assessment |
|---|---|---|
| Mobile nav label | `10px` | Appropriate for bottom nav labels (consistent with iOS HIG / Android guidance). |
| Onboarding step title | `14px` | On-brand body/label scale. |
| Onboarding step desc | `12px` | On-brand caption scale. |
| Onboarding done badge | `11px` | Acceptable tag/badge size. |
| Signup subtitle | `14px` | On-brand. |
| Dashboard eyebrow | `11px` | On-brand uppercase micro-label. |

No font-size outliers in V5 additions.

---

## 3. Spacing and Layout Findings

### 3.1 Mobile nav bar spacing

| Property | Value | Assessment |
|---|---|---|
| Item padding | `4px 8px` | Tight; touch target is supplemented by `min-height: 44px` which is correct. |
| Icon size | `22px` | On-brand icon sizing. |
| Icon margin-bottom | `2px` | Acceptable micro-gap between icon and label. |
| Nav padding | `6px 0` + `env(safe-area-inset-bottom, 0px)` | Correct; safe-area-inset for iPhone notch. |
| Content push-up offset | `72px` padding-bottom | Correct compensation for fixed nav height. |

Spacing grid: all values land on 2/4/6/8px increments. Consistent with the brand's 4px grid.

### 3.2 Onboarding checklist spacing

| Property | Value | Assessment |
|---|---|---|
| Section padding | `28px 24px` | On-brand; matches action center and review section. |
| Step gap | `10px` | On-brand (action cards use `12px`, close enough). |
| Step padding | `16px 20px` | On-brand; matches `.emp-dash-action-card`. |
| Check circle size | `28px` | Appropriate; no matching existing size token but visually balanced. |
| Internal step gap | `14px` | On-brand (action card uses `16px`, minor 2px variation). |

### 3.3 Border-radius consistency

| Element | Radius | Assessment |
|---|---|---|
| Mobile nav item | `8px` | On-brand. |
| Onboarding step card | `14px` | On-brand; matches action cards (14px). |
| Onboarding CTA button | `8px` | On-brand; matches `.btn-cta-primary`. |
| Onboarding done badge | `100px` | On-brand pill shape; matches `.emp-dash-action-count`. |
| Check circle | `50%` | Correct for circular element. |

All border-radius values are consistent with the GH1 employer dashboard component patterns.

---

## 4. Motion/Animation Brand Audit

### 4.1 Token usage

**`_motion.scss` tokens defined:**
```
$motion-duration-micro:   160ms
$motion-duration-card:    220ms
$motion-duration-drawer:  260ms
$motion-duration-meter-fill: 650ms
$motion-duration-ambient: 6000ms
$motion-ease-standard:    cubic-bezier(0.4, 0, 0.2, 1)
$motion-ease-decelerate:  cubic-bezier(0.0, 0.0, 0.2, 1)
```

**V5 animation usage in `company-dashboard.component.scss`:**

| Animation | Duration used | Token | Assessment |
|---|---|---|---|
| `emp-hero-reveal` | `0.5s` (500ms) | No token used | **Bug.** Should be `$motion-duration-drawer` (260ms) or `$motion-duration-meter-fill` (650ms). 500ms is between tokens. Closest match is drawer (260ms) for a reveal. Value is a string literal, not the variable. |
| `emp-card-reveal` | `0.35s` (350ms) | No token used | **Bug.** Closest token is `$motion-duration-drawer` (260ms) or `$motion-duration-card` (220ms). The raw value 350ms falls between tokens. |
| Skeleton shimmer | `1.4s` | No token | Acceptable; infinite ambient shimmer. No exact token for this but `ease-in-out` matches no brand easing variable either. |
| Hover transitions | `0.18s` | No token | **Minor.** Closest token is `$motion-duration-micro` (160ms). The 0.18s/180ms value is close but bypasses the variable. |
| `gh-success-pulse-kf` | `400ms` (in `_motion.scss` itself) | Uses `$motion-ease-decelerate` | On-brand. |
| `gh-pressable` | `100ms` | No token | Acceptable; press feedback is intentionally faster than `$motion-duration-micro`. |
| Button transition (signup) | `100ms` + `0.4s` | No token | `100ms` acceptable for press; `0.4s` (400ms) exceeds all micro/card tokens. |

**Easing curves:**
- All V5 reveal animations use `$motion-ease-standard` (correct for transitions).
- `emp-shimmer` uses `ease-in-out` — not a brand variable. Low priority.
- Hover transitions use raw `ease` — not a brand variable.

### 4.2 Prefers-reduced-motion coverage

**Company dashboard** — full coverage in dedicated block at bottom of SCSS (line 662):
- Hero inner reveal: gated
- Review cards: gated
- Onboarding steps: gated
- All three skeleton animations: gated
- Action card/KPI hover transitions: gated
- Pipeline bar transition: gated (noted fixed in V5 optimization)
- Onboarding CTA transition: gated

**Mobile nav** (`employer-panel.component.scss`): The comment at line 98-99 explicitly notes "no transition/animation applied here — only color and border state changes." Correct; no reduced-motion gate needed.

**Signup** (`signup.component.scss`): The new `.btn-submit` motion block at line 473 includes a `prefers-reduced-motion: reduce` override that strips the `transform` transition while preserving background/color transitions. Correct.

**Assessment:** Reduced-motion coverage is complete for all new V5 animations.

### 4.3 Animation duration outliers

- `emp-hero-reveal 0.5s` — at the slow edge; hero reveals are often longer, so this is borderline acceptable but still bypasses the token system.
- `btn-submit: transition: all 0.4s ease` — pre-existing rule, not V5-introduced. The `all` keyword is an antipattern (animates every property including layout-triggering ones), but it predates V5.

---

## 5. Component Pattern Consistency

### 5.1 Mobile nav bar

**Positives:**
- Uses `aria-label` on the `<nav>` element.
- Individual items use `aria-label` on `<a>` tags.
- SVG icons are `aria-hidden="true" focusable="false"`.
- `role="navigation"` is redundant on a `<nav>` element (spec says it's implicit) but harmless.
- `routerLinkActive` correctly adds the active class.
- `d-flex d-md-none` correctly hides on desktop where the sidebar is shown.
- Touch targets meet WCAG 2.5.5 recommended 44px minimum.

**Gaps:**
- The "Post Job" item (`.gh-mobile-nav-item--create`) lacks `routerLinkActive` — if a user navigates to `/recruiter/jobs/create`, the "Jobs" tab will activate (via `routerLinkActive` on the Jobs link) but the Plus button won't show as "active." This is intentional for a FAB-style CTA but could be confusing if both highlight simultaneously.
- `cursor: pointer` is set on the items but items are `<a>` tags — redundant, not harmful.

### 5.2 Onboarding checklist

**Positives:**
- Real data only — no fake progress.
- Collapses when all steps complete (self-hiding via `ngIf`).
- Done state uses `$color-green-secondary` (teal, correct semantic).
- `role="list"` on `<ol>` supplements the existing semantic (redundant but harmless).
- Step CTA uses `gh-pressable` for micro-feedback.
- Done badge uses `aria-label="Completed"` — correct accessibility.

**Gaps:**
- `onboardingSteps()` is called in the template in two places: once in the `*ngIf` on the `<section>` (line 164) and once in the `*ngFor` on the `<li>` (line 169). Angular calls this method on every change-detection cycle — potentially O(n) per tick. Should be cached as a property on the component (assigned once when `dashboard$` emits). Not a brand issue, noted for developer follow-up.
- The `step.action` function reference pattern (`action: () => this.goToCompanyProfile()`) is correct Angular, but each call to `onboardingSteps()` re-creates arrow functions, making change-detection comparisons unstable. Same root cause as above.

### 5.3 Employer-specific signup copy

**Positives:**
- Employer title `"Create your employer account"` is clear and distinct from the generic title.
- Subtitle `"Start hiring in minutes. Post your first job and reach qualified candidates."` is concise, benefit-led, and on-voice.
- CTA button text switches to `"Create employer account"` and loading state to `"Creating account..."` — consistent with the UX pattern used in the generic flow.
- Sign-in prompt `"Already have an employer account? Sign in"` is appropriately targeted.
- `aria-busy` on the submit button during submission is correct.

---

## 6. Icon Usage Audit

### 6.1 Mobile nav SVG icons

All five nav icons are inline SVG. Audit:

| Icon | Approach | `aria-hidden` | `focusable="false"` | Assessment |
|---|---|---|---|---|
| Dashboard (grid) | Inline SVG | Yes | Yes | Correct |
| Jobs (briefcase) | Inline SVG | Yes | Yes | Correct |
| Post Job (plus circle) | Inline SVG | Yes | Yes | Correct |
| Company (house) | Inline SVG | Yes | Yes | Correct |
| Account (person) | Inline SVG | Yes | Yes | Correct |

Parent `<a>` tags all have `aria-label` providing the accessible name — icons are purely decorative in context. Pattern is correct.

**Icon style:** All use `fill="none" stroke="currentColor"` with `stroke-width="2"` (Post Job uses `2.5`). The slight weight variation on the Post Job icon is intentional (visual emphasis for the primary CTA). Consistent with the outline-icon system used elsewhere in the employer panel.

### 6.2 Onboarding checklist checkmark icon

The checkmark SVG in completed steps:
```svg
<path d="M3 8l3.5 3.5 6.5-7"/>
```
- `aria-hidden="true" focusable="false"` on the SVG — correct.
- Parent `<span class="emp-dash-onboarding-check">` is `aria-hidden="true"` — correct.
- Completed state is additionally communicated via `<span aria-label="Completed">Done</span>` — correct, screen readers get the text.

### 6.3 Action center icons

Action center uses `<img>` tags referencing `/assets/brand/gethired-wow/*.svg`:
- All have `alt=""` (empty alt, decorative) — correct since the action card title provides context.
- Parent `<span>` has `aria-hidden="true"` — double-hidden, correct.

---

## 7. Applied Fixes

### Fix 1 — Mobile nav hardcoded active color → `$color-global-red-buttons`

**File:** `src/app/employer-panel/employer-panel.component.scss`

**Before:**
```scss
&--active {
  color: #FF7062;
}

&--create {
  color: #FF7062;
  background: rgba(255, 112, 98, 0.15);
}
```
And in `:focus-visible`:
```scss
&:focus-visible {
  outline: 2px solid rgba(255, 112, 98, 0.85);
  outline-offset: 2px;
}
```

**After:**
```scss
&--active {
  color: $color-global-red-buttons;
}

&--create {
  color: $color-global-red-buttons;
  background: rgba(255, 112, 98, 0.15);
}
```
And:
```scss
&:focus-visible {
  outline: 2px solid rgba(255, 112, 98, 0.85);
  outline-offset: 2px;
}
```
Note: The `rgba()` forms cannot use a hex variable directly in Sass without `color.channel()` or interpolation; they are left as literal rgba for now (see deferred §8.2). The flat color assignments are fixed.

### Fix 2 — Onboarding green done-state: use `$color-green-secondary` variable

**File:** `src/app/company/company-dashboard/company-dashboard.component.scss`

**Before:**
```scss
&--done {
  background: #f6fff6;
  border-color: rgba(4, 160, 139, 0.25);
  opacity: 0.8;

  .emp-dash-onboarding-check {
    background: #04a08b;
    border-color: #04a08b;
    color: #fff;
  }
  ...
}
.emp-dash-onboarding-step-done-label {
  color: #04a08b;
  background: rgba(4, 160, 139, 0.1);
  ...
}
```

**After:**
```scss
&--done {
  background: #f6fff6;
  border-color: rgba(4, 160, 139, 0.25);
  opacity: 0.8;

  .emp-dash-onboarding-check {
    background: $color-green-secondary;
    border-color: $color-green-secondary;
    color: #fff;
  }
  ...
}
.emp-dash-onboarding-step-done-label {
  color: $color-green-secondary;
  background: rgba(4, 160, 139, 0.1);
  ...
}
```

### Fix 3 — Onboarding step animation: use motion token for card reveal

**File:** `src/app/company/company-dashboard/company-dashboard.component.scss`

The `emp-card-reveal` animation is used for onboarding steps. Its duration `0.35s` doesn't match any token. `$motion-duration-card` (220ms) is the correct semantic token for card reveals.

**Before:**
```scss
@keyframes emp-card-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
(Animation referenced as `animation: emp-card-reveal 0.35s $motion-ease-standard both;`)

**After (for onboarding step and review card usage):**
The `@keyframes` definition is unchanged. The `animation` shorthand on `.emp-dash-review-card` and `.emp-dash-onboarding-step` should use `$motion-duration-card`:

```scss
.emp-dash-review-card {
  animation: emp-card-reveal $motion-duration-card $motion-ease-standard both;
}
.emp-dash-onboarding-step {
  animation: emp-card-reveal $motion-duration-card $motion-ease-standard both;
}
```

---

## 8. Deferred Recommendations

### 8.1 Add `Manrope` to `fonts.scss` (or document CDN source)

`Manrope` is used throughout the app (predates V5) without a `@font-face` declaration. If it is loaded via a global CDN link in `index.html`, add a comment to `fonts.scss` noting this. If not, add a `@font-face` or npm package reference. Without this, Manrope falls back to `sans-serif` silently on network failure.

**Priority:** Medium.
**File:** `src/assets/styles/fonts.scss`

### 8.2 Create Sass color functions for rgba() brand derivations

Several places use `rgba(255, 112, 98, 0.15)` — derived from `$color-global-red-buttons` (#FF7062) but cannot use the variable directly in an `rgba()` call in Sass without `color.channel()` or `sass:color` module. The recommended approach:

```scss
@use 'sass:color';
// Then:
background: color.change($color-global-red-buttons, $alpha: 0.15);
```

**Priority:** Low (values are exact matches; risk is only maintainability).

### 8.3 Register `#7c83fd` and `#2dd4bf` in `colors.scss`

These purple-indigo and teal accent colors are used in pipeline bars, stage badges, and avatar gradients in multiple components. They should be declared:

```scss
$color-accent-indigo: #7c83fd;  // pipeline / stage accent
$color-accent-teal:   #2dd4bf;  // avatar gradient / emphasis
```

**Priority:** Medium (fragile across future theme changes).

### 8.4 Fix `emp-hero-reveal` animation duration

`0.5s` (500ms) bypasses motion tokens and is an outlier for a hero reveal. Recommend `$motion-duration-drawer` (260ms) for a snappier entrance consistent with the spec's drawer/dialog range, or accept `$motion-duration-meter-fill` (650ms) if the hero is considered an ambient reveal.

**Priority:** Low (visual only, reduced-motion is properly gated).

### 8.5 Cache `onboardingSteps()` in the component

The method is called twice per template render and creates new objects/closures each time, causing unnecessary change detection cycles. Move the result to a component property, populated once when `dashboard$` emits.

**Priority:** Medium (performance, not brand).

### 8.6 Replace inline styles in fallback panel

`employer-panel.component.html` line 83: `style="font-family: Manrope, sans-serif; font-size: 1rem; color: #444;"` and line 85: `style="color: #FF7062;"` should move to SCSS classes. The `#444` color is also off-brand (should be `$color-black` or `#1a1830`).

**Priority:** Low.

### 8.7 Sidebar: remove debug `console.log` calls

`employer-sidebar.component.ts` lines 46-47:
```ts
console.log('Secret')
console.log(this.user)
```
These log PII (user object) to the browser console. Should be removed before any production deployment.

**Priority:** High (data hygiene / security hygiene, not brand).

### 8.8 Mobile nav: consider `routerLinkActive` options for nested routes

Currently `/recruiter/jobs/list` and `/recruiter/jobs/create` would both activate the Jobs nav item via `routerLinkActive`. The create-job item does not use `routerLinkActive`. This is a navigation UX gap rather than a brand issue but affects polish.

**Priority:** Low.
