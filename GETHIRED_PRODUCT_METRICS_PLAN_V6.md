# GETHIRED PRODUCT METRICS PLAN — V6
**Date:** 2026-07-01 | **Scope:** Activation, engagement, retention, revenue, and technical health metrics

---

## Metric Framework

GetHired tracks metrics across four lenses:
1. **Acquisition** — how users find and arrive at GetHired
2. **Activation** — do they complete the core value action?
3. **Engagement** — do they return and use the product?
4. **Revenue** — do employers pay and retain?

---

## 1. Acquisition Metrics

| Metric | Definition | Target (3 months post-launch) | Source |
|---|---|---|---|
| Organic search impressions | Total impressions in Google Search Console | Tracking baseline | GSC |
| Organic click-through rate | Clicks / impressions | >2% on job detail pages | GSC |
| Jobs appearing in Google Jobs | Count of JobPosting rich results indexed | >50% of active jobs | GSC Rich Results |
| Social share click-through | Clicks from LinkedIn/Facebook OG shares | Tracking | UTM params |
| Direct traffic % | Direct / total sessions | >30% (brand recall signal) | Analytics |
| Referral traffic | Inbound links driving sessions | Tracking | Analytics |

**Instrumentation needed:**
- Google Search Console property (PACK-A.3)
- JobPosting JSON-LD on job detail pages (PACK-E.1)
- OG image for social shares (PACK-C)
- UTM parameter tracking on social CTAs

---

## 2. Auth / Onboarding Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Google sign-in rate | Google OAuth completions / total sign-in attempts | >30% (post One Tap) | Firebase Auth |
| LinkedIn sign-in rate | LinkedIn OIDC completions / total sign-in attempts | >15% | Firebase Auth |
| Email sign-in rate | Email/password completions | Decreasing over time | Firebase Auth |
| Sign-in error rate | Failed auth attempts / total | <5% | BE logs |
| 409 collision rate | Email-already-exists per auth type | Track for account-linking decision | BE logs |
| Role selection completion | Users reaching role-classification who complete role choice | >95% | Analytics |
| Company setup completion | Employers who complete company setup modal | >80% | Analytics / DB |

**Instrumentation needed:**
- Log auth method on successful sign-in (ACT-010 — provider column)
- Log 409 occurrences by auth provider
- Event tracking on role selection screen

---

## 3. Applicant Activation Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Profile completion rate | % of applicants with >80% profile score | >60% in 30 days | ProfileQualityService |
| CV upload rate | % of applicants who upload a CV | >50% | DB / analytics |
| First application submitted | % of new applicants who apply to a job within 7 days | >40% | DB |
| Match score engagement | % of applicants who view match score on a job | Tracking | Analytics |
| CV Doctor usage rate | % of applicants who use CV Doctor | Tracking (post-wiring) | Analytics |

**Instrumentation needed:**
- Wire ProfileQualityService to dashboard (AX-ACT-001)
- Track CV Doctor usage after AX-ACT-003

---

## 4. Employer Activation Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Time to first job posted | Minutes from employer sign-up to first published job | <30 min | DB timestamps |
| Company setup completion | % of employers who complete company setup modal | >80% | DB / sessionStorage |
| Job quality score at publish | Average job completeness score when published | >75% | Job quality service |
| Cert/license requirements usage | % of jobs with at least one cert/license requirement | Tracking | DB |
| Easy Job Post usage rate | % of employers who use AI job post extraction | Tracking | BE logs |

**Instrumentation needed:**
- Timestamp `company_setup_acknowledged` in DB (GH-ACT-090)
- Log Easy Job Post usage events

---

## 5. Engagement Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Employer return rate (7-day) | % of employers who log in again within 7 days | >50% | Analytics |
| Applicant return rate (7-day) | % of applicants who log in again within 7 days | >40% | Analytics |
| Applications per job | Average applications received per active job | >5 in 30 days | DB |
| Employer response rate | % of applications that receive a status update | >30% | DB |
| Messages sent per job | Average messages sent per job (employer-applicant) | Tracking | DB |

**Instrumentation needed:**
- Messages widget wired (PACK-H)
- Application status update tracking

---

## 6. Revenue Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Subscription activation rate | % of employers who subscribe after posting a job | >15% | PayMongo + DB |
| Subscription conversion time | Days from employer sign-up to first subscription | <14 days | DB timestamps |
| MRR (Monthly Recurring Revenue) | Total active subscription value per month | Track from day 1 | PayMongo dashboard |
| Churn rate | Subscriptions cancelled / active subscriptions | <10%/month | PayMongo webhooks |
| Failed webhook rate | PayMongo webhook 4xx/5xx rate | 0% (all 200) | BE logs |

**Instrumentation needed:**
- Confirm PAYMONGO_WEBHOOK_SECRET on Linode (GH-ACT-091)
- Log webhook events with outcome in PM2 logs

---

## 7. Technical Health Metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Core Web Vitals — LCP | Largest Contentful Paint on /jobs/:id | <2.5s | Chrome UX Report |
| Core Web Vitals — CLS | Cumulative Layout Shift | <0.1 | Chrome UX Report |
| Core Web Vitals — FID/INP | First Input Delay / Interaction to Next Paint | <200ms | Chrome UX Report |
| 404 rate on job pages | % of job detail page requests returning 404 | 0% for active jobs | Nginx logs |
| API error rate | 5xx responses / total API requests | <0.5% | PM2 / nginx logs |
| DB pool wait time | Average wait time for DB connection | <100ms | Postgres pg_stat |
| Rate limit hit rate | 429 responses / total requests | Track (too high = bot attack) | BE logs |

**Instrumentation needed:**
- HTTP 404 on expired jobs (PACK-E.2)
- SVG width/height for CLS (PACK-E — PP-ACT-005)
- isPlatformBrowser for SSR quality (PACK-E.3)

---

## 8. Metrics Dashboard Recommendation

| Tool | Purpose | Cost |
|---|---|---|
| Google Search Console | Search impressions, rich results, indexing | Free |
| Google Analytics 4 | Session tracking, funnel analysis, events | Free |
| PayMongo Dashboard | Revenue, subscription, churn | Free (included) |
| PM2 logs | API error rate, rate limit hits | Free (already running) |
| Postgres pg_stat | DB pool, query performance | Free (already running) |

**Not recommended yet:** Paid APM tools (Datadog, New Relic) — overkill for single-node Linode. Revisit when traffic > 10K sessions/day.

---

## Metrics Instrumentation Priority Order

1. Google Search Console setup (PACK-A.3) — free, immediate SEO visibility
2. PayMongo webhook confirmation (GH-ACT-091) — revenue tracking depends on this
3. JobPosting JSON-LD (PACK-E.1) — Google Jobs impressions start accruing
4. Provider column in user_credentials (ACT-010) — auth method analytics
5. Company setup DB acknowledgement (GH-ACT-090) — employer activation funnel
6. Messages widget wired (PACK-H) — engagement metric completeness
