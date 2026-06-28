# GETHIRED_CORE_WEB_VITALS_AUDIT.md
## QA Cycle 11 — Core Web Vitals Audit

Baseline: No Lighthouse run available (employer panel is auth-gated). Audit is static code analysis only.

---

### LCP (Largest Contentful Paint)

**Employer Panel — Interview Hub route (`/recruiter/interview`)**

- LCP candidate: `.ih-title` (h1) or first `.ih-card` — rendered after API response
- Current path: Auth check → `employee$` observable → `getInterviewHub()` HTTP call → render
- No image as LCP; text is LCP — typically fast once JS hydrates
- `EmployerInterviewModule` is lazy-loaded — the module JS must be fetched, parsed, and executed before the hub renders. Adds 1 round trip (chunk fetch).
- **Assessment:** LCP is API-latency-bound, not resource-bound. No LCP issues introduced this cycle.

**Messages route (`/recruiter/messages`)**

- `RecruiterMessagesComponent` is eagerly loaded inside `EmployerPanelModule`. No extra chunk fetch.
- LCP candidate: `.rm-page-title` (h1) or skeleton rows — appear immediately from the component loading state.
- **Assessment:** Good. Skeleton is visible within the same chunk load.

---

### CLS (Cumulative Layout Shift)

| Element | CLS risk | Detail |
|---|---|---|
| Avatar `<img>` (messages) | Low | Container `.rm-thread-avatar` is 38×38px fixed. Image constrained. Explicit `width`/`height` attrs missing but CLS impact is minor. |
| Interview Hub skeleton cards | Medium | Skeleton block is ~300px; real content block is ~480px+. Height jump on load. Add `min-height` matching estimated content height to skeleton wrapper. |
| `ih-header` animate | Low | `animation: ih-fadein` applies `translateY(8px)→0` — this is a transform-only animation, not a layout trigger. No CLS. |
| `rm-page-reveal` animation | Low | Same — transform-only, no CLS. |
| Filter chips appearing after load | Low | Content area guarded by `*ngIf="!loading && !error && items.length > 0"` — the chip row appears all at once. No CLS within the content block. |
| Mobile drawer slide-in (`translateX`) | None | Transform-only, fixed position. Zero CLS. |

**Top CLS risk: Interview Hub skeleton under-sizing.** Fix: add `min-height: 480px` to `.ih-skeleton-cards` to match a 3-card real content estimate.

---

### FID / INP (Interaction to Next Paint)

| Interaction | Assessment |
|---|---|
| Filter chip click (Interview Hub) | Pure JS `setFilter()` call + `getFilteredItems()` array filter — synchronous, O(n) on items (max 200). No INP concern. |
| Thread row click (Messages inbox) | `selectThread()` sets two properties and triggers Angular CD. Negligible cost. |
| Mobile hamburger tap | `openMobileNav()` toggles boolean + 200ms `setTimeout` for focus. Fast. |
| Escape key (drawer close) | `@HostListener('document:keydown.escape')` — immediate boolean toggle. No INP concern. |
| `retry()` on error | Calls `loadThreads()` / `loadHub()` which starts a new HTTP observable. Non-blocking. Fine. |

---

### TTFB (Time to First Byte)

- `compression` middleware applied globally (server.js L88) — gzip enabled for all responses. Good.
- `express-rate-limit` adds <1ms overhead per request. Negligible.
- No caching headers on `/api/interview/hub` or `/api/message/recruiter-threads`. All data is dynamic and user-specific — client-side cache is inappropriate. Acceptable.

---

### Overall CWV readiness

| Metric | Status | Blocker |
|---|---|---|
| LCP | Ready with caution | API latency is the variable; no structural LCP blockers |
| CLS | Needs cleanup | Interview Hub skeleton under-sizing; avatar img missing explicit dimensions |
| FID/INP | Ready | All interactions are synchronous and lightweight |
| TTFB | Ready | Compression active; no unnecessary middleware overhead |
