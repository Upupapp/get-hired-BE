# GETHIRED_OPTIMIZE_BACKLOG.md
## QA Cycle 11 — Optimization Backlog

Items deferred from this OPTIMIZE pass. Not safe/small/reversible enough for this cycle, or outside scope.

---

### HIGH PRIORITY

| ID | Title | Area | Effort | Risk | Notes |
|---|---|---|---|---|---|
| OB-1 | Increase pg pool `max` from 1 to 5-10 | BE | Low | Medium | Pool of 1 serializes all DB queries. Test on staging first to verify no connection leak. |
| OB-2 | `RecordRTC` lazy-load — remove from root bundle | FE | Medium | Medium | `RecordService { providedIn: 'root' }` + static import includes ~600KB in initial bundle. Move to lazy `RecorderModule` provided only in the interview answer flow. Requires end-to-end testing of video recording. |
| OB-3 | `getInterviewHub` — add `hasMore`/`totalCount` to response | BE | Low | None | Current `total` field is misleading (it's the count of returned items, not the true DB count). Add true total count with separate COUNT query or add `hasMore: boolean` flag when result length equals LIMIT. |
| OB-4 | `listRecruiterThreads` — add LIMIT + pagination | BE | Low | Low | No LIMIT on message thread query. A company with 1,000 threads returns all in one call. Add LIMIT 200 + page/cursor parameter. |

---

### MEDIUM PRIORITY

| ID | Title | Area | Effort | Risk | Notes |
|---|---|---|---|---|---|
| OB-5 | Interview Hub — cursor-based pagination | BE + FE | High | Medium | LIMIT 200 truncates data for large companies. Add cursor (last `updated_at` + `job_application_id`) for true pagination. |
| OB-6 | `interview_answers.applicant_id` index | BE | Low | None | Verify index exists. The derived GROUP BY subquery in `getInterviewHub` scans this column. Add `CREATE INDEX IF NOT EXISTS` if missing. |
| OB-7 | Mobile drawer — CDK FocusTrap | FE | Medium | Low | The drawer currently moves focus to first item on open but doesn't trap it. Add Angular CDK `FocusTrap` so Tab cycles within the drawer when open. |
| OB-8 | `RecruiterMessagesComponent` lazy-load | FE | Low | Low | Currently eager-loaded in `EmployerPanelModule`. Move to its own lazy child route for a smaller panel bundle. |
| OB-9 | `ChangeDetectionStrategy.OnPush` for hub and messages | FE | Low | Low | Both new components use Default CD. Both receive data via observables — ideal candidates for OnPush. |
| OB-10 | `moment.js` → `date-fns` in RecordService | FE | Medium | Medium | `moment` is ~230KB minified. RecordService uses it only for duration formatting. `date-fns/differenceInMinutes` + `date-fns/differenceInSeconds` replaces this. Wide blast radius since moment is used elsewhere. |

---

### LOW PRIORITY / FUTURE

| ID | Title | Area | Effort | Risk | Notes |
|---|---|---|---|---|---|
| OB-11 | Unread message count column | BE + FE | High | Medium | No `is_read` column in schema. The Messages inbox `Needs reply` filter is a proxy. A real unread count (schema migration + read-state tracking) would enable proper unread badges in bottom nav. |
| OB-12 | `exceljs` lazy-load | FE | Low | Low | Verify `exceljs` is only used in admin/CV export paths. If in shared bundle, move to lazy route. |
| OB-13 | Performance budget enforcement in CI | Infra | Medium | None | Add `ng build --budgets` size thresholds and break CI on violation. |
| OB-14 | Redis rate-limit store (multi-instance) | BE | Medium | Low | Current in-memory rate limiter resets on restart and doesn't share state across processes. Add `rate-limit-redis` if horizontally scaling. Already documented in server.js comment. |
| OB-15 | HTTP response caching headers for static assets | BE | Low | None | Ensure compiled Angular assets are served with appropriate `Cache-Control: immutable` by the Nginx/proxy layer. |
