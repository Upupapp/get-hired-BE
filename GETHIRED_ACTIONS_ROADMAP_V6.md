# GETHIRED ACTIONS ROADMAP — V6
**Date:** 2026-07-01 | **Horizon:** Now → Public Launch + 2 Sprints Post-Launch

---

## Phase 0 — Ops / User Actions (Today, Non-Code)

These require Paul to action — no developer needed.

| # | Action | Time | Blocks |
|---|--------|------|--------|
| 0.1 | `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` — confirm PAYMONGO_WEBHOOK_SECRET | 5 min | GH-ACT-091 / payment processing |
| 0.2 | Renew GitHub PAT → restore `git pull` on Linode | 5 min | P1-PAT / deploy workflow |
| 0.3 | Google Search Console: verify property + submit sitemap | 15 min | P1-GSC / SEO monitoring |
| 0.4 | Design 1200×630px OG image → commit to `assets/brand/` | 1-2 hr | P1-OG-IMAGE / social sharing |
| 0.5 | Rotate Firebase service account key + git history purge + force-push | 4 hr | P0-FIREBASE / public launch |

---

## Phase 1 — Security + Stability (Next Code Sprint, ~1 day BE)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 1.1 | GH-ACT-091 | PayMongo env var set on Linode (if Phase 0 finds it missing) | 10 min |
| 1.2 | P1-RATE-LIMIT / ACT-012 | Tiered rate limiting + Easy Job Post rate limit | 3-4 hr |
| 1.3 | P2-POOL-EXHAUSTION | p-limit concurrency limiter on bulk CSV imports | 3-5 hr |
| 1.4 | P2-CSV-ROW-CAP | CSV import row count cap (FE guard, 50 rows) | 1 hr |

---

## Phase 2 — SEO + Public Portal (Next Code Sprint, ~1 day FE)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 2.1 | ACT-005 | JobPosting JSON-LD on /jobs/:id | 2 hr |
| 2.2 | P2-SOFT-404 | HTTP 404 on expired/unknown jobs (Angular RESPONSE token) | 2-3 hr |
| 2.3 | P2-LOCALSTORAGE-SSR | isPlatformBrowser guard in PublicSearchComponent | 30 min |
| 2.4 | P2-HERO-CTA | Employer info page CTAs → crawlable `<a>` tags | 30 min |
| 2.5 | ACT-008 | Add noindex meta to Role Classification page | 10 min |
| 2.6 | P2-SVG-CLS | SVG width/height attributes (CLS) | 1 hr |
| 2.7 | ACT-016 | Canonical URL meta + sitemap company pages | 2 hr |

---

## Phase 3 — LinkedIn + Auth Polish (~1 day FE)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 3.1 | GH-ACT-088 | LinkedIn Unlink UI in account settings | 1 day |
| 3.2 | GH-ACT-089 | LinkedIn error page polish (/linkedin/complete?error=…) | 3 hr |
| 3.3 | ACT-010 | Add provider column to user_credentials | 1 hr (BE) |
| 3.4 | GH-ACT-092 | Google One Tap (FedCM) — after OAuth QA pass | 2 hr |

---

## Phase 4 — Applicant Product Features (~2-3 days FE)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 4.1 | ACT-004 | Wire ProfileQualityService into Applicant Dashboard | 1 day |
| 4.2 | ACT-015 | Applicant Profile Grading UI | 1 day |
| 4.3 | ACT-014 | CV Doctor FE Wiring | 2 days |
| 4.4 | ACT-020 | Job Seeker Match Score Wiring | 1 day |

---

## Phase 5 — Messaging + Admin (~2-3 days)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 5.1 | ACT-009 / FEAT-MESSAGES-WIDGET | Messages widget (is_read column + threads endpoint + FE) | 1 day |
| 5.2 | GH-ACT-090 | Modal acknowledgement persistence to DB | 3 hr |
| 5.3 | FEAT-ADMIN-PAGES | Admin companies + reports pages | XL |

---

## Phase 6 — QA + A11y + DX Polish (~2 days)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 6.1 | ACT-018 | Automated test suite for critical paths | 3 days |
| 6.2 | P3-TOAST-TESTS | Unit tests for toast outcome logic | M |
| 6.3 | P3-SNACKBAR-ASSERTIVE | danger-snackbar aria-live="assertive" | M |
| 6.4 | P3-TOAST-EXTRACT | Shared toast decision utility | M |
| 6.5 | P3-REUSABLE-TABLE-MOBILE | Mobile card fallback for reusable-table | M |
| 6.6 | P3-DIALOG-ALL-FAILED-UX | Keep invite dialog open on all-failed | S |
| 6.7 | P3-FAILED-EMAIL-INDICATOR | Per-item failure indicator | S |
| 6.8 | P3-DEAD-LOG-CONTACT | Remove dead snackbar branches | XS |
| 6.9 | P3-CANDIDATE-FORM-GUARD | Guard importCandidateForm initialization | XS |
| 6.10 | P3-BCRYPT-JS | bcrypt → bcryptjs | XS |
| 6.11 | P3-AXIOS-1X | axios 0.x → 1.x | S |

---

## Phase 7 — Infrastructure + SEO Scale (~post-launch)

| # | Action ID | Title | Effort |
|---|-----------|-------|--------|
| 7.1 | ACT-017 | Node.js 14 migration plan + execution | XL |
| 7.2 | FEAT-INDEXING-API | Google Indexing API integration | L |
| 7.3 | ACT-019 | Video CV public display | L |
| 7.4 | FEAT-PROGRAMMATIC-SEO | Programmatic SEO landing pages | XL |
| 7.5 | P2-SSR-VERIFY | Verify Angular Universal SSR in production | XS |

---

## Milestone Summary

| Milestone | Phase | Gate |
|---|---|---|
| Payment processing confirmed working | 0.1 / 1.1 | PAYMONGO_WEBHOOK_SECRET present on Linode |
| Deploy pipeline restored | 0.2 | `git pull` works on Linode |
| Social sharing ready | 0.4 | OG image committed |
| Public launch cleared | 0.5 + Phase 1 | P0-FIREBASE closed + rate limiting on |
| SEO foundation complete | Phase 2 | JSON-LD, 404s, canonical, no soft-404 |
| Auth ecosystem complete | Phase 3 | LinkedIn unlink + Google One Tap |
| Applicant product complete | Phase 4 | ProfileQuality + CV Doctor + Match in UI |
| Messaging live | Phase 5 | Messages widget wired |
| Production-grade quality | Phase 6 | Tests, a11y, DX clean |
