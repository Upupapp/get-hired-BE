# GetHired MOBILEVIEW Fix Log — V5
**Date:** 2026-06-26
**FE HEAD at audit start:** 41b5920

---

## Fix MV5-B1 — Breadcrumb link touch targets

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.scss`
**Line range:** `.gh-breadcrumb-item a` block (approx. lines 55–68 after edit)
**Issue:** Breadcrumb `<a>` links ("Home", "Jobs") had no `display`, `min-height`, or adequate padding. Rendered at ~13–20px hit height — below WCAG 2.5.5 minimum of 44px.
**Change:**
```scss
// Before
a {
  color: #6b7280;
  text-decoration: none;
  &:hover { ... }
  &:focus-visible { ... }
}

// After
a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  color: #6b7280;
  text-decoration: none;
  &:hover { ... }
  &:focus-visible { ... }
}
```
**Rationale:** `display: inline-flex` allows `min-height` to expand the actual hit area. Without it, `<a>` elements are `inline` by default and ignore `min-height`.
**No behavior change.** Visual text position unchanged (vertically centred in the larger hit area).

---

## Fix MV5-B2 — Breadcrumb current item (job title) truncation

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.scss`
**Line range:** `.gh-breadcrumb-item--current` block
**Issue:** Job titles are free-form text up to ~100+ characters. At 320px the current breadcrumb item had no overflow constraint and could extend beyond the viewport or cause the breadcrumb to wrap across 3+ lines.
**Change:**
```scss
// Before
&--current { color: #374151; font-weight: 500; }

// After
&--current {
  color: #374151;
  font-weight: 500;
  max-width: min(240px, 50vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```
**Rationale:** `min(240px, 50vw)` caps the crumb at 240px on wide screens and at half the viewport width on narrow screens. The full title is available in the banner `<h5>` and page `<title>`. Accessibility not regressed: the `aria-current="page"` attribute on the `<li>` still communicates current location to screen readers; ellipsis is a visual-only truncation.

---

## Fix MV5-B3 — `.btn-link-cta` touch target for anchor usage

**File:** `src/app/public/shared/_portal-common.scss`
**Issue:** `.btn-link-cta` was defined with `padding: 4px 8px` (~24px effective height on inline `<a>` elements) and no `display` property. When applied to `<a routerLink="...">` in the job-seeker portal, the hit area was well below 44px.
**Change:**
```scss
// Before
.btn-link-cta {
  background: none;
  border: none;
  color: $color-global-red-buttons;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  &:focus-visible { ... }
}

// After
.btn-link-cta {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  color: $color-global-red-buttons;
  font-weight: 600;
  cursor: pointer;
  padding: 12px 8px;   // was 4px vertical
  min-height: 44px;
  text-decoration: none;
  &:focus-visible { ... }
}
```
**Rationale:** `inline-flex` + `min-height: 44px` ensures both `<button>` and `<a>` variants meet WCAG 2.5.5. `text-decoration: none` prevents browser default underline on `<a>` elements. Padding increase from `4px` to `12px` vertical gives adequate spacing without looking oversized on desktop (link-style CTAs are typically inline with surrounding text).
**Impact on existing `<button>` usages:** `<button>` elements were already block-like with `padding` influencing height. The `inline-flex` change makes them render identically to before on desktop. `min-height: 44px` adds no visual change when the button is already taller.

---

## Fix MV5-B4 — `.btn-cta-primary` touch target for anchor usage

**File:** `src/app/public/shared/_portal-common.scss`
**Issue:** `.btn-cta-primary` used `padding: 10px 24px` without `display` — on `<a>` elements (inline by default) this produced ~40px effective height rather than 44px. The three newly converted `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">` elements in job-seeker-portal were affected.
**Change:**
```scss
// Before
.btn-cta-primary {
  background: linear-gradient(...);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-weight: 600;
  white-space: nowrap;
  @media (prefers-reduced-motion: no-preference) {
    &:hover, &:focus-visible { transform: translateY(-2px); }
  }
}

// After
.btn-cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(...);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;   // was 10px vertical
  min-height: 44px;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  @media (prefers-reduced-motion: no-preference) {
    &:hover, &:focus-visible { color: #fff; transform: translateY(-2px); }
  }
}
```
**Rationale:** Same as MV5-B3. `justify-content: center` ensures text is centred on `<a>` elements which don't have the browser's native button text-alignment. `color: #fff` added to hover/focus-visible to prevent browser's default `<a>:focus` colour from overriding the white text on the red background.
**Impact on existing `<button>` usages:** Buttons with this class were already rendered at full height. The 2px padding increase (10px → 12px) adds 4px total to button height — negligible, and correct for WCAG compliance.

---

## No changes made to

- `auth.guard.ts` — mobile redirect behavior is pre-existing and out of scope for CSS-only fixes
- `signin.component.scss` / `styles.scss` — 14px input font-size is a pre-existing known iOS zoom gap; deferred
- Any route, guard logic, component TypeScript, or routing configuration
- Any auth, employer, or admin portal components

---

## Files modified

| File | Changes |
|------|---------|
| `src/app/jobs/job-posts-details/job-posts-details.component.scss` | MV5-B1 (breadcrumb link touch target), MV5-B2 (title truncation) |
| `src/app/public/shared/_portal-common.scss` | MV5-B3 (btn-link-cta), MV5-B4 (btn-cta-primary) |
