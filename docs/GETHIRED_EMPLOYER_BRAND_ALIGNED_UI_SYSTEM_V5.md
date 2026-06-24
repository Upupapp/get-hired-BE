# GetHired Employer Brand-Aligned UI System V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Color System

Source: `src/assets/styles/colors.scss`

| Token | Value | Usage |
|-------|-------|-------|
| $color-global-red-buttons | #FF7062 | Primary CTA, active states, badges, focus rings |
| $color-global-red | #FE6F61 | Accent chips, error chips |
| $color-global-gray-cancel | #7A637F | User card background |
| $color-global-sidebar-employer-user-menu | #444152 | Sidebar background |
| $color-global-sidebar-employer-route-active | #67627E | Active sidebar item |
| $color-global-sidebar-employer-sub-route-button | #514D63 | Active sub-route |
| $color-global-sidebar-employer-sub-label | #878592 | Sub-item label text |
| $color-global-sidebar-applicant-gray | #F6F7FB | Main content background |
| $color-blue-primary | #168DBD | Charts, secondary accents |
| $color-green-secondary | #04A08B | Success states, done checks |
| #1a1830 | Dashboard hero dark | |
| #2a2348 | Dashboard hero mid | |
| #7c83fd | Pipeline bars, initials gradient | |

---

## Typography

Font: 'Manrope' (all weights 400-800)  
Sizes: 10px (labels), 11px (micro), 12px (meta), 13-14px (body), 15px (section title), 22-28px (KPI values), 28px (hero title)

---

## Button Hierarchy

| Level | Class | Color | Usage |
|-------|-------|-------|-------|
| Primary | .btn-cta-primary + .gh-pressable | FF7062 red | "Post a job", main CTAs |
| Outline | .btn-cta-outline + .gh-pressable | transparent / white border | Secondary CTAs on dark bg |
| Outline (light) | .btn-cta-outline + .gh-pressable | red border on white bg | Review CTAs on cards |
| Link | .btn-link | FF7062 red, underline | "Retry", cancel links |
| Submit | .btn-submit + .gh-pressable | FF7062 red, rounded | Auth forms |
| Settings | .img-avatar-button + .gh-pressable | sidebar accent | Settings button |

All primary and secondary CTAs have gh-pressable (transform scale 0.985 on :active).

---

## Card Patterns

| Pattern | Used In | Border | Radius | Shadow |
|---------|---------|--------|--------|--------|
| Action card | Dashboard action center | 1.5px #ede9f7 | 14px | hover: 0 4px 20px |
| Urgent action card | Review applicants | red accent border | 14px | hover: 0 4px 20px |
| KPI card | Dashboard KPIs | 1.5px #ede9f7 | 14px | hover: 0 4px 20px |
| Review card | Needs-review list | 1.5px #ede9f7 | 14px | static |
| Pipeline section | Dashboard pipeline | 1.5px #ede9f7 | 16px | static |
| Onboarding step | Checklist | 1.5px #ede9f7 | 14px | reveal animation |
| Done onboarding step | Checklist | rgba(4,160,139,0.25) | 14px | green tint bg |
| Analytics section | Dashboard analytics | 1.5px #ede9f7 | 16px | static |

---

## Form Field Pattern

- border: 1px solid #E6E6E6, border-radius: 18px (auth forms)
- focus: outline 2px solid $color-global-red-buttons
- valid dirty: border 2px solid $color-global-red-buttons
- invalid dirty touched: red bg tint
- Floating label: position: absolute, climbs above input on focus

---

## Loading / Skeleton Patterns

- Skeleton: gradient shimmer `linear-gradient(90deg, #f0edf8 25%, #e8e4f4 50%, #f0edf8 75%)`
- Animation: emp-shimmer 1.4s infinite
- Reduced-motion: `animation: none; background: #f0edf8` (solid)
- Pattern used in: dashboard hero, action cards, pipeline section
- `<app-loading>` component used in employer panel loading fallback

---

## Empty State Patterns

- `<app-empty-section>` component (title, subTitle, detailSize props)
- Job list: `.gh-job-list-empty` with SVG icon + title + desc + CTA button
- Applicant list: similar pattern
- Dashboard pipeline: `<app-empty-section>`
- Dashboard action center: "You're all caught up" text paragraph

---

## Success / Error State Patterns

- Success: `.gh-success-pulse` animation (scale 1 -> 1.04 -> 1, 400ms)
- Error: `.gh-error-panel` (calm, no animation)
- Toast/snackbar: MatSnackBar with `success-snackbar` / `danger-snackbar` panelClass
- Dialog: `UpdatedDialogComponent` for save/publish confirmations
- Haptic service: `haptics.jobPublished()`, `haptics.warning()`

---

## Angular Material Usage

- MatDialog (UpdatedDialogComponent, CompanyNotSetupComponent, SubscriptionAlertComponent)
- MatSnackBar (publish success, publish-blocked, draft saved)
- MatCheckbox (agreeToTerms in signup)
- MatStepperModule (job create stepper)

---

## Bootstrap Usage

- Grid: col-12, col-md-*, col-lg-*
- Utilities: d-flex, d-none, d-md-block, mt-*, mb-*, p-*, ms-*, me-*
- Alert: alert alert-danger (auth forms)

---

## Motion Patterns

- All in `_motion.scss` + component SCSS files
- `gh-pressable`: scale 0.985 on :active, 100ms
- `gh-success-pulse`: scale pulse 400ms
- Card hover: translateY(-2px) + box-shadow, 180ms
- Hero reveal: fade+translate 500ms
- Card reveal: fade+translate 350ms
- Skeleton shimmer: continuous loop (disabled under reduced-motion)
- All gated by @include motion-safe or explicit prefers-reduced-motion blocks

---

## Responsive Behavior

- Layout: sidebar (d-none d-md-block) + main content (full width)
- Mobile (<768px): sidebar hidden, mobile bottom nav bar (V5)
- Content: max-width 1100px on dashboard sections
- KPI cards: flex-wrap, 1 1 180px -> 100% on mobile
- Hero CTA: flex-direction column on mobile
- Cards: padding/margin reduced on mobile
