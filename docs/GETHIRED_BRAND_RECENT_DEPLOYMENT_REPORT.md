# GetHired BRAND — Recent Deployment Review
**Scope:** Applicant Applications Snapshot UI — polish pass (FE 20a44c5, BE 422d340)
**Date:** 2026-06-24
**Reviewer:** BRAND command (post-deploy review)

---

## Summary

```
BRAND RECENT DEPLOYMENT completed: yes
Files changed: applicant-applications.component.html, applicant-applications.component.scss
States covered: loading: yes / success: yes / null: yes / error: yes
Visual polish fixes: 3
```

---

## State Coverage Audit

| State | Trigger | Template node | Status |
|---|---|---|---|
| Loading | `snapshotsLoaded === false` | `.app-snapshot-skeleton` (3-element shimmer) | PASS |
| Success | `snap.hasSnapshot === true` | `.app-snapshot-score` + `.app-snapshot-badge` + tip blocks | PASS |
| Null (pre-deployment app) | `snap.hasSnapshot === false` | `.app-snapshot-empty` italic message | PASS |
| Error (batch catchError → empty map) | `snapshotFor()` returns `null` | `#snapSilent` → `.app-snapshot-unavailable` | PASS |

All 4 states are correctly guarded. No regressions introduced by the batch-load refactor.

---

## Batch-Reveal Assessment

The batch call (`snapshotsLoaded` flag) replaces the previous `forkJoin` per-call pattern. All rows transition from skeleton to content simultaneously.

**Assessment: acceptable.** Simultaneous reveal is visually coherent — all skeletons appear together, all content appears together. No row is stranded in a loading state while adjacent rows display data. The `app-snapshot-fadein` animation (220ms, decelerate curve) softens the transition. Staggered per-row reveal would require re-introducing per-item observables — a larger architectural change than this scope permits.

---

## Fixes Applied

### Fix 1 — CTA margin-top (6px → 8px)

**File:** `applicant-applications.component.scss`

**Issue:** `.app-snapshot-cta` ("Update your profile →") had `margin-top: 6px`. The `<ul>` above has no bottom margin, placing the CTA immediately flush against the last `<li>`. It read as another list item rather than a distinct action link.

**Fix:** `margin-top: 8px` — 2px increase gives clear separation without over-spacing inside the amber tips box.

**Note on class:** `.app-snapshot-cta` is correct for this element. It is an `<a routerLink>`, not a `<button>`. Using `.btn-link-cta` would be semantically wrong (`.btn-link-cta` has `background: none; border: none; cursor: pointer` — button resets — not appropriate for an anchor element).

**Linter bonus:** A `&:focus-visible` rule was added to `.app-snapshot-cta` by the linter, providing a visible keyboard focus ring (`outline: 2px solid $color-global-red-buttons; outline-offset: 2px`). This was retained — it meets WCAG 2.4.7 and was not present before this pass.

---

### Fix 2 — Privacy note spacing between consecutive disclaimers

**File:** `applicant-applications.component.html` and `.scss`

**Issue:** Two `<p class="app-snapshot-disclaimer">` elements — `disclaimerNote` and `privacyNote` — both use `margin: 6px 0 0`. The second paragraph's `margin-top` is computed from the first paragraph's content edge, meaning zero gap between the two lines. They appeared as a single block of fine-print with no visual break.

**Fix (HTML):** Added BEM modifier class `app-snapshot-disclaimer--privacy` to the second paragraph.

```html
<!-- before -->
<p class="app-snapshot-disclaimer" *ngIf="snap.privacyNote">{{ snap.privacyNote }}</p>

<!-- after -->
<p class="app-snapshot-disclaimer app-snapshot-disclaimer--privacy" *ngIf="snap.privacyNote">{{ snap.privacyNote }}</p>
```

**Fix (SCSS):** Added `&--privacy { margin-top: 4px; }` nested inside `.app-snapshot-disclaimer`.

---

### Fix 3 — Privacy note de-emphasis via lighter color

**File:** `applicant-applications.component.scss`

**Issue:** Both disclaimer paragraphs shared `color: #9ca3af`, giving equal visual weight to the actionable disclaimer (which applicants should read) and the privacy note (secondary legalese). The bottom of each card felt like information overload with two indistinguishable fine-print lines.

**Fix:** `&--privacy { color: #b0b7c3; }` — a lighter grey that clearly subordinates the privacy note. The disclaimer remains readable at its current 10px size; the privacy note recedes without disappearing.

**Alternative considered and rejected:** Show `privacyNote` only on the first card (index === 0 in the `*ngFor`). Rejected — requires TypeScript logic change and `$index` wiring in the template; not a safe single-file fix.

---

## Arrow Glyph (F4 — no action required)

The `→` glyph was already wrapped in `<span aria-hidden="true">→</span>` by the linter between the prior read and this session. This is the correct pattern: screen readers announce "Update your profile" without the directional character; sighted users see the affordance. No further action required.

---

## Files Changed

| File | Change |
|---|---|
| `applicant-applications.component.html` | Added `app-snapshot-disclaimer--privacy` modifier class to privacyNote paragraph |
| `applicant-applications.component.scss` | `margin-top: 6px → 8px` on `.app-snapshot-cta`; added `&--privacy` block on `.app-snapshot-disclaimer` with `margin-top: 4px` and `color: #b0b7c3` |

---

## Top 5 Brand Findings

### 1. CTA visual separation from tip list (fixed)
The "Update your profile →" link sat 6px below the last bullet point — not enough to read as a distinct call-to-action. The amber-background tips block is compact (12px font, 8px padding), so even a small gap matters. 8px is the minimum to create a scannable visual break.

### 2. Two consecutive fine-print lines with no spacing (fixed)
`disclaimerNote` and `privacyNote` at 10px grey with zero gap between them read as one undifferentiated wall of micro-text. The 4px gap and color shift to `#b0b7c3` on the privacy note creates a clear two-tier hierarchy: "what this score means" (disclaimer) above "how your data is used" (privacy note).

### 3. Privacy note information overload (partially addressed)
The privacy note appears on every card in a list. On an applicant with 5+ applications, this means the same privacy legalese repeats 5+ times. The color de-emphasis reduces the visual noise. A more complete solution — showing the note only on the first card, or in a page-level callout — is deferred (requires TS logic change).

### 4. Batch reveal is coherent (no action)
Simultaneous skeleton-to-content transition across all rows is the correct UX choice for a batch API call. It sets user expectation that snapshot data loads as a group, not individually. The 220ms `app-snapshot-fadein` animation provides sufficient softening. No change needed.

### 5. Focus ring now present on CTA (linter addition, retained)
The "Update your profile" link previously had no `:focus-visible` style. The linter added `outline: 2px solid $color-global-red-buttons; outline-offset: 2px` — matching the brand red and meeting WCAG 2.4.7 (Focus Visible). This is a meaningful a11y improvement surfaced during this review pass.

---

## Deferred / Out of Scope

| Item | Reason deferred |
|---|---|
| Show `privacyNote` only on first card | Requires `$index` in `*ngFor` and TS binding — not a safe one-line fix |
| Collapsible privacy note | Requires toggle state and animation — architecture change |
| Per-row skeleton reveal | Requires restoring per-item observable chain — larger refactor |
| Upgrade CTA to `.btn-cta-primary` weight | Would shift visual hierarchy significantly; current secondary weight inside the amber tips box is intentional |

---

## ng build Note

All changes are SCSS and HTML only. No TypeScript modified.

Expected: clean build. Verification points:
- `&--privacy` nested inside `.app-snapshot-disclaimer` — valid SCSS BEM nesting, no new imports required
- `color: #b0b7c3` is a raw hex, not a Sass variable — resolves without import
- `margin-top: 8px` on `.app-snapshot-cta` — no dependencies

No new npm dependencies introduced.
