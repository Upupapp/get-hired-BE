# GetHired Recruiter Interview Hub — Backlog V1

**Date:** 2026-06-25

---

## P0 — Launch Blockers (none)

No launch blockers identified. Build passes, BOLA hardened, no fake data.

---

## P1 — High Value (next sprint)

| Item | Effort | Notes |
|------|--------|-------|
| Unit tests: `RecruiterInterviewHubComponent` (4 states) | S | Component state machine is simple |
| Unit tests: `getInterviewHub` controller (BOLA + SQL) | S | Mock `getUserCompany` and `dbQuery` |
| Pagination: `LIMIT 200` → cursor-based | M | For high-volume employers |
| Status filter for hub: employer can update `application_status_id` directly from hub card | M | Needs `PUT /api/interview/hub/status` endpoint |

---

## P2 — Medium Value

| Item | Effort | Notes |
|------|--------|-------|
| Rate limiting: add `express-rate-limit` on `/api/interview/hub` | S | Repo-wide gap — applies to all endpoints |
| Analytics: wire `interview_hub_viewed` event | S | Once analytics infra confirmed in employer panel |
| Video answer inline count per job (not per applicant) | M | Requires grouping by job_id in query |
| Sort by job selector | M | Currently sorted by recency only |
| Hub search box: filter by applicant name | M | Client-side filter using existing `items` array |

---

## P3 — Low Value / High Effort

| Item | Effort | Notes |
|------|--------|-------|
| Real interview scheduling | XL | Requires new tables, calendar OAuth, invite flow |
| Recruiter notes/scorecard per applicant | L | New `interview_notes` table required |
| Video playback inline in hub | L | Need signed URL generation; privacy review required |
| Mobile haptics (`navigator.vibrate`) on card tap | S | Low priority (employer panel is desktop-first) |
| Interview stage pipeline (kanban) | XL | Requires dedicated stage tracking table |
| Bulk status update | M | Multi-select + batch PUT |

---

## Known Gaps Not in Backlog (by policy)

- Video AI analysis — NEVER
- Face/voice/emotion/personality scoring — NEVER
- Fake scheduling UI — NEVER (no backend)
- Cross-company data access — NEVER
