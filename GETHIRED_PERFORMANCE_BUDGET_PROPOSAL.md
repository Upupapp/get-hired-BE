# GETHIRED_PERFORMANCE_BUDGET_PROPOSAL.md
## QA Cycle 11 — Performance Budget Proposal

### Current bundle context
- Angular 13 + SSR enabled (`@nguniversal/express-engine`)
- Build target: production (`ng build --configuration=production`)
- No `ng build --stats-json` run available (auth-gated employer panel)

### Estimated chunk contributions (static analysis)

| Chunk | Estimated contribution | Notes |
|---|---|---|
| `recordrtc` | ~600KB (minified, pre-gzip) | Static top-level import in `RecordService (providedIn: 'root')` — in root bundle |
| `@angular/material` | ~400KB | Shared via MaterialComponentsModule |
| `chart.js` + `ng2-charts` | ~200KB | Likely pulled into shared bundle |
| `exceljs` | ~300KB | Large — check if only used in admin paths |
| `moment` | ~230KB | Used in recorder.service.ts + BE |
| `jspdf` + `html2canvas` | ~300KB | CV export features |
| `firebase` (JS SDK v9) | ~150KB tree-shaken | Used in auth |

### Proposed budgets

| Budget | Target | Warning threshold |
|---|---|---|
| Initial JS bundle (total gzipped) | < 300KB | > 400KB |
| Lazy chunk per route | < 150KB | > 200KB |
| LCP (auth-gated employer panel) | < 2.5s on 4G | > 3.5s |
| CLS score | < 0.1 | > 0.15 |
| API TTFB (`/api/interview/hub`) | < 500ms p95 | > 1000ms |
| API TTFB (`/api/message/threads`) | < 400ms p95 | > 800ms |

### Top bundle optimizations for follow-up (not in OPTIMIZE scope — out of safe/small/reversible)

1. **RecordRTC lazy-load:** Move `RecordService` out of `providedIn: 'root'`; provide it only in the `RecorderModule` lazy chunk. Estimated saving: 600KB from initial bundle. **Deferred — requires testing recorder flow end-to-end.**
2. **moment.js → date-fns:** `date-fns` already in dependencies; `moment` is ~230KB minified vs date-fns ~25KB for equivalent ops. Deferred — wide blast radius.
3. **exceljs tree-shake:** Move to lazy-loaded admin/CV-export module only. Deferred.
4. **jspdf / html2canvas:** Already likely lazy (CV export path) — verify with build stats.

### In-scope micro-budget win (this cycle)
- Add `width="38" height="38"` to avatar `<img>` — prevents browser from reserving unknown-size space.
- Add `min-height` to Interview Hub skeleton container — prevents layout reflow on data arrival.
