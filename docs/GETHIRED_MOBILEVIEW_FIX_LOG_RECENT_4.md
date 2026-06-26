# GETHIRED MOBILEVIEW FIX LOG — RECENT_4
**Date:** 2026-06-26
**Pass:** MOBILEVIEW_RECENT_4

---

## FIX 1 — Result panel: failed-list scroll cap
**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.scss`
**Type:** CSS addition
**WCAG:** 1.4.10 Reflow / 2.4.3 Focus Order

**Problem:** `.result-panel__failed-list` had no `max-height` or `overflow-y`. A large batch failure (20–50 emails) could extend the panel beyond the viewport height on a 360px screen, with no scrolling affordance and content clipped below the fold.

**Fix applied:**
```scss
&__failed-list {
  max-height: 180px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

**Rationale:** 180px shows approximately 8–10 email items — enough context without dominating the dialog. `-webkit-overflow-scrolling: touch` enables momentum scrolling on iOS Safari. The list is still fully accessible via keyboard tab (scrollable region is inherently keyboard-scrollable).

---

## FIX 2 — Result panel: btn-sm touch target
**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.scss`
**Type:** CSS addition
**WCAG:** 2.5.5 Target Size

**Problem:** Action buttons in `.result-panel__actions` use `class="btn btn-primary btn-sm"` and `class="btn btn-outline-secondary btn-sm"`. Bootstrap's `btn-sm` sets `padding: .25rem .5rem; font-size: .875rem` — producing approximately 28px height. Global `.btn-primary { min-height: 44px }` in styles.scss does NOT cascade into component-local classes, and the component's own `.btn-primary` rule uses `padding: 12px 20px` which would give 44px — but the `btn-sm` class specificity conflict makes the outcome unpredictable. Safest path: explicit override at the actions container level.

**Fix applied:**
```scss
&__actions .btn {
  min-height: 44px;
  padding-top: 10px;
  padding-bottom: 10px;
}
```

**Rationale:** Scoped to `.result-panel__actions .btn` to avoid side-effects on other buttons. `flex-wrap gap-2` in the HTML ensures buttons reflow to 2–3 rows on 360px rather than overflowing horizontally.

---

## FIX 3 — Snackbar word-break on narrow screens
**File:** `src/styles.scss`
**Type:** CSS addition
**WCAG:** 1.4.10 Reflow

**Problem:** No explicit word-break rule on `.mat-snack-bar-container`. Angular Material's internal snackbar container can default to `white-space: pre-wrap` in some theme configurations, meaning a long error message (e.g., a URL or token in the toast) could overflow horizontally at 360px and be clipped.

**Fix applied:**
```scss
// MOBILEVIEW_RECENT_4
.mat-snack-bar-container {
  word-break: break-word;
  white-space: normal;
}
```

**Rationale:** `word-break: break-word` is safe — it only activates when a word is wider than its container. Normal short messages are unaffected. `white-space: normal` ensures Angular Material's defaults don't re-introduce pre-wrap from theme inheritance.

---

## FIX 4 — company-banner.component.ts: SSR document access crash
**File:** `src/app/views/home/pages/company-details/components/company-banner/company-banner.component.ts`
**Type:** TypeScript fix
**Severity:** P1 — SSR crash on company details page

**Problem:** `ngOnInit` called `document.getElementById('bg-details')` with no `isPlatformBrowser` guard. On Angular Universal / SSR, `document` is not defined in the Node.js environment. This crashes the SSR render of any company details page, causing a 500 error for SSR-rendered pages (affects SEO crawl + first-paint for anonymous users).

**Before:**
```typescript
constructor() { }

ngOnInit(): void {
  this.firstSentence = this.companyData?.description  
  let banner_sub_id = document.getElementById('bg-details'); 
  let bannerHeight = banner_sub_id?.offsetHeight + 65;
  this.bannerHeight = bannerHeight;
}
```

**After:**
```typescript
constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

ngOnInit(): void {
  this.firstSentence = this.companyData?.description;
  if (isPlatformBrowser(this.platformId)) {
    const banner_sub_id = document.getElementById('bg-details');
    const bannerHeight = (banner_sub_id?.offsetHeight ?? 0) + 65;
    this.bannerHeight = bannerHeight;
  }
}
```

**Rationale:** `bannerHeight` is used for a CSS binding on the banner container. When undefined during SSR, the element simply has no dynamic height set — the CSS static layout handles it. No visual regression on server-rendered HTML. Browser hydration immediately picks up the correct value after the page loads.

---

## Changes summary

| File | Type | Size |
|---|---|---|
| `import-add-user.component.scss` | CSS additions (2 blocks) | +18 lines |
| `styles.scss` | CSS addition (1 block) | +8 lines |
| `company-banner.component.ts` | TypeScript fix (constructor + ngOnInit) | +6 lines net |
