# GetHired — Product Metrics Plan RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Analytics sections in GETHIRED_EMPLOYER_ACTIVATION_METRICS_PLAN_V5.md and GETHIRED_EMPLOYER_ANALYTICS_INSTRUMENTATION_PLAN_V4.md
**Scope:** Metrics to track post-public-launch; how to know the platform is working

---

## Metrics Strategy Overview

Three metric tiers:
1. **Health metrics** — Is the system running correctly?
2. **Growth metrics** — Are we acquiring users?
3. **Activation metrics** — Are users getting value?

---

## Tier 1: Health Metrics (Monitor from Day 1)

| Metric | Source | Target | Alert Threshold |
|---|---|---|---|
| BE uptime | PM2 / Linode | 99.9% | < 99% in 24h |
| BE error rate | PM2 logs | < 1% 5xx responses | > 5% in 1h |
| PayMongo webhook success rate | PM2 logs `[paymentController]` | 100% | Any 400 response |
| Firebase auth success rate | BE logs | > 99% | < 95% in 1h |
| DB query latency | Supabase dashboard | p95 < 500ms | p95 > 2s |
| Angular SSR TTFB | Lighthouse / manual | < 1.5s | > 3s |
| FE deploy success | GitHub Actions | 100% | Any failed deploy |

### How to Monitor

**PM2 error monitoring (daily):**
```powershell
ssh root@139.162.11.242 "pm2 logs --lines 100 | grep -E 'ERROR|5[0-9]{2}'"
```

**PayMongo webhook monitoring:**
```powershell
ssh root@139.162.11.242 "pm2 logs --lines 100 | grep paymentController"
```

---

## Tier 2: Growth Metrics (Weekly)

| Metric | Source | Target (Month 1) |
|---|---|---|
| Organic job searcher sessions | Google Analytics / GSC | Growing week-over-week |
| Job detail page clicks from search | Google Search Console | > 0 (confirms indexing) |
| Job detail to apply conversion | GA4 funnel | > 2% |
| Employer signups | BE logs / Supabase | Any employer signup |
| Job posts created | Supabase | Any active job post |
| Applications submitted | Supabase | Any application |

### Google Search Console Setup (Already Done)

Property verified. Check weekly:
- Coverage report: are jobs being indexed?
- Rich results: are JobPosting schema errors showing?
- Core Web Vitals: CLS, LCP, FID/INP scores
- Top queries: what are people searching for to find GetHired?

---

## Tier 3: Activation Metrics (Monthly)

### Employer Activation Funnel

| Stage | Event | Metric Name |
|---|---|---|
| Signup | Employer creates account | `employer_signup` |
| First job | Employer posts first job | `first_job_posted` |
| Receive application | Job gets first application | `first_application_received` |
| Review applicant | Employer views applicant detail | `applicant_reviewed` |
| Advance applicant | Employer advances to next pipeline stage | `applicant_advanced` |
| Contact applicant | Employer sends message or interview invite | `applicant_contacted` |

**Key activation rate:** Employers who post at least 1 job within 7 days of signup (target: > 40%)

### Applicant Activation Funnel

| Stage | Event | Metric Name |
|---|---|---|
| Visit | Session on any public page | `session_start` |
| Browse | Views job listing | `job_list_viewed` |
| Job detail | Opens specific job | `job_detail_viewed` |
| Apply | Submits application | `application_submitted` |
| Follow-up | Returns to check status | `application_status_checked` |

**Key activation rate:** Job-searcher sessions that result in at least 1 application (target: > 2%)

---

## Instrumentation Status

### Currently Wired (from V5 plans)

- Employer onboarding checklist viewed/completed events (V5 implementation logs)
- Job quality readiness score tracking
- Dashboard next-actions panel interactions

### Not Yet Implemented

| Event | Priority | Notes |
|---|---|---|
| `employer_signup` | P1 | Track on POST /signup with role=2 |
| `first_job_posted` | P1 | Track on POST /jobs/create (first job per company) |
| `job_detail_viewed` | P2 | Angular route tracking |
| `application_submitted` | P1 | Track on POST /apply |
| `applicant_reviewed` | P2 | Track on GET /job/applicants/:jobId |
| PayMongo payment success | P1 | Already logged via paymentController |

### Recommended Analytics Tool

**Google Analytics 4 (GA4)** — free; integrates with Search Console; custom event tracking available.

Add to FE `index.html`:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Track custom events from Angular services:
```typescript
// analytics.service.ts
declare let gtag: Function;

trackEvent(eventName: string, params: object = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, params);
  }
}
```

---

## SEO Metrics (Monthly)

| Metric | Source | Target |
|---|---|---|
| Indexed job pages | Google Search Console | All active jobs indexed within 14 days |
| JobPosting rich results | GSC Rich Results report | > 0 results; < 5% error rate |
| Organic CTR | GSC Performance | Improve month-over-month |
| Core Web Vitals LCP | GSC / Lighthouse | < 2.5s |
| Core Web Vitals CLS | GSC / Lighthouse | < 0.1 |
| Core Web Vitals INP | GSC / Lighthouse | < 200ms |
| Sitemap coverage | GSC Coverage report | All submitted URLs indexed |

---

## Metrics Dashboard Recommendation

**Short-term (Phase 0):** Manual weekly review of:
1. PM2 logs for errors
2. Google Search Console coverage + performance
3. Supabase table counts (new employers, new jobs, new applications)

**Medium-term (Phase 1):** Set up:
1. GA4 with custom events for key activation moments
2. A simple dashboard (Google Looker Studio free tier) pulling from GA4 + Search Console

**Long-term (Phase 2):** Product analytics beyond GA4 (Mixpanel, Amplitude, or PostHog) if user base grows to warrant deeper funnel analysis.
