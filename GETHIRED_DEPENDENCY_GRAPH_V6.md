# GETHIRED DEPENDENCY GRAPH — V6
**Date:** 2026-07-01 | **Format:** Action → Blocks (depends on these being done first)

---

## Critical Path Chains

### Chain 1: Public Launch Gate

```
PACK-B (Firebase key rotation)
  └── Unblocks: Public announcement / open-source repo

PACK-A (PayMongo env verify / GH-ACT-091)
  └── Unblocks: Payment subscription processing

PACK-A + PACK-B + PACK-C (OG image) + PACK-D (rate limiting)
  └── All required before: PUBLIC LAUNCH
```

### Chain 2: SEO Chain

```
PACK-A.3 (Google Search Console verification)
  └── Unblocks: P1-GSC
      └── Unblocks: FEAT-INDEXING-API (Google Indexing API)
          └── Unblocks: Faster job page indexing

PACK-E.1 (JobPosting JSON-LD)
  └── Unblocks: Google Jobs rich results (standalone)

PACK-E.2 (HTTP 404 on expired jobs)
  └── No dependencies; unblocks: clean index

PACK-E.3 (isPlatformBrowser)
  └── No dependencies; unblocks: SSR correctness on /jobs search page
```

### Chain 3: Auth Ecosystem Chain

```
Google OAuth (COMPLETE)
  └── Unblocks: PACK-I (Google One Tap)
      └── Depends on: Post-launch QA gate (QA-ACT-007)

LinkedIn OIDC (COMPLETE)
  └── Unblocks: GH-ACT-088 (LinkedIn Unlink UI)
      └── Depends on: BE endpoints (link-status, unlink)
          └── Unblocks: GH-ACT-089 (LinkedIn error page polish) — independent, no dependency

ACT-010 (provider column in user_credentials)
  └── No blocking dependency; enables analytics on auth method distribution
```

### Chain 4: Applicant Product Chain

```
AX-ACT-001 (Wire ProfileQualityService)
  └── Unblocks: AX-ACT-002 (Profile Grading UI)

AX-ACT-003 (CV Doctor FE Wiring)
  └── Depends on: BE CVCOACH services (CONFIRMED COMPLETE)
  └── Independent of: AX-ACT-001

AX-ACT-005 (Job Seeker Match Score)
  └── Depends on: MATCH/PROFILE services (CONFIRMED COMPLETE)
  └── Independent of: AX-ACT-001/002/003

AX-ACT-004 (Video CV Display)
  └── Depends on: Upload working (CONFIRMED)
  └── Independent of other applicant chains
```

### Chain 5: Messages Widget Chain

```
PACK-H.1 (is_read column + threads endpoint)
  └── Unblocks: PACK-H.2 (DashboardMessagesWidgetComponent wiring)
      └── Unblocks: Full employer messaging workflow

GH-ACT-090 (Modal acknowledgement DB persistence)
  └── Depends on: Company setup modal (COMPLETE)
  └── No other dependencies
```

### Chain 6: Test Coverage Chain

```
QA-ACT-001 (Toast unit tests)
  └── Depends on: import dialogs stable (COMPLETE)
  └── Recommended before: Any import dialog refactor (TD-ACT-004)

QA-ACT-002 (Automated test suite)
  └── Depends on: ACT-003 (Google auth deployed — COMPLETE)
  └── Depends on: LinkedIn OIDC (COMPLETE)
  └── Enables: CI regression guard on auth + payment

TD-ACT-004 (Shared toast utility)
  └── Depends on: QA-ACT-001 (tests protect the refactor)
```

### Chain 7: Tech Debt Chain

```
TD-ACT-008 (CSV row cap — 50 rows)
  └── Interim mitigation for: TD-ACT-007 (pool exhaustion)
  └── No dependency — implement first

TD-ACT-007 (p-limit pool concurrency)
  └── After TD-ACT-008 (cap is safer first)
  └── Unblocks: Raising cap to 100 rows

TD-ACT-001 (Node.js 14 migration)
  └── No dependencies (self-contained)
  └── Unblocks: Modern Node security patches; npm audit reliability
  └── Enables: TD-ACT-002 (bcryptjs), TD-ACT-003 (axios 1.x) to be done on Node 18
```

---

## Dependency Matrix (Row depends on Column)

| Action | Google OAuth | LinkedIn OIDC | PAYMONGO env | Firebase purge | ProfileQuality svc | CVCOACH svc | MATCH svc | SSC verified |
|---|---|---|---|---|---|---|---|---|
| Google One Tap (GH-ACT-092) | YES | - | - | - | - | - | - | - |
| LinkedIn Unlink UI (GH-ACT-088) | - | YES | - | - | - | - | - | - |
| ProfileQuality UI (AX-ACT-001) | - | - | - | - | YES | - | - | - |
| Profile Grading UI (AX-ACT-002) | - | - | - | - | - | - | - | - |
| CV Doctor FE (AX-ACT-003) | - | - | - | - | - | YES | - | - |
| Match Score FE (AX-ACT-005) | - | - | - | - | - | - | YES | - |
| Indexing API (FEAT-INDEXING-API) | - | - | - | - | - | - | - | YES |
| Public Launch | YES | - | YES | YES | - | - | - | - |

---

## Parallelizable Work (Can Happen Simultaneously)

| Parallel Group | Actions |
|---|---|
| Group 1 (Today, Paul) | PACK-A.1 (PayMongo) + PACK-A.2 (PAT) + PACK-A.3 (GSC) |
| Group 2 (Same sprint, FE+BE) | PACK-D (BE security) + PACK-E (FE SEO) — independent repos |
| Group 3 (Same sprint, independent) | GH-ACT-089 (LinkedIn error pages) + ACT-010 (provider column) |
| Group 4 (Applicant sprint) | AX-ACT-001 (ProfileQuality) + AX-ACT-003 (CV Doctor) + AX-ACT-004 (Video CV) |
| Group 5 (QA sprint) | QA-ACT-001 (toast tests) + QA-ACT-003 (snackbar assertive) |

---

## Items with No Dependencies (Quick Wins)

| Action ID | Title | Effort |
|---|---|---|
| PACK-A.1 | Verify PayMongo env var | 5 min |
| PACK-A.2 | Restore GitHub PAT | 5 min |
| PACK-A.4 | Verify SSR | 10 min |
| PACK-E.5 | Role classification noindex | 10 min |
| SEC-ACT-007 | Remove console.log in shareable link | 5 min |
| P3-DEAD-LOG-CONTACT | Remove dead snackbar branches | 15 min |
| P3-CANDIDATE-FORM-GUARD | Guard importCandidateForm init | 15 min |
| SEC-ACT-004 | Stale noindex on SPA navigation | 15 min |
| PACK-E.4 | Employer info CTA crawlable links | 30 min |
| PACK-E.3 | isPlatformBrowser guard | 30 min |
| P3-BCRYPT-JS | bcrypt → bcryptjs | 30 min |
| TD-ACT-008 | CSV row cap (50 rows) | 1 hr |
