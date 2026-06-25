# GetHired Recruiter Interview Hub — Analytics Plan V1

**Date:** 2026-06-25

---

## Events to Track (Future)

No analytics instrumentation added in B03 — no analytics infrastructure confirmed in the employer panel. Events to wire up when GA/Mixpanel is confirmed:

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `interview_hub_viewed` | `ngOnInit` succeeds | `{ itemCount, hasVideoItems }` |
| `interview_hub_filter_changed` | `setFilter()` called | `{ filter: FilterKey }` |
| `interview_hub_card_view_applicants` | "View applicants" clicked | `{ jobId }` (no applicant PII) |
| `interview_hub_card_review_responses` | "Review responses" clicked | `{ jobId }` (no applicant PII) |
| `interview_hub_card_message` | "Message" clicked | `{ jobId }` |
| `interview_hub_error_retry` | `retry()` called | `{}` |
| `interview_hub_load_error` | API error | `{}` |

---

## Privacy Rules for Analytics

- Never log `applicantId`, `candidateId`, or any PII in analytics events
- `jobId` is acceptable — it's the employer's own job
- Counts (`itemCount`) are aggregate, not individual
- Follow `public-portal-analytics.service.ts` pattern for implementation

---

## Backlog

- Wire up `interview_hub_viewed` once analytics service confirmed in employer panel
- Consider funnel tracking: hub view → review responses → message (conversion metric)
