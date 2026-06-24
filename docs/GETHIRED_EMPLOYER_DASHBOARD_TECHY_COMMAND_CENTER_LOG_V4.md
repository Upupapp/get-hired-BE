# GetHired Employer Dashboard Techy Command Center Implementation Log V4

**Document:** GETHIRED_EMPLOYER_DASHBOARD_TECHY_COMMAND_CENTER_LOG_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Implementation log for all visual, interaction, animation, haptic, and accessibility features in `company-dashboard.component`. Brand assets used. Missing effects and gaps.

---

## Table of Contents

1. [Hero Section](#1-hero-section)
2. [Action Center](#2-action-center)
3. [KPI Cards](#3-kpi-cards)
4. [Pipeline Visualization](#4-pipeline-visualization)
5. [Needs Review List](#5-needs-review-list)
6. [Skeleton Loading](#6-skeleton-loading)
7. [CSS Architecture](#7-css-architecture)
8. [Haptics Implementation](#8-haptics-implementation)
9. [Typography](#9-typography)
10. [Brand Assets Used](#10-brand-assets-used)
11. [SCSS Imports and Dependency Chain](#11-scss-imports-and-dependency-chain)
12. [Missing Effects and Gaps](#12-missing-effects-and-gaps)

---

## 1. Hero Section

### 1.1 Background

The dashboard hero uses a gradient mesh as its primary background.

**CSS gradient:** `background: linear-gradient(to bottom right, #1a1830, #2a2348, #1e1b3a)` (approximate; exact values in component SCSS).

**Overlay:** `emp-dash-hero-mesh` CSS class applied to an SVG overlay element that provides the mesh texture over the gradient. The mesh SVG is loaded from brand assets (see section 10).

### 1.2 Text hierarchy

| Element | Style | Content |
|---------|-------|---------|
| Eyebrow text | Coral color, small uppercase | Category label (e.g., "Hiring Command Center") |
| H1 heading | White, large | Primary welcome or dashboard title |
| Subtitle | White or light grey, body weight | Real data injected (e.g., employer name or company name from dashboard$) |
| Urgent chip | Coral chip/badge | Shows `needsReviewCount` when non-zero (e.g., "12 need review") |

**Coral chip for urgent count:** Rendered as a badge/chip element with coral background when `needsReviewCount > 0`. Hidden when count is zero.

### 1.3 Hero skeleton

**CSS class:** `.emp-dash-hero-skeleton`
**Behavior:** Rendered while `dashboard$` is loading. Replaces the entire hero section content (not just the text -- skeleton overlays the full hero area).
**Removes when:** Observable from `companyFacade` emits data.

---

## 2. Action Center

### 2.1 Urgent card

**CSS classes:** `.emp-dash-action-card`, `.emp-dash-action-card--urgent`

The `--urgent` modifier applies a pulsing animation. Implementation expected to be a CSS `@keyframes` pulse on the border or background opacity.

**Content when urgent:** Real `needsReviewCount` shown inline. Example: "Review 5 new applicants."

**Routing:** Calls `goToApplicants(jobId)` with the first job that has pending applicants.

### 2.2 Standard cards

**CSS class:** `.emp-dash-action-card`

Standard cards (Manage your jobs, Complete your company profile) use the same base class without the `--urgent` modifier. No pulsing animation.

### 2.3 Action skeleton

**CSS class:** `.emp-dash-action-skeleton`

Three skeleton placeholders shown while action center data loads. Each skeleton mimics the size and shape of an action card.

---

## 3. KPI Cards

### 3.1 Card design

**CSS classes:** `.emp-dash-kpi-card`, `.gh-pressable`

All KPI cards have the `.gh-pressable` class applied, which enables the micro-scale press interaction (see CSS Architecture section).

**Card structure:**
- Label (e.g., "Active Jobs", "This Month")
- Large count number (real data from `dashboard$`)
- Optional icon or supporting text

### 3.2 Press interaction

`.gh-pressable` applies a `transform: scale(0.97)` on `:active` state. This creates a tactile press visual matching the `HapticFeedbackService.selection()` call.

**No animated entrance confirmed:** KPI cards may not have a `@keyframes` reveal animation applied. Cards likely appear with the standard component render (see section 12 for gap).

---

## 4. Pipeline Visualization

### 4.1 Pipeline rail

**CSS class:** `.emp-dash-pipeline-rail`

The pipeline rail is a horizontal container housing per-stage bars.

### 4.2 Stage bars

Per-stage bar rendering:

| Property | Implementation |
|----------|---------------|
| Height | `[style.height.%]="(stage.count / maxCount) * 100"` (Angular style binding) |
| Color | Coral (matches `--color-cta-primary` from colors token file) |
| Label | `stage.label` from `byStage[].label` |
| Count | `stage.count` displayed above bar |
| Aria | `aria-label="{label}: {count} applicants"` for screen reader accessibility |

**Max count calculation:** `maxCount = Math.max(...byStage.map(s => s.count), 1)` -- the `1` floor prevents division by zero when all counts are zero.

### 4.3 Bar click behavior

Click on any bar calls `goToJobsList()` -> `/recruiter/jobs/list`.

**Gap:** This is a missed opportunity. The bar represents a specific pipeline stage, but the navigation goes to the general job list rather than an applicant list filtered by that stage. Documented in Known Gaps.

### 4.4 Empty pipeline

When `byStage` is empty or `needsReviewCount === 0` and all stage counts are zero, `<app-empty-section>` renders with title "No applicants yet".

---

## 5. Needs Review List

### 5.1 List item structure

Each item in the `needsReview[]` array renders as a row with:

| Element | Data | CSS |
|---------|------|-----|
| Initials avatar | First letter of first name + first letter of last name from `candidateName` | Circular, coral or dark background |
| Candidate name | `candidateName` | Body weight |
| Job title | `jobTitle` | Secondary text, smaller |
| Submitted date | `submittedDate \| date:'mediumDate'` | Tertiary text |
| Status label | Derived from `statusId` | Badge or text label |
| Review CTA | "Review" button | `.btn-cta-primary` or `.btn-cta-outline` |

### 5.2 "Review" CTA

Calls `goToApplicants(item.jobId)` -> `/recruiter/jobs/applicants?id={jobId}`.

This correctly routes to the specific job's applicant list.

---

## 6. Skeleton Loading

Three skeleton types cover the dashboard loading state:

| CSS Class | Covers | Trigger |
|-----------|--------|---------|
| `.emp-dash-hero-skeleton` | Full hero section | `dashboard$` loading |
| `.emp-dash-action-skeleton` | Action center (3 cards) | `dashboard$` loading |
| `.emp-dash-pipeline-skeleton` | Pipeline rail + needs review list | `pipelineLoading === true` |

Skeleton elements are CSS-animated shimmer effects (likely using a `background: linear-gradient` animation via `@keyframes`).

**Note:** Hero and action skeletons are tied to the main dashboard observable. Pipeline skeleton is separately controlled by `pipelineLoading` because the pipeline overview is a separate API call that may resolve at a different time.

---

## 7. CSS Architecture

### 7.1 Interactive classes

| Class | Effect | Applied To |
|-------|--------|-----------|
| `.gh-pressable` | `transform: scale(0.97)` on `:active` | KPI cards, action cards |
| `.btn-cta-primary` | Coral background, white text | Primary CTAs (Review, Create Job) |
| `.btn-cta-outline` | Coral border, transparent background | Secondary CTAs |
| `.emp-dash-action-card--urgent` | Pulsing animation on border or shadow | Urgent action card when `needsReviewCount > 0` |

### 7.2 Color tokens

Colors are imported from `src/assets/styles/colors`. Key tokens used in the dashboard:

| Token | Value (approximate) | Usage |
|-------|---------------------|-------|
| `--color-bg-deep` | `#1a1830` | Hero gradient start |
| `--color-bg-mid` | `#2a2348` | Hero gradient mid |
| `--color-bg-end` | `#1e1b3a` | Hero gradient end |
| `--color-cta-primary` | Coral (`#FF6B6B` or equivalent) | CTA buttons, pipeline bars, chips, eyebrow text |
| `--color-text-primary` | White | H1, subtitle text |
| `--color-text-secondary` | Light grey | Subtitle supporting text |

---

## 8. Haptics Implementation

**Service:** `HapticFeedbackService`

**Methods relevant to dashboard:**

| Method | When Called | Effect |
|--------|------------|--------|
| `selection()` | KPI card press | Light tap feedback (web: CSS transform) |
| `success()` | (Not confirmed on dashboard directly) | Used in other components |
| `actionComplete()` | After navigation from dashboard CTA | (Confirm in CTA methods) |
| `jobPublished()` | After publish (in job create, not dashboard) | Not called on dashboard |

**Dashboard-specific:**

The `.gh-pressable` class provides visual press feedback. Haptic feedback via `HapticFeedbackService` is wired in components that use it. The dashboard's KPI card press likely triggers `selection()` but this must be confirmed in the component TypeScript.

---

## 9. Typography

**Font family:** Manrope

Applied globally via the Angular project's global styles. The dashboard inherits Manrope for all text elements.

**Font weight usage (expected pattern):**

| Element | Weight |
|---------|--------|
| Eyebrow text | 600 (semibold) |
| H1 | 700 (bold) |
| KPI count | 700 (bold) |
| KPI label | 400 (regular) |
| Action card title | 600 (semibold) |
| Body text | 400 (regular) |
| Tertiary text | 400 (regular), reduced opacity |

---

## 10. Brand Assets Used

The dashboard references the following brand asset files from `src/assets/brand/gethired-wow/`:

| Asset File | Usage Location | Notes |
|-----------|---------------|-------|
| `portal-gradient-mesh.svg` | Hero section mesh overlay (`.emp-dash-hero-mesh`) | Texture over gradient background |
| `candidate-profile-card.svg` | Dashboard illustration or empty state | Confirm exact usage location in template |
| `hiring-pipeline-lines.svg` | Pipeline section decorative element | Confirm exact usage |
| `trust-shield-glow.svg` | Dashboard trust indicator or empty state decoration | Confirm exact usage |

**Note:** Asset usage should be confirmed by reviewing `company-dashboard.component.html`. The above list is based on documented brand asset inventory.

---

## 11. SCSS Imports and Dependency Chain

The dashboard component SCSS imports:

```scss
@import 'src/assets/styles/colors';
@import '~assets/styles/motion';
```

**`src/assets/styles/colors`:** Provides CSS custom properties and SCSS variables for all color tokens.

**`~assets/styles/motion`:** Provides animation tokens, `.gh-pressable` definition, and shared `@keyframes` used across the application.

**Import path note:** `~assets/styles/motion` uses the tilde shorthand, which resolves to `node_modules` in older Angular CLI configurations or to a configured path alias. Confirm path resolution if build errors occur.

---

## 12. Missing Effects and Gaps

| # | Missing Item | Component Location | Type | Priority |
|---|-------------|-------------------|------|----------|
| 1 | `@keyframes emp-hero-reveal` not confirmed in `motion.scss` -- hero section may not have entrance animation | `motion.scss` | Missing effect | Low |
| 2 | No `@media (prefers-reduced-motion: reduce)` rule in dashboard component SCSS or `main-animations.ts` | Component SCSS + `main-animations.ts` | Accessibility gap | Medium |
| 3 | No `@media (prefers-reduced-motion)` in `motion.scss` (gap affects all consumers of `~assets/styles/motion`) | `motion.scss` | Accessibility gap | Medium |
| 4 | Pipeline bar click animates nothing (just navigates) -- a brief stage-highlight animation would reinforce the interaction | Dashboard component | Enhancement | Low |
| 5 | KPI card entrance animation not confirmed -- cards may appear without stagger or reveal animation | Dashboard component | Enhancement | Low |
| 6 | Needs review list items have no stagger entrance animation | Dashboard component | Enhancement | Low |
| 7 | `HapticFeedbackService.selection()` call on KPI card press not confirmed -- may be CSS-only | Dashboard component TS | Confirm needed | Low |
| 8 | No "pulse on new data" animation when `needsReviewCount` changes during a session | Dashboard component | Enhancement | Low |

### 12.1 Reduced motion gap detail

Neither `main-animations.ts` (which defines `@Component` animation metadata using Angular's `trigger()` API) nor the dashboard component SCSS have been confirmed to contain `@media (prefers-reduced-motion: reduce)` or the Angular `AnimationBuilder` equivalent.

**Correct approach for Angular animations:**

```typescript
// In component, inject platform and check preference:
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Conditionally apply animations based on this flag
```

Or in SCSS:

```scss
@media (prefers-reduced-motion: reduce) {
  .emp-dash-action-card--urgent {
    animation: none;
  }
  .gh-pressable:active {
    transform: none;
  }
}
```

**Recommendation:** Add `prefers-reduced-motion` guards to `motion.scss` and to `main-animations.ts` as a safe, non-breaking accessibility improvement.
