# GETHIRED BRAND — EMPTY / FALLBACK SYSTEM (RECENT 3)
**Date:** 2026-06-26

---

## 1. Empty State Inventory

### 1.1 Job Detail — No Data States

The job detail page has no traditional "empty list" state — it shows either a specific job or an error. The error state (`job-detail-error-state`) serves as the fallback for missing/invalid jobs. See BRAND_ERROR_SYSTEM_RECENT_3.md.

### 1.2 Job Seeker Portal — Jobs Preview Empty State

**File:** `src/app/public/job-seeker-portal/job-seeker-portal.component.html`
**Class:** `.portal-jobs-fallback--upgraded`
**Content:** "Explore open roles on GetHired" heading + "Job previews are not available here right now, but you can browse all open roles on the job board." body + `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">Browse all jobs</a>`
**Visual:** `#fafafa` background, `16px` border-radius — consistent with bento card language.
**Status: CORRECT**

### 1.3 Global `.gh-skeleton` (transitional empty-to-content state)

**File:** `styles.scss`
**Purpose:** Communicates "content is arriving" during loading — a loaded skeleton is visually structured (prevents layout shift) before real content appears.
**Reduced-motion:** `@include ambient-motion-safe` + static grey fallback `#ececec`.
**Status: CORRECT**

---

## 2. Empty State Brand Principles

| Principle | Applied? |
|---|---|
| Empty states have actionable recovery CTAs | YES |
| Copy is honest (not fake) | YES — "not available here right now" is truthful |
| No fake content in empty slots | YES |
| Empty states use brand visual language (bento cards, brand colors) | YES |
| Primary CTAs in empty states have haptic class | YES — `gh-pressable` |

---

## 3. Gap Assessment

| Gap | Priority |
|---|---|
| Interview list has no empty state when a job has 0 interview questions | Low — section simply doesn't render (no "No questions yet" message) |
| Job tags card has no empty state (guarded by `*ngIf tags.length > 0`) | Acceptable — hidden is correct here |
| No global "network offline" empty state | Low — outside scope |
