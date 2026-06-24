# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_REPORT
Scope: FE HEAD 5ab9a05 — ApplicationCompletenessBadge, ApplicationCompletenessCard,
       ApplicantApplications, ApplicantApplicationDetail, applicant-panel.module.ts
Date: 2026-06-24
Auditor: OPTIMIZE command (recent deployment mode — Session 4)

---

## Session history

**Session 1 (prior):** Employer-side audit — `job-applicants.component.html` + `.scss`.
Applied: `aria-live`, badge `aria-label`s, snapshot card region label. Build: PASS.

**Session 2 (prior):** Applicant-side audit — `applicant-applications.component.ts/html/scss`.
Applied: `@keyframes` name collision fix, `aria-live` on snapshot container, `trackBy` on tip loops. Build: PASS.

**Session 3 (prior):** Deep correctness audit of `getApplicantApplicationSnapshotsBatch` (BE) +
subscription lifecycle (FE). Applied: explicit `::text[]` cast on all `ANY($1)` queries, named
`snapshotsSub` to close subscription leak, `:focus-visible` on CTA link. Build: PASS.

**Session 4 (this run):** Targeted audit of the six points raised for the FE HEAD 5ab9a05 deployment.
One bug fixed (router navigation footgun). All others verified clean. Build: PASS.

---

## Session 4 — Findings

### F1 — CRITICAL BUG FIXED: `router.getCurrentNavigation()` called in ngOnInit
**File:** `src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts`
**Severity:** High — functional correctness defect
**Status:** Applied

`router.getCurrentNavigation()` is only valid synchronously during Angular's construction phase.
By the time `ngOnInit` fires, the router's internal navigation reference has been cleared and the
method returns `null`. The code correctly fell back to `window.history.state` (which does persist),
but the navigation state branch was dead code — always bypassed, silently.

The consequence: any scenario where `window.history.state` is not set (e.g. typed URL, back-button
on a page that reset state, or a programmatic `navigateByUrl` call without explicit `state`) would
leave `jobTitle`, `companyName`, and `statusName` as empty strings, causing the detail-page header
to render blank.

Fix: moved the entire state-reading block into the constructor (3 lines), where
`getCurrentNavigation()` is guaranteed to be populated. `window.history.state` is retained as the
fallback for direct URL access.

---

### F2 — PASS: Badge @keyframes prefix (`acb-*`)
**File:** `src/app/shared/components/application-completeness-badge/application-completeness-badge.component.scss`
**Keyframes declared:** `acb-shimmer`, `acb-fadein`

Full project scan of all component SCSS files confirmed no other file uses the `acb-` prefix.
Angular's `ViewEncapsulation.Emulated` does NOT scope `@keyframes` — they are global. Both names
are unique across the project. No collision. No fix needed.

---

### F3 — PASS: Card @keyframes prefix (`acdc-*`)
**File:** `src/app/shared/components/application-completeness-card/application-completeness-card.component.scss`
**Keyframes declared:** `acdc-shimmer`, `acdc-fadein`

Full project scan confirmed no other file uses the `acdc-` prefix. No collision. No fix needed.

---

### F4 — PASS: SCSS import paths consistent with applicant-panel convention
**File:** `src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.scss`

Uses `@import "src/assets/styles/colors"` and `@import "src/assets/styles/motion"`.
Audit of all 14 SCSS files in `src/app/applicant-panel/**` confirms this is the exact convention
used throughout the module. Shared components (badge, card) use the same pattern. Consistent.
No fix needed.

---

### F5 — PASS: DatePipe availability for card template
**File:** `src/app/shared/components/application-completeness-card/application-completeness-card.component.html`
**Usage:** `{{ snapshot.snapshotCreatedAt | date:'mediumDate' }}`

`ApplicationCompletenessCardComponent` is declared in `SharedModule`. `SharedModule` imports
`CommonModule` directly in its `imports` array, which provides `DatePipe`. A component declared
in a module that imports `CommonModule` can use `DatePipe` in its template — the pipe does not
need to be explicitly listed in `providers`. Verified by the successful production build (no
template compilation error). No fix needed.

`ApplicantPanelModule` also imports `CommonModule` directly (line 2 + line 78) as belt-and-
suspenders for the module's own declared components. Not needed for the card (declared in
SharedModule), but confirms belt-and-suspenders pattern is already in place.

---

### F6 — PASS: Global @keyframes inventory (no collisions with deployed names)
All existing project keyframe names:
- `gh-success-pulse-kf` (assets/styles/_motion.scss)
- `portal-hero-reveal`, `employer-hero-reveal`, `portal-seeker-hero-reveal` (public portal)
- `portal-waveform-shimmer`, `portal-match-pulse` (job-seeker portal)
- `emp-shimmer`, `emp-hero-reveal`, `emp-card-reveal` (company dashboard)
- `employer-cta-reveal` (job-board-employer-cta)
- `gh-snapshot-fadein`, `gh-shimmer`, `gh-app-shimmer` (job-applicants / applicant-applications)
- `locked-match-teaser-in`, `talent-proof-reveal` (shared components)
- `animate-title`, `animate-description`, `animate` (custom-profile-loader — scoped inside :host)
- Bootstrap globals: `progress-bar-stripes`, `spinner-border`, `spinner-grow`

None collide with `acb-shimmer`, `acb-fadein`, `acdc-shimmer`, or `acdc-fadein`.

---

## Summary Table

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| F1 | `getCurrentNavigation()` called in ngOnInit — always returns null | High | Fixed |
| F2 | Badge @keyframes prefix `acb-*` | Check | Pass — no collision |
| F3 | Card @keyframes prefix `acdc-*` | Check | Pass — no collision |
| F4 | Detail component SCSS import paths | Check | Pass — consistent |
| F5 | DatePipe / CommonModule availability for card template | Check | Pass — available |
| F6 | Global @keyframes inventory | Check | Pass — no collisions |

---

## Files Changed (Session 4)
| File | Change |
|------|--------|
| `src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts` | Moved router state reading from ngOnInit to constructor |

## Files Audited (No Change Needed)
- `application-completeness-badge.component.scss` — keyframes OK
- `application-completeness-card.component.scss` — keyframes OK
- `applicant-application-detail.component.scss` — import paths OK
- `application-completeness-card.component.html` — DatePipe OK
- `shared.module.ts` — CommonModule present
- `applicant-panel.module.ts` — CommonModule + SharedModule both imported

---

## Build Results

| Session | Result | Time | Notes |
|---------|--------|------|-------|
| 1 | PASS | — | |
| 2 | PASS | — | |
| 3 | PASS | 19161ms | |
| 4 | PASS | 27029ms | Hash: 051561e197aadd79 |

Pre-existing warnings (not introduced by any session):
- autoprefixer `start` value in `add-contact-group.component.scss`
- xlsx CommonJS optimization bailout in `excel-downloader.service.ts`
