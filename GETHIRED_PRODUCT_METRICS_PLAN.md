# GETHIRED PRODUCT METRICS PLAN
## QA Cycle 11

**Generated:** 2026-06-25

---

## North Star Metric
**Successful Matches:** Applicants who receive an interview invitation AND complete a video answer within 14 days of applying.

**Why this metric:** It captures value delivery for both sides — recruiter found a candidate worth inviting, applicant engaged with the interview. Proxy metrics (signups, applications) are leading; hires are lagging and hard to track. This is the sweet spot.

---

## Tier 1 — Acquisition Metrics (Public Portal)

| Metric | Source | Target (Beta) |
|--------|--------|--------------|
| Published job views / week | Server log `GET /api/job/published` count | 100+ |
| Job detail page views / week | Server log `GET /api/job/details` count | 500+ |
| Unique applicant signups / week | `POST /api/auth/signup` with role=3 success count | 20+ |
| Unique employer signups / week | `POST /api/auth/signup` with role=2 success count | 5+ |
| Job created / week | `POST /api/job/create` success count | 3+ |

---

## Tier 2 — Activation Metrics

| Metric | Source | Target (Beta) |
|--------|--------|--------------|
| Applicants who completed profile (>60%) | `/applicant/profile/completeness` > 0.6 | 50% of signups |
| Applicants who submitted at least 1 application | `job_applicants` row count per uid | 70% of signups |
| Employers who posted ≥1 job | `jobs` table row per company | 80% of employer signups |
| Employers who viewed ≥1 applicant | `GET /job/applicants` calls per company | 70% of employers |

---

## Tier 3 — Engagement Metrics (Recruiter Portal)

| Metric | Source | Target (Beta) |
|--------|--------|--------------|
| Recruiter messages sent / week | `POST /api/messages/thread/send` success count | 10+ |
| Recruiter threads opened / week | `POST /api/messages/thread` | 10+ |
| Interview hub pageviews / week | `GET /api/interview/hub` count | 20+ |
| Video answers viewed / week | FE video play event (needs instrumentation) | 10+ |
| Needs-reply threads actioned within 48h | `listRecruiterThreads` needsReply→0 delta | 70% |

---

## Tier 4 — Revenue Metrics

| Metric | Source | Target (Beta) |
|--------|--------|--------------|
| Subscription payment links created | `POST /api/payment/paymongopaymentlink` | 2+/week |
| Successful webhook events processed | `paymongoWebhook` `link.payment.paid` | 100% of attempts |
| Active company subscriptions | `company_subscriptions` active count | 2+ |
| Churn rate (subscriptions not renewed) | End of subscription date past + no renewal | <20% |

---

## Instrumentation Plan

### Phase 1 (Minimal — server-side logging, no new code)
- Add `console.info('[METRIC]', event, userId)` to key action points in controllers
- Parse logs in production to extract counts weekly
- Cost: 0 (reuse existing console.log infrastructure)

### Phase 2 (Structured metrics — recommended before public launch)
- Instrument with a lightweight event logger (custom or via Mixpanel/Amplitude free tier)
- Key events to track:
  - `job_view`, `job_apply`, `application_submitted`, `interview_hub_view`
  - `message_sent` (role: employer|applicant), `thread_opened`
  - `video_cv_uploaded`, `video_answer_submitted`
  - `subscription_created`, `payment_completed`
- Each event should carry: `userId`, `companyId` (if employer), `jobId` (if applicable), `timestamp`

### Phase 3 (Retention metrics — post-launch)
- Track D1/D7/D30 retention separately for employers and applicants
- Cohort analysis: of applicants who applied in week W, what % got an interview invite?
- Cohort analysis: of employers who posted in week W, what % hired within 30 days?

---

## Dashboard / Reporting

| Report | Frequency | Owner |
|--------|-----------|-------|
| Weekly active users (employers + applicants) | Weekly | Product |
| Applications per job (avg) | Weekly | Product |
| Message response rate (recruiter) | Weekly | Product |
| Payment conversion (link created → paid) | Weekly | Finance |
| Rate-limit 429s by tier | Daily | Engineering |
| Error rate by endpoint | Daily | Engineering |
