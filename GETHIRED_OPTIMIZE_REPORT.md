# GETHIRED_OPTIMIZE_REPORT.md
## QA Cycle 11 — Optimization Report

**Date:** 2026-06-25
**Scope:** Interview Hub (B03), Mobile Sidebar (B02), Recruiter Messages avatar enrichment (B01), rate-limiting (server.js), message thread LEFT JOIN (message.service.js)

---

### Executive Summary

This OPTIMIZE cycle audited all 24 phases against the QA Cycle 11 deployment. 6 safe, small, reversible fixes were applied. All 6 release gates passed. No functional regressions, no auth changes, no schema changes, no secrets exposed.

The largest pre-existing risk identified (not introduced this cycle) is the pg connection pool of `max: 1`, which serializes all database queries and is the dominant performance bottleneck for the entire backend. This is documented in the backlog as OB-1.

The largest new architectural risk introduced this cycle is `RecordRTC` being included in the root Angular bundle via `RecordService { providedIn: 'root' }` — estimated ~600KB added to initial load. This is also documented in the backlog (OB-2) and was pre-existing before QA Cycle 11; the cycle only fixed an import case-sensitivity bug, not the bundling concern.

---

### Fixes Applied (6 total)

| # | Fix | File(s) | Category |
|---|---|---|---|
| FIX-1 | Skeleton min-height 480px to prevent CLS | `recruiter-interview-hub.component.html` | CWV / CLS |
| FIX-2 | Emoji icons `aria-hidden="true"` | `recruiter-interview-hub.component.html` | Accessibility |
| FIX-3 | Card action buttons `min-height: 44px` | `recruiter-interview-hub.component.scss` | Accessibility |
| FIX-4 | Drawer close button 44×44px | `employer-panel.component.scss` | Accessibility |
| FIX-5 | `getFilteredItems()` → cached `filteredItems` property | `recruiter-interview-hub.component.ts` + `.html` | Angular perf / CD |
| FIX-6 | Avatar `<img>` `width`/`height` + `(error)` fallback | `recruiter-messages.component.html` | CWV / CLS + resilience |

**Linter auto-improvements also applied (accepted):**
- SCSS shimmer animations fixed: skeleton chip/line now use proper `linear-gradient` + `background-size` so the shimmer motion is actually visible (was previously `background: #e5e7eb` solid = no visible animation despite `background-position` keyframes)
- Avatar error fallback enhanced: linter added `(error)="t['_photoError'] = true"` binding so broken/expired Firebase Storage URLs degrade gracefully to the initial letter avatar

---

### Audit Results by Phase

| Phase | Document | Key finding |
|---|---|---|
| Performance | GETHIRED_PERFORMANCE_AUDIT.md | Pool max:1 is dominant bottleneck; Interview Hub query acceptable at current scale; LEFT JOIN users adds negligible latency |
| Core Web Vitals | GETHIRED_CORE_WEB_VITALS_AUDIT.md | CLS risk from skeleton under-sizing (fixed); avatar img missing explicit dims (fixed); LCP and INP both clean |
| Performance Budget | GETHIRED_PERFORMANCE_BUDGET_PROPOSAL.md | RecordRTC in root bundle is top bundle concern; proposed budgets established |
| Angular Optimization | GETHIRED_ANGULAR_OPTIMIZATION_AUDIT.md | `getFilteredItems()` called in template on every CD tick (fixed); trackBy implemented; subscriptions clean |
| Accessibility | GETHIRED_ACCESSIBILITY_AUDIT.md | Emoji not aria-hidden (fixed); card actions under 44px (fixed); drawer close btn 40px (fixed); focus trap missing (backlog) |
| Mobile Responsiveness | GETHIRED_MOBILE_RESPONSIVENESS_AUDIT.md | Sidebar implementation thorough; z-index stack correct; safe-area insets applied |
| SEO | GETHIRED_SEO_READINESS_AUDIT.md | N/A — all changed routes are auth-gated; no public portal SEO regression |
| Backend Efficiency | GETHIRED_BACKEND_EFFICIENCY_AUDIT.md | Misleading `total` field in hub response; listRecruiterThreads missing LIMIT; both documented as backlog |

---

### Key Focus Areas — Answers

**1. Interview Hub skeleton — stable dimensions?**
Skeleton lines had fixed percentage widths and heights, but the skeleton cards container had no minimum height. Real content cards are ~160px each; 3 skeleton cards were ~100px each. CLS on load. Fixed with `min-height: 480px` on the skeleton cards wrapper. Motion-safe shimmer correctly applied with `@include ambient-motion-safe`.

**2. Mobile sidebar — z-index conflicts?**
No conflicts. Stack is: scrim (1000) < drawer/topbar (1001), bottom nav (999). Intentional: drawer covers everything. Touch targets: hamburger 44×44px (pass); drawer nav items 52px (pass); drawer close button was 40×40px (fixed to 44×44px). Focus management: enter on open, return to hamburger on close, Escape global handler — all implemented correctly.

**3. Rate-limiting — LIMIT 200 perf risk for large companies?**
LIMIT 200 is the correct guard given no pagination exists yet. The risk is not performance (the query is fast with LIMIT) but correctness: companies with >200 applications silently receive a truncated list. The `total` field in the response equals the returned count, not the true count — misleading. Documented as OB-3. Low immediate production risk given typical company size.

**4. Message threads LEFT JOIN latency — acceptable?**
Yes. `users` table is indexed on `uid` (PK). The LEFT JOIN adds one indexed key lookup per thread row. For 50 threads that's 50 key lookups — negligible. The LATERAL subquery for last_msg is already efficient. Total query latency impact: estimated <5ms additional over the un-enriched query.

**5. Avatar photo `<img>` — CLS risk?**
CLS risk was LOW (container fixed at 38×38px), not HIGH, because the image is constrained by parent CSS. However, explicit `width="38" height="38"` attributes are still best practice and allow the browser to reserve space before CSS loads. Fixed. Linter also added `(error)` handler for stale Firebase Storage URLs.

**6. RecordRTC — loaded on non-recorder pages?**
YES — `RecordService { providedIn: 'root' }` with a static top-level `import RecordRTC from 'recordrtc'` includes RecordRTC (~600KB) in the root Angular bundle. It loads on every page including login, public portal, and employer dashboard. Not introduced by QA Cycle 11 — the cycle only fixed an import case, not the bundling. Documented as backlog OB-2. Fix requires moving the service out of root scope and into a lazy recorder module.

---

### Top 5 Optimizations Completed

1. **Filtered items caching** — eliminated O(200) `Array.filter()` on every Angular change-detection cycle in the Interview Hub component
2. **Skeleton CLS fix** — reserved 480px height for interview hub skeleton so content arrival doesn't cause page layout shift
3. **Avatar CLS + error resilience** — added explicit `width`/`height` on avatar img + graceful fallback for broken/expired Firebase Storage URLs
4. **Touch target fixes** — brought card actions (32px→44px) and drawer close button (40px→44px) up to WCAG 2.5.5 minimum
5. **Skeleton shimmer bug fix** (linter) — skeleton animations were defined but invisible because solid background-color overrides background-position animation; fixed to use gradient + background-size

---

### Top 5 Remaining Risks

1. **pg pool `max: 1`** — all DB queries serialize. Any concurrent requests queue. A burst of 10 simultaneous users will see high latency on all API calls (OB-1)
2. **RecordRTC in root bundle** — ~600KB loaded on every page regardless of whether the user will record a video (OB-2)
3. **Interview Hub `total` field misleading** — `total: items.length` shows the capped count, not the true DB count. Companies >200 applications get truncated data with no indication (OB-3)
4. **No focus trap in mobile drawer** — Tab can leave the open drawer; screen reader users may lose context (A4 in a11y audit, OB-7)
5. **listRecruiterThreads no LIMIT** — will degrade for companies with large message thread counts (OB-4)

---

### Do Not Start (highest-risk warning)

**Do not touch `db/dbQuery.js` pool configuration without first testing on a staging environment under concurrent load.** A pool increase from `max: 1` is safe in principle but must be validated against connection limits on the Linode Postgres instance. An oversized pool can exhaust DB connections and crash the backend.
