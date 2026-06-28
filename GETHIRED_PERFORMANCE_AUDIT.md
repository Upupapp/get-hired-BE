# GETHIRED_PERFORMANCE_AUDIT.md
## QA Cycle 11 — Performance Audit

### Scope
Audit covers: Interview Hub endpoint, message threads query (LEFT JOIN enrichment), rate-limiter stack, FE bundle / lazy-load topology, and the avatar `<img>` elements introduced in this cycle.

---

### BE — `GET /api/interview/hub`

**Query characteristics (interviewController.js L264-296):**

```sql
SELECT ... FROM job_applicants ja
  JOIN jobs j ON j.job_id = ja.job_id
  LEFT JOIN job_applicant_status s ...
  LEFT JOIN applicants_profile ap ...
  LEFT JOIN users u ON u.uid = ja.candidate_id
  LEFT JOIN (
    SELECT ia.applicant_id, COUNT(*) AS video_answer_count
    FROM interview_answers ia GROUP BY ia.applicant_id
  ) va ON va.applicant_id = ap.applicant_profile_id
WHERE j.company_id = $1 AND ja.is_archived IS DISTINCT FROM true
ORDER BY COALESCE(ja.updated_at, ja.date_applied) DESC
LIMIT 200
```

**Findings:**

| # | Finding | Severity | Notes |
|---|---|---|---|
| P1 | Correlated subquery `va` is a full table scan of `interview_answers` GROUP BY every call | Medium | For a small dataset (<5k rows) this is acceptable; for 50k+ rows it becomes expensive. No pagination yet. |
| P2 | `LIMIT 200` is a hard cap with no cursor/offset — large companies will silently miss records beyond row 200 | Medium | Not a perf bug per se but a correctness risk at scale |
| P3 | `COALESCE(ja.updated_at, ja.date_applied)` in ORDER BY prevents index use on either column alone | Low | Composite expression indexes possible but out of scope |
| P4 | `is_archived IS DISTINCT FROM true` — correct null-safe idiom but prevents simple `= false` index use | Low | Acceptable trade-off for correctness |
| P5 | `pool max: 1` (dbQuery.js L6) — single connection for all queries; serial execution at any concurrency | HIGH | Pre-existing; not introduced this cycle. Under load the interview hub query blocks all other queries |

**Verdict:** Query is acceptable for a company with <500 applications. LIMIT 200 is the right guard for now. The pool size of 1 is the dominant perf bottleneck for this entire backend.

---

### BE — `listRecruiterThreads()` (message.service.js L175-233)

**Query characteristics:**
```sql
SELECT ... FROM message_threads mt
  LEFT JOIN jobs j ON j.job_id = mt.job_id
  LEFT JOIN users u ON u.uid = mt.applicant_uid
  LEFT JOIN LATERAL (
    SELECT body, sender_role FROM messages
    WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1
  ) last_msg ON true
WHERE mt.company_id = $1
ORDER BY mt.updated_at DESC
```

**Findings:**

| # | Finding | Severity | Notes |
|---|---|---|---|
| M1 | LATERAL subquery per thread row — for N threads this is N+1 logically but Postgres executes it as a single plan; efficient | Low | Fine |
| M2 | LEFT JOIN users: new in this cycle; adds one hash/merge join pass | Low | Acceptable — users table is small and the join column `u.uid = mt.applicant_uid` should be indexed |
| M3 | No LIMIT on threads returned | Medium | A company with 10,000 message threads would return all of them in one response. Add LIMIT 200 (same as hub) in a follow-up |
| M4 | snippet truncated in JS to 120 chars on response — could be truncated in SQL to save wire bytes | Low | Minor optimization |

---

### BE — Rate-limiter stack (server.js)

| Tier | Window | Max | Assessment |
|---|---|---|---|
| Global | 15 min | 500 | Generous — correct for API-style usage |
| Auth (/api/auth) | 15 min | 20 | Tight — correct for brute-force defence |
| Write (POST/PUT/DELETE on /api) | 15 min | 100 | Reasonable |
| Sensitive (pw change/reset/archive) | 60 min | 10 | Appropriately strict |

**In-memory store note:** `express-rate-limit@6.11.2` uses in-memory store by default — resets on process restart and doesn't share state across multiple Node processes. Acceptable for single-server Linode deployment. Documented in server.js comment.

**Stacking behavior:** A write request to `/api/auth/changepassword` is counted by all 4 tiers. The effective limit is `min(500, 20, 100, 10) = 10` per hour. Correct — most restrictive wins.

---

### FE — Bundle / lazy-load topology

| Module | Loading | Notes |
|---|---|---|
| `EmployerPanelModule` | Lazy (`loadChildren`) | Correct |
| `EmployerInterviewModule` → `RecruiterInterviewHubComponent` | Lazy (`loadChildren` inside panel) | Correct |
| `RecruiterMessagesComponent` | Eager within `EmployerPanelModule` | RISK: not lazy-loaded — adds to the panel chunk |
| `RecordService` / `RecordRTC` | Eager in `RecordService` (`providedIn: 'root'`) | RISK: RecordRTC (~600KB unparsed) is in the root bundle |
| `RecorderModule` | Not imported by EmployerPanelModule or SharedModule directly | Module exists but RecordRTC tree-shaking depends on usage |

**RecordRTC finding:** `RecordRTC` is imported at the top of `recorder.service.ts` as a static top-level import. Since `RecordService` is `providedIn: 'root'`, Angular includes it in the root bundle on every page load regardless of whether the user visits a page that uses the recorder. Estimated impact: +~600KB to initial JS parse budget.

---

### FE — Avatar `<img>` CLS risk (recruiter-messages.component.html L98-99)

```html
<img *ngIf="t.applicantPhotoUrl" [src]="t.applicantPhotoUrl"
  alt="" class="rm-thread-avatar-img" loading="lazy">
```

**Finding:** No `width` or `height` attributes. The container `.rm-thread-avatar` is 38×38px (fixed in SCSS), so the img is constrained by `width: 100%; height: 100%; object-fit: cover`. Browser can determine layout size from the parent — **CLS risk is LOW** because the container has explicit dimensions. However, explicit `width="38" height="38"` on the `<img>` is still best practice and improves rendering certainty.

---

### FE — Interview Hub skeleton (recruiter-interview-hub.component.scss)

Skeleton cards have fixed padding `18px 20px` and flex column layout. The `.ih-skeleton-line` elements have explicit `width` percentages and `height: 12px`. No `min-height` on the skeleton container means if the 3 skeleton cards are shown, the skeleton area has approximately `3 × (12+10+12+10+12+18+18 + gaps) ≈ 300px`. The real content cards are taller (due to action buttons). This means there will be a layout shift when the skeleton is replaced by real content: skeleton ~300px → content ~450px+. **Skeleton height is under-estimated — medium CLS risk.**
