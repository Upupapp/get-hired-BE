# GETHIRED OPTIMIZE REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28 | **Code changes: 0 (all fixes deferred to next iteration — all are logic, not cosmetic)**

---

## Executive Summary

Performance/a11y/mobile/robustness audit scoped to the Easy Job Post Assistant V2. 
Two structural robustness issues found in the extraction service (P2): catch-all bullet 
detection and no extraction timeout. Both are logic-level improvements, not safe/cosmetic 
fixes — deferred to avoid destabilizing the just-deployed feature. 
Build is clean. No regressions detected. No unsafe changes.

---

## Performance Audit

### BE — Extraction Pipeline

| Concern | Finding | Severity |
|---|---|---|
| pdf-parse async | Uses Promise-based API — non-blocking ✅ | None |
| mammoth async | Uses Promise-based API — non-blocking ✅ | None |
| Buffer in memory (multer) | 10MB max buffer per request — acceptable for current traffic | P2 |
| No extraction timeout | No Promise.race() wrapping pdf-parse/mammoth — malformed file could hang | P2 |
| No concurrency limit | Node.js single-threaded event loop handles concurrency via async; cpu-bound pdf-parse could block event loop for large files | P2 |
| axios timeout | 8000ms explicit timeout on URL fetch ✅ | None |
| maxContentLength | 5MB on URL fetch ✅ | None |
| maxRedirects | 3 on URL fetch ✅ | None |

**Recommendation (deferred):** Wrap `pdfParse(buffer)` and `mammoth.extractRawText({buffer})` in a 30s timeout using `Promise.race()`. See SECURE report for implementation sketch.

### FE — Bundle Impact

| Concern | Finding | Severity |
|---|---|---|
| New FE files size | ~45KB compiled (3 TS files + template + SCSS) | None |
| Animation import | Only @angular/animations — already in bundle | None |
| No new dependencies | All angular Material already imported | None |
| Service is root-provided | Memory held until app session ends or clearExtractionResult() called | None |
| Correct cleanup | clearExtractionResult() called in job-create ngOnInit after consuming ✅ | None |
| takeUntil(destroy$) | Used on all HTTP subscriptions in modal ✅ | None |

### Core Web Vitals Impact

| Metric | Before | After | Delta |
|---|---|---|---|
| LCP (job-create page) | Unchanged | Unchanged | 0 |
| FID/INP (modal open) | Modal loads lazily via MatDialog — shares chunk | ~180ms fadeSlide animation | None |
| CLS | None expected | None expected | 0 |

---

## Extraction Quality Audit

### `extractBulletItems()` — Catch-All Clause (P2)

**Issue:** After scanning for bullet-prefix characters (-, *, •, digits+., A-Z+.) and exhausting all possible bullet patterns, the function falls through to:
```javascript
} else if (line.length >= 10 && line.length <= 200) {
  items.push(line);
}
```
This means any 10-200 char non-header line in a section gets added. For well-structured JDs this works fine. For narrative descriptions in the requirements section (e.g. "We are looking for a motivated individual who..."), this could produce false items.

**Recommended fix (non-breaking):**
```javascript
// Require at least N items from explicit bullets before falling back to catch-all
// Only use catch-all if no explicit bullets were found at all
var hasExplicitBullets = items.length > 0;
if (!hasExplicitBullets && line.length >= 10 && line.length <= 200) {
  items.push(line);
}
```
This preserves existing behavior for narrative-only sections while preventing bullet-false-positives in sections that already have real bullets.

**Status:** Open — logic change, not safe to apply without testing. Add to test suite first.

### `mapTextToJobFields()` — Requirements Length Guard (P3)

**Issue:** `requirements`, `goodToHave`, and `skills` arrays are returned without a max-items cap. A JD with an unusually long requirements section could return 50+ items, which in job-create would create 50+ FormArray entries.

**Recommended fix:** `.slice(0, 20)` on each array before returning.

**Status:** Open.

---

## Accessibility Audit

| Check | Status |
|---|---|
| role="dialog" on .eja-modal | ✅ |
| aria-labelledby + aria-describedby | ✅ |
| Close button aria-label | ✅ |
| Dropzone role="button" + tabindex="0" | ✅ |
| Dropzone keyboard (Enter/Space) activation | ✅ |
| File input sr-only + aria-label | ✅ |
| Error role="alert" | ✅ |
| Spinner aria-label | ✅ |
| Option buttons aria-describedby | ✅ |
| Icons aria-hidden | ✅ |
| Back button label specificity | ⚠️ "‹ Back" text — add aria-label="Back to import options" |
| Focus trap in modal | ✅ MatDialog handles this |
| ESC to close | ✅ MatDialog handles this |
| Spinner reduced motion | ✅ animation: none |
| Hover transform reduced motion | ✅ FIXED — guard added by BRAND command |

---

## Mobile Audit

| Check | Status |
|---|---|
| Dialog width | ✅ maxWidth: 96vw on MatDialog |
| Modal border-radius 0 at <560px | ✅ breakpoint in SCSS |
| Reduced padding at <560px | ✅ eja-header + eja-body paddings reduced |
| Drag-and-drop on mobile | ℹ️ Drag events don't fire on mobile — click still works (browse button) |
| 44px touch targets (option cards) | ✅ cards ≥60px height |
| 44px touch targets (buttons) | ✅ height: 46px |
| Close button 36×36px | ⚠️ Slightly under 44px — minor |
| Review field grid on small screens | ✅ column wraps via min-width: 80px |
| Long URL word-break | ✅ word-break: break-all on .eja-review-summary__label |
| Bottom safe area | ℹ️ No env(safe-area-inset-bottom) on buttons — low risk (modal, not fixed-position footer) |

---

## SEO Audit (Employer-Only Feature)

**No SEO impact.** This feature is employer-only and not accessible to web crawlers. All job posts created through this flow start as drafts. The public job listing endpoints are unaffected.

---

## Optimize Release Gate

| Gate | Status |
|---|---|
| A — Core Web Vitals | ✅ Pass |
| B — Angular/Bundle | ✅ Pass |
| C — Accessibility | ✅ Pass (reduced-motion fixed) |
| D — Mobile | ✅ Pass |
| E — SEO | N/A |
| F — Backend Efficiency | ⚠️ Caution (no timeout on extraction) |
| G — Maintainability | ✅ Pass |

**OPTIMIZE: GO WITH CAUTION — add extraction timeout (P2) in next iteration.**

---

## Fix Log

| ID | Action | Status |
|---|---|---|
| OPT-FIX-001 | Extraction timeout wrapper | Deferred — logic change |
| OPT-FIX-002 | extractBulletItems catch-all guard | Deferred — needs test coverage first |
| OPT-FIX-003 | Array .slice(0,20) cap on extraction results | Deferred — minor |
