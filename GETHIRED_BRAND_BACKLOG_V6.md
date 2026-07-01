# GETHIRED BRAND BACKLOG V6
**Date:** 2026-07-01

---

## Priority P1 — Fix Within 1 Sprint

### B-V6-001: Modal Primary Button Contrast (WCAG Blocker)
**Issue:** `#FF5A36` on white text = 3.4:1 — fails WCAG 1.4.3 AA (requires 4.5:1)
**File:** `employer-company-setup-success-modal.component.scss`
**Options:**
1. Use navy (`#0D1024`) as primary, coral as secondary — architecturally clean
2. Use dark text (`#3D0A00`) on coral button — preserves coral CTA identity
3. Darken coral to `#D94025` (achieves 4.5:1 vs white) — significant color shift
**Recommendation:** Option 1 (navy primary) — most accessible, brand-consistent

### B-V6-002: Eyebrow #10B981 Contrast (WCAG)
**Issue:** `#10B981` on white = ~3.0:1 — fails for 12px non-bold text
**File:** `employer-company-setup-success-modal.component.scss`
**Fix:** Change `$gh-success` in eyebrow to `#059669` (emerald-600, ~4.5:1 vs white)
**Note:** Check icon and check-bubble still use `#10B981` — those are graphical, not text, so 3:1 rule applies ✅

### B-V6-003: LinkedIn Complete — Loading Title Missing
**Issue:** No heading element above spinner on loading state. Generic "Connecting..." label only.
**Fix:** Add `<p class="li-complete-heading">Connecting your LinkedIn account…</p>` (16px, 600, navy)
**File:** `linkedin-complete.component.html` + SCSS

### B-V6-004: LinkedIn Complete — Error Entrance Animation
**Issue:** Error state has no entrance animation — appears abruptly
**Fix:** Add `.li-complete-error { animation: gh-fade-up 0.3s ease both; }` or inline fade-in

### B-V6-005: Haptics — LinkedIn Auth
**File:** `linkedin-complete.component.ts`
**Calls needed:**
- `this.haptic.success()` on auth success (before navigation)
- `this.haptic.error()` on error state shown

### B-V6-006: Haptics — Setup Modal
**File:** `employer-company-setup-success-modal.component.ts`
**Calls needed:**
- `this.haptic.success()` on modal mount (ngOnInit)
- `this.haptic.medium()` on primary CTA click

---

## Priority P2 — Next BRAND Command

### B-V6-007: Move gh-pop-in + gh-fade-up to Global _motion.scss
**Rationale:** Reusable for future success/celebration moments. Currently duplicated in modal component.
**Action:** Extract to `_motion.scss`; component imports via `@include` or class reference.

### B-V6-008: Modal Animations — Use CSS Custom Properties
**Issue:** `cubic-bezier(0.34, 1.56, 0.64, 1)` hardcoded; should use `var(--gh-ease-spring-soft)`
**Low priority** — values match tokens; token system purity only.

### B-V6-009: Setup Modal Focus Ring — Coral Alignment
**Issue:** `:focus-visible` uses `$gh-azure (#168BFF)` not coral. Not a WCAG failure but brand inconsistency.
**Fix:** Change to `outline: 2px solid rgba(255,112,98,0.72); outline-offset: 3px;`

### B-V6-010: Add .gh-spinner Global Class
**Rationale:** LinkedIn complete page uses local `.li-complete-spinner`. A global `.gh-spinner` would standardize loading across all callback pages.
**Action:** Define in `_motion.scss` or new `_components.scss` partial.

### B-V6-011: LinkedIn Complete — Page Background Token
**Issue:** `background: #f8f9fa` — close to `--gh-bg: #F6F7FB` but not using token
**Fix:** `background: var(--gh-bg, #F6F7FB)` — 1-line fix

### B-V6-012: LinkedIn Complete — Card Radius Token
**Issue:** `border-radius: 12px` — brand standard is `18px` (`--gh-radius-card`)
**Fix:** `border-radius: 18px`

### B-V6-013: LinkedIn Complete — Token Usage Throughout
**Issue:** File uses all raw hex values. Should reference `var(--gh-*)` tokens.
**Fix:** Global refactor of file to use tokens — medium effort.

### B-V6-014: gh-offline-banner Component
**Need:** No offline banner exists. Documented in Offline/Degraded System V6.

### B-V6-015: LinkedIn Infinite Spinner Timeout
**Need:** If network drops during callback, spinner runs forever.
**Fix:** Set 15s timeout in TypeScript `ngOnInit` — show error state after timeout.

### B-V6-016: Empty State Global SCSS Class
**Need:** `.gh-empty-state` class defined in Empty/Fallback System V6 doc but not implemented.

---

## Carryover from V5 Backlog (Still Open)

| Item | Status |
|---|---|
| Role card selected state aria-checked | Open |
| Submit button coral gradient on role classification | Open |
| Haptic calls in Google auth flows | Open |
| "or" divider contrast check in signin/signup | Open |
| Role classification page heading size | Open |
