# GetHired V5 Fix Sprint — Brand Audit Report

**Date:** 2026-06-24
**Scope:** 13 changed files (11 FE, 2 BE) from the V5 fix sprint
**Auditor:** Claude Code (claude-sonnet-4-6)

---

## Executive Summary

The fix sprint delivered correct, well-structured brand changes. All four previously-hardcoded `#7c83fd`/`#2dd4bf` instances are now using SCSS variables. The `.btn-submit` merge is functionally correct with one minor hover-padding inconsistency (pre-existing, not a regression). The mobile nav is visually consistent across all five items. Two residual raw `rgba(124, 131, 253, ...)` values — in `.emp-dash-pipeline-bar` and `.emp-dash-kpi-card` focus outline — were found and corrected in-place as safe fixes. No new expensive CSS transitions were introduced.

**Status: PASS with 2 safe fixes applied.**

---

## 1. Color Variable Correctness

### Placement in colors.scss

PASS. The two variables are appended at the bottom of `src/assets/styles/colors.scss` under a `// V5 additions` comment block:

```scss
// V5 additions
$color-pipeline-accent: #7c83fd;   // pipeline bar accent / avatar gradient
$color-teal-accent: #2dd4bf;       // avatar gradient teal
```

Placement is correct SCSS syntax. The file has no explicit sections so appending at the end is the appropriate choice. Both values match the original hardcoded hex values exactly.

### Import availability in company-dashboard.component.scss

PASS. The dashboard SCSS imports the colors file on line 1:
```scss
@import "src/assets/styles/colors";
```
The variables are accessible.

### All four hardcoded instances replaced

PASS — confirmed by git diff and grep. The sprint replaced:

| Location | Before | After |
|---|---|---|
| `.emp-dash-review-initials` background | `linear-gradient(135deg, #7c83fd, #2dd4bf)` | `linear-gradient(135deg, $color-pipeline-accent, $color-teal-accent)` |
| `.emp-dash-review-stage` background | `rgba(124, 131, 253, 0.12)` | `rgba($color-pipeline-accent, 0.12)` |
| `.emp-dash-review-stage` color | `#7c83fd` | `$color-pipeline-accent` |

The three `rgba(124, 131, 253, ...)` and `#7c83fd` usages targeted in the sprint brief are all converted.

### Residual hardcoded instances (found and fixed)

Two additional raw `rgba(124, 131, 253, ...)` instances were missed in the sprint and were NOT from a different design intent — they are clearly the same pipeline-accent color used in related visual states:

- **Line 282** (pre-fix): `.emp-dash-kpi-card:focus-visible` outline — `rgba(124, 131, 253, 0.5)`
- **Line 348** (pre-fix): `.emp-dash-pipeline-bar` default background — `rgba(124, 131, 253, 0.5)`

Both were replaced with `rgba($color-pipeline-accent, 0.5)` as safe fixes (see Applied Fixes section).

---

## 2. .btn-submit Merge Visual Audit

File: `src/app/auth/signup/signup.component.scss`

### What changed (confirmed via git diff)

- `transition: all 0.4s ease !important` replaced with `transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease, color 0.1s ease`
- Redundant `transition: all 0.1s ease !important` inside `:hover` block removed
- `padding-top: 13px 10px !important` (malformed — CSS shorthand in a single-axis property) corrected to `padding-top: 13px !important`
- `prefers-reduced-motion` block added, stripping `transform` from the transition
- `.gh-signup-subtitle` added as a new, independent rule (not part of `.btn-submit`)

### Visual properties preserved

PASS.

| Property | Status |
|---|---|
| `background: $color-global-red-buttons` | Preserved |
| `color: #FFFFFF` | Preserved |
| `border-radius: 18px` | Preserved |
| `padding: 13px 10px` (base state) | Preserved |
| `font-weight: 500` | Preserved |
| `:hover` state — border, color inversion, transparent background | Preserved |
| `focus-visible` state | Not explicitly set on `.btn-submit` (pre-existing gap, not introduced here) |

### Transition composability

PASS. The merged transition list uses only GPU-compositable properties:
- `transform` — compositor-only
- `background` — paint-only (no layout)
- `color` — paint-only (no layout)

The previous `transition: all` would have animated every CSS property including `padding`, `border`, and `outline`, causing layout reflow on every frame. The new list is correct.

### prefers-reduced-motion coverage

PASS. The `@media (prefers-reduced-motion: reduce)` block strips `transform` and retains only `background` and `color`, which are safe semantic state changes (not decorative motion).

### Known issue — hover padding inconsistency

MINOR / PRE-EXISTING. The `:hover` block compensates for the added `border: solid 2px` by subtracting 2px from `padding-bottom` (13px → 9px) but does not compensate `padding-right`/`padding-left`. The border adds 2px on all sides so the button will grow 2px horizontally on hover, causing a very slight layout shift. This was present in the original codebase (the `!important` overrides suggest it was always a partial compensation) and was not introduced by the sprint. The sprint correctly fixed the malformed `padding-top: 13px 10px` (which was being silently ignored by the browser). Defer full fix to a polish pass.

---

## 3. Mobile Nav Visual Consistency

File: `src/app/employer-panel/employer-panel.component.html` and `.scss`

### Item-by-item audit

All five nav items share identical SCSS via the `.gh-mobile-nav-item` class:
- `display: flex; flex-direction: column; align-items: center; justify-content: center`
- `color: rgba(255, 255, 255, 0.55)` (inactive)
- `min-width: 44px; min-height: 44px` (touch target compliant)
- `padding: 4px 8px`
- `border-radius: 8px`

| Item | Route | Icon | Label | Active class | Special class |
|---|---|---|---|---|---|
| Dashboard | `/recruiter/dashboard` | Grid/4-squares | "Dashboard" | routerLinkActive | none |
| Jobs | `/recruiter/jobs/list` | Briefcase | "Jobs" | routerLinkActive | none |
| Candidates | `/recruiter/contacts` | People | "Candidates" | routerLinkActive | none |
| Post Job | `/recruiter/jobs/create` | Circle+plus | "Post Job" | routerLinkActive | `--create` (red tint bg) |
| Company | `/recruiter/company/details` | House | "Company" | routerLinkActive | none |

PASS. All five items use the same base class. Candidates is structurally identical to Dashboard, Jobs, and Company — it is not an orphan and will not leave a visual gap.

### Nav order assessment

PASS. The order (Dashboard → Jobs → Candidates → Post Job → Company) follows a logical employer workflow: start at the hub, check job listings, check candidates, create a new post, manage the company. Post Job in position 4 with its `--create` accent styling acts as a visual call-to-action anchor, which is standard mobile navigation pattern for a primary action.

### Missing Subscription item

NOT A VISUAL GAP. With 5 items, `justify-content: space-around` distributes them evenly across the full nav width (20% each). A 6th item (Subscription) was presumably excluded intentionally; its absence does not create visual asymmetry. If Subscription were added later, the nav would become crowded at 6 items on small screens (recommended max is 5 for bottom navigation). Deferred.

### overflow-y fix

PASS. Both `#sub-company-component` and `#body-row` had `overflow-y: none` (invalid value — browsers treat this as `visible`). The sprint correctly changed both to `overflow-y: hidden`. This prevents scroll bleeding behind the fixed mobile nav bar.

---

## 4. Remaining Hardcoded Values Check

### colors.scss

No hardcoded hex values — it is the variable definition file. PASS.

### company-dashboard.component.scss (post-fix)

The dashboard SCSS contains many hardcoded values that are intentional design constants not yet in the color system. After the two safe fixes applied in this session, the only remaining raw hex values are:

- `#f8f9fb` — page background (unique to dashboard, not a global token)
- `#1a1830`, `#2a2348`, `#1e1b3a` — hero gradient dark purples (unique to the hero section)
- `#ede9f7` — card border color (used 4× in the file, candidate for a future token: `$color-card-border`)
- `#6b6887` — muted text (used 6× in the file, candidate for `$color-text-muted`)
- `#1a1830` — primary dark text (same as hero bg; candidate for `$color-text-primary-dark`)
- `rgba(254, 111, 97, ...)` — red button tints (these match `$color-global-red-buttons`; using `rgba($color-global-red-buttons, ...)` would be cleaner but is not a sprint-scope issue)

None of these are the pipeline-accent or teal-accent values that were the sprint's target.

### signup.component.scss

- `#FF4D3C` — hover border/text color (a darkened variant of `$color-global-red-buttons`; should eventually be `darken($color-global-red-buttons, 6%)` or a new `$color-global-red-hover` token)
- All other hex values are pre-existing and not modified by the sprint

### employer-panel.component.scss

- `#2222` — alpha shorthand for near-transparent black background on `#body-main-container` (unusual value; appears intentional as a translucency hack)
- `#333` — sidebar separator color (3× occurrences; pre-existing legacy value)
- `rgba(255, 255, 255, 0.12)` — nav top border (appropriate inline for a one-off subtle divider)
- `rgba(255, 112, 98, 0.15)` and `rgba(255, 112, 98, 0.85)` — red button tints used in nav; could reference `$color-global-red-buttons` via `rgba()`

---

## 5. Motion / Animation Check

### company-dashboard.component.scss

PASS. The sprint removed `min-height` from `.emp-dash-pipeline-bar`'s transition:
- Before: `transition: background 0.18s ease, min-height 0.3s ease`
- After: `transition: background 0.18s ease`

`min-height` transitions trigger layout + paint on every frame (not compositable). Removal is correct and improves performance for the pipeline bar hover state.

The `.emp-dash-pipeline-bar` background and `.emp-dash-pipeline-stage:hover` are now in the `prefers-reduced-motion: reduce` block (`transition: none`), which is correct.

No new transitions were introduced that animate expensive properties.

### signup.component.scss

PASS (assessed above in section 2). The `transform` property is GPU-compositable. The `background` and `color` properties are paint-only. No layout-triggering properties are animated.

### employer-panel.component.scss

PASS. The mobile nav explicitly has no transitions applied (confirmed by the in-code comment: "no transition/animation applied here"). This is the correct choice for a fixed bottom navigation bar — thumb navigation should not introduce transform or opacity animations that could cause visual instability.

### _motion.scss (unchanged)

PASS. The motion token file was not changed in this sprint. The `$gh-scale-press: 0.985` and the `.gh-pressable` class (which uses `transform: scale()` — compositable) are correctly referenced in the dashboard HTML via the `gh-pressable` class. The `motion-safe` mixin correctly nullifies these under `prefers-reduced-motion`.

---

## 6. Applied Fixes

Two safe in-place fixes were applied to `src/app/company/company-dashboard/company-dashboard.component.scss`:

**Fix 1 — KPI card focus outline:**
```scss
// Before (line 282)
outline: 2px solid rgba(124, 131, 253, 0.5);

// After
outline: 2px solid rgba($color-pipeline-accent, 0.5);
```

**Fix 2 — Pipeline bar default background:**
```scss
// Before (line 348)
background: rgba(124, 131, 253, 0.5);

// After
background: rgba($color-pipeline-accent, 0.5);
```

Both replacements are purely mechanical — the computed color value is identical. These complete the variable migration for all `#7c83fd` usages in the file.

---

## 7. Deferred Recommendations

These are not blocking but should be addressed in a dedicated polish pass:

1. **`$color-card-border` token** — `#ede9f7` appears 4× in the dashboard SCSS and is likely to appear in other components. Extracting it as a named token improves theme-ability.

2. **`$color-text-muted` token** — `#6b6887` appears 6× in the dashboard SCSS and in `signup.component.scss`. A named token prevents drift.

3. **`$color-text-primary-dark` token** — `#1a1830` is used as both a background color (hero) and primary text color. The dual role is a design ambiguity worth resolving with separate tokens.

4. **`.btn-submit` hover border compensation** — Add `padding-left` and `padding-right` compensation inside the `:hover` block to match the vertical compensation already applied (`padding-bottom: 9px`). Alternatively, switch the hover border approach to use `box-shadow: inset 0 0 0 2px #FF4D3C` (no layout impact).

5. **`focus-visible` on `.btn-submit`** — The button has no explicit `focus-visible` style. The browser default may be insufficient or mismatched with the brand. Add `outline: 2px solid $color-global-red-buttons; outline-offset: 2px` inside a `&:focus-visible` block.

6. **Subscription nav item** — When/if added to mobile nav, shrink labels to 9px and reduce horizontal padding to 4px to maintain 5-item comfort zone. Do not exceed 5 items.

7. **`rgba($color-global-red-buttons, ...)` consistency** — Several locations in employer-panel and dashboard SCSS use hardcoded `rgba(255, 112, 98, ...)` or `rgba(254, 111, 97, ...)` instead of the SCSS `rgba($color-global-red-buttons, ...)` form. This is a maintainability gap for future red color changes.

---

## File Index

| File | Sprint Change | Brand Finding |
|---|---|---|
| `src/assets/styles/colors.scss` | Added `$color-pipeline-accent`, `$color-teal-accent` | PASS — correct placement and syntax |
| `src/assets/styles/fonts.scss` | Comment added | PASS — no brand impact |
| `src/assets/styles/_motion.scss` | Unchanged | PASS — not modified |
| `src/app/company/company-dashboard/company-dashboard.component.scss` | Variable substitution + motion fix | FIXED — 2 residual raw rgba values replaced |
| `src/app/company/company-dashboard/company-dashboard.component.html` | Template changes | No SCSS impact |
| `src/app/company/company-dashboard/company-dashboard.component.ts` | Logic changes | No brand impact |
| `src/app/auth/signup/signup.component.scss` | `.btn-submit` merge | PASS — transition compositable, reduced-motion correct |
| `src/app/auth/signup/signup.component.html` | Employer title/subtitle | No SCSS impact |
| `src/app/employer-panel/employer-panel.component.html` | 5-item mobile nav | PASS — all items visually consistent |
| `src/app/employer-panel/employer-panel.component.scss` | overflow-y fix + nav styles | PASS — no transitions in nav, overflow fix correct |
| `src/app/job/job-create/job-create.component.ts` | Publish validation + routing | No brand impact |
| `get-hired-BE/controllers/jobsController.js` | BE data layer | No brand impact |
| `get-hired-BE/controllers/userController.js` | Role-1 guard | No brand impact |
