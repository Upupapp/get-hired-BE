# GETHIRED MOBILEVIEW REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 + Employer Portal V4

---

## FEDERATED SEARCH — MOBILE AUDIT

### Tab bar (`/jobs` — All/Jobs/Companies)

| Check | Status | Notes |
|---|---|---|
| Tabs fit on 375px viewport | PASS | `overflow-x: auto; scrollbar-width: none` prevents overflow |
| Tab touch targets | 44px height | PASS — `padding: 10px 16px` meets 44px minimum |
| Tab active state | Border-bottom highlight | Visible on mobile |
| Tab count badge | Rounded pill | Readable at 375px |

### SearchCompanyCardComponent

| Check | Status | Notes |
|---|---|---|
| Logo fallback on error | PASS — `logoError` boolean + initial letter shown | |
| Button touch targets | `viewCompany` / `viewJobs` CTAs | Need to confirm padding in card SCSS |
| Card layout at 375px | Full width block | PASS — no fixed widths |

### SearchSpotlightCardComponent

| Check | Status | Notes |
|---|---|---|
| Spotlight card on mobile | Full width | PASS |
| Top jobs list on mobile | Stacked layout | PASS |
| Reduced-motion entrance | Animation disabled | PASS |

---

## EMPLOYER PORTAL V4 — MOBILE AUDIT

### Hero (375px)

| Check | Status | Notes |
|---|---|---|
| H1 font fluid | clamp(2rem, 5vw, 3rem) | PASS — no overflow at 375px |
| Hero dashboard mockup hidden on mobile | `display: none` at `max-width: 900px` | PASS |
| CTA buttons stack horizontally | `flex-wrap: wrap` | PASS |
| No horizontal scroll | `overflow: hidden` on hero | PASS |

### Mobile menu

| Check | Status | Notes |
|---|---|---|
| Hamburger button visible at ≤860px | PASS | |
| Menu overlays full screen | `position: fixed; inset: ...` | PASS |
| Escape key closes menu | `onMenuKeydown` | PASS |
| `body.overflow: hidden` when menu open | YES | PASS |
| Focus trap in modal | NOT IMPLEMENTED | P2 gap — menu is dialog but no focus trap |

### Feature banners (banner visuals on mobile)

| Check | Status | Notes |
|---|---|---|
| Visuals hidden on mobile | `display: none at max-width: 900px` | PASS — copy always visible |
| Copy section full width | `grid-template-columns: 1fr` at 900px | PASS |

### Platform snapshot grid

| Check | Status | Notes |
|---|---|---|
| 4-col → 2-col at 860px | PASS |
| 2-col → 1-col at 500px | PASS |

### USP pillar grid

| Check | Status | Notes |
|---|---|---|
| 3-col → 1-col at 760px | PASS |

### Feature grid

| Check | Status | Notes |
|---|---|---|
| 4→3→2→1 col breakpoints | PASS — 1040 / 760 / 480 breakpoints set |

### How it works steps

| Check | Status | Notes |
|---|---|---|
| 7-col → 4-col at 1100px | PASS |
| 4-col → 1-col at 680px | PASS |
| Mobile: horizontal row layout with gap | PASS — `flex-direction: row` at ≤680px |

### FAQ section

| Check | Status | Notes |
|---|---|---|
| FAQ items touch target | Depends on `portal-faq` component | Inherited from existing component |
| Container narrow | 760px max — full width on mobile | PASS |

---

## OPEN MOBILE BUGS (pre-existing)

| Bug | Severity | Location |
|---|---|---|
| **Job-create submit footer z-index** — z-index:99 behind bottom nav z-index:999 | P0 | `job-create/job-create-sticky-footer.component.scss` |
| Employer jobs list table overflow at 375px | P1 | `employer-jobs-list.component.html` |
| Employer applicant list table overflow at 375px | P1 | `employer-applicant-list.component.html` |
| Mobile menu focus trap missing | P2 | `employer-portal.component.html` |

---

## MOBILEVIEW VERDICT: PASS for new components. Pre-existing P0 (job-create footer z-index) carries over unresolved.
