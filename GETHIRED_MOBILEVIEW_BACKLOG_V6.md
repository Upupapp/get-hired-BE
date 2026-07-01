# GETHIRED MOBILEVIEW — BACKLOG V6
**Date:** 2026-07-01 | Deferred items not fixed in V6

---

## Priority: MEDIUM

### A11y-V6-001 — `$gh-coral` (#FF5A36) contrast on white text
**Affected:** `.gh-setup-modal__btn--primary` (company setup modal CTA "Post your first job")
**Issue:** `#FF5A36` on `#fff` achieves approximately 3.4:1 contrast ratio. WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18px bold+). At `font-size: 14px; font-weight: 600` this is normal text — fails AA.
**Fix path:** Darken coral to #D94A22 (~4.6:1) or use navy (#0D1024) text on coral background. Requires brand sign-off.
**Note:** This is a pre-existing issue, not introduced in V6. Also noted in BRAND V6 SCSS comments.

### A11y-V6-002 — LinkedIn complete page: no `<title>` element verified
**Affected:** `/auth/linkedin-complete`
**Issue:** The component doesn't appear to set a page `<title>` via Angular Title service. Screen readers and tab bars show whatever the app's default title is ("GetHired") rather than "Completing sign-in — GetHired".
**Fix path:** Inject `Title` from `@angular/platform-browser` in `LinkedInCompleteComponent.ngOnInit()` and call `title.setTitle('Completing LinkedIn sign-in — GetHired')`.

### UX-V6-001 — LinkedIn button on iPad (768px): `max-width: 400px` may appear narrower than expected
**Affected:** LinkedIn button on signin/signup at 768px
**Issue:** The Google button uses GIS which renders at full row width. The LinkedIn button respects `max-width: 400px` (centered in the form card). The visual width may differ slightly between the two social buttons on iPad.
**Fix path:** Remove `max-width: 400px` from `--full` modifier or set it to match the GIS button rendered width. Low visual impact.

### UX-V6-002 — LinkedIn complete page: no safe-area-inset-bottom padding
**Affected:** `/auth/linkedin-complete` footer area on iPhone X+ (home indicator bar)
**Issue:** `.li-complete-wrap` uses `display: flex; align-items: center` so content is vertically centered, but on iPhones with notch/home indicator the card can sit behind the home indicator area.
**Fix path:** Add `padding-bottom: env(safe-area-inset-bottom, 16px)` to `.li-complete-wrap`.

---

## Priority: LOW

### INFRA-V6-001 — Company setup success modal: second dialog open call risk
**File:** `employer-settings.component.ts`
**Issue:** `panelClass` is now an array. If a future developer adds a second `dialog.open(EmployerCompanySetupSuccessModalComponent, ...)` call elsewhere and uses the old string form, the `:has()` fallback via `gh-bottom-sheet-pane` won't apply.
**Fix path:** Extract the dialog options to a constant at module level:
```typescript
const SETUP_SUCCESS_DIALOG_CONFIG = {
  disableClose: false,
  width: '520px',
  maxWidth: '96vw',
  panelClass: ['gh-setup-success-dialog', 'gh-bottom-sheet-pane'],
};
```

### PERF-V6-001 — LinkedIn button component: SVG path is inline
**Issue:** The LinkedIn icon SVG is inlined in the HTML with a full path. For a frequently rendered component, this could be extracted into a sprite or asset.
**Fix path:** Low priority — the button renders once per page. Not a mobile performance concern.
