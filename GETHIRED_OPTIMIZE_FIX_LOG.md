# GETHIRED_OPTIMIZE_FIX_LOG.md
## QA Cycle 11 — Fix Log

All fixes are small, safe, and reversible. No new features, no auth changes, no schema changes.

---

### FIX-1: Interview Hub skeleton min-height (CLS fix)

**File:** `get-hired-FE/src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.html`

**Change:** Added `style="min-height: 480px;"` to `.ih-skeleton-cards` wrapper div.

**Reason:** Skeleton block was ~300px tall while real content (3 cards with action buttons) is ~480px+. On data arrival, the skeleton is replaced by taller content causing a layout shift (CLS). The `min-height` reserves the approximate space so content arrival does not shift the page.

**Risk:** Low. Affects loading skeleton only. If 0 or 1 cards are returned, there will be extra empty space during the skeleton phase — acceptable trade-off.

---

### FIX-2: Emoji icons — add `aria-hidden` (accessibility)

**File:** `get-hired-FE/src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.html`

**Changes:**
- Empty state play icon (`&#9654;`): wrapped in `<span aria-hidden="true">` — parent div already has `aria-hidden="true"`
- Job icon emoji (`&#128188;`): changed `aria-label="Job"` to `aria-hidden="true"` — the surrounding text provides context
- Video badge play icon (`&#9654;`): wrapped in `<span aria-hidden="true">` — parent has `aria-label="Video answers submitted"`

**Reason:** Emoji characters without `aria-hidden` are announced by screen readers as their Unicode name (e.g. "black right-pointing triangle", "briefcase"). These are decorative icons — the surrounding text/aria-label provides the semantic meaning.

**Risk:** None. No visual change.

---

### FIX-3: Card action touch target (accessibility)

**File:** `get-hired-FE/src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.scss`

**Change:** Added `min-height: 44px;` to `.ih-action`.

**Reason:** Action link buttons in interview hub cards had a computed height of ~32px (7px + 14px padding + 1px border = ~33px). WCAG 2.5.5 Success Criterion recommends 44×44px minimum touch target.

**Risk:** Low. May slightly increase card heights when action buttons are present. No layout breakage expected — cards use `flex-direction: row` with `flex-wrap: wrap` for actions, so taller buttons just increase each card's action row height.

---

### FIX-4: Drawer close button touch target (accessibility)

**File:** `get-hired-FE/src/app/employer-panel/employer-panel.component.scss`

**Change:** Increased `.gh-drawer-close-btn` from `width: 40px; height: 40px` to `width: 44px; height: 44px`.

**Reason:** 40×40px is 4px below WCAG 2.5.5 target. Increasing to 44×44px meets the guideline. The drawer header (`min-height: 64px`) accommodates this increase without layout change.

**Risk:** None. 4px size increase on a close button in a fixed-position drawer.

---

### FIX-5: Interview Hub `getFilteredItems()` → cached `filteredItems` property (Angular perf)

**Files:**
- `get-hired-FE/src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.ts`
- `get-hired-FE/src/app/employer-panel/recruiter-interview-hub/recruiter-interview-hub.component.html`

**Changes:**
- Added `filteredItems: InterviewHubItem[] = []` property
- Added `private _applyFilter()` method that updates `filteredItems` — called on `loadHub()` success and `setFilter()`
- Changed `getFilteredItems()` to a thin wrapper returning `filteredItems` (kept for backward compat but now a no-op wrapper)
- Updated template `*ngFor` to iterate `filteredItems` directly
- Updated template `*ngIf` empty-filter check to read `filteredItems.length`

**Reason:** `getFilteredItems()` was called directly in the `*ngFor` and `*ngIf` directives. Angular's default change detection re-evaluates template expressions on every CD cycle. For 200 items, this ran a `.filter()` on every event (mouse move, click, input). Caching the result in a property means the filter only runs when data changes or the active filter changes.

**Risk:** Low. Logic is identical — only the timing of evaluation changed (now eagerly computed on filter change, not lazily on every CD tick). Tested mentally: `loadHub()` → `_applyFilter()` → `filteredItems` set before `loading = false` → template renders with correct data.

---

### FIX-6: Avatar `<img>` explicit width/height + error fallback (CLS + resilience)

**File:** `get-hired-FE/src/app/employer-panel/recruiter-messages/recruiter-messages.component.html`

**Original change (this OPTIMIZE pass):** Added `width="38" height="38"` to avatar `<img>`.

**Linter auto-enhancement:** The linter also added `(error)="t['_photoError'] = true"` and changed the `*ngIf` to `*ngIf="t.applicantPhotoUrl && !t['_photoError']"` with a corresponding `*ngIf="!t.applicantPhotoUrl || t['_photoError']"` on the initial span.

**Combined effect:**
- Explicit `width`/`height` lets the browser pre-allocate the 38×38px space even before the image loads — reduces CLS
- `(error)` handler flags broken/expired Firebase Storage URLs so the initial fallback renders instead of showing a broken image icon
- This is an improvement over the original fix — accepted as-is

**Risk:** None. Additive fallback — no change to the success path.
