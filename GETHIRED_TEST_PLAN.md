# GetHired TEST PLAN — QA Cycle 11

**Date:** 2026-06-25
**Scope:** BE commit af3d67e (rate-limit + hub + message enrichment) + FE commit fed4bf8 (interview hub + mobile sidebar + recorder fix)
**Tester:** Claude Code (automated static + build analysis)

---

## 1. Objectives

Verify all changes from the QA Cycle 11 deployment scope are correct, safe, and do not regress prior work.

### 1.1 In-scope features

| ID | Feature | Risk Level |
|----|---------|------------|
| RL-01 | express-rate-limit 4-tier middleware | HIGH — production-facing security control |
| HUB-01 | GET /api/interview/hub backend | HIGH — BOLA risk, new SQL JOIN |
| HUB-02 | RecruiterInterviewHubComponent (FE) | MEDIUM — new component, lazy loaded |
| MSG-01 | listRecruiterThreads enrichment (applicantName, photo) | MEDIUM — JOIN change |
| MSG-02 | RecruiterMessagesComponent null handling | MEDIUM — null photo/name crashes |
| REC-01 | recordRtc import case fix | LOW — import rename only |
| NAV-01 | EmployerPanel mobile sidebar/drawer (B02) | MEDIUM — focus/keyboard management |

---

## 2. Test Strategy

### 2.1 Test types used

| Type | Approach |
|------|---------|
| Static code analysis | Node.js scripts over source files |
| Build verification | `ng build --configuration production` |
| Unit tests (automated) | Node.js assertion scripts |
| Contract shape verification | Field-by-field BE response shape vs FE interface |
| Security static analysis | Pattern matching for BOLA, injection, auth bypass |
| Accessibility | Template attribute verification |
| Performance | Bundle size, lazy chunk structure |

### 2.2 Test types NOT used (and why)

| Type | Reason |
|------|---------|
| Live API calls | No safe test DB; production access restricted |
| ng test (Karma/Jasmine) | Requires Chrome headless, not available in this env; existing spec files are stubs |
| Playwright/Cypress E2E | Not installed in either repo |
| pg integration tests | Would require production Supabase credentials (forbidden) |

---

## 3. Execution Phases

### Phase A — Environment Setup
- Verify repo state (git log)
- Confirm package versions (express-rate-limit@6.11.2, recordrtc@5.6.2)
- Verify node_modules present

### Phase B — Build Gate
- `ng build --configuration production` — must pass with 0 errors

### Phase C — Rate Limiting Tests (RL-01)
- Skip function logic for GET/HEAD/OPTIONS
- Tier ordering (global→auth→write→sensitive→routes)
- Header config (standardHeaders, legacyHeaders)
- Named export compatibility (v6 `{ rateLimit }`)
- Tier overlap analysis (double-counting behavior)
- window/max config per tier

### Phase D — Interview Hub Tests (HUB-01, HUB-02)
- Auth: JWT-derived company, no caller-supplied ID
- SQL safety: parameterized, LEFT JOINs, COALESCE, LIMIT 200
- Response shape: {items[], total}
- FE null handling: applicantName, applicantEmail, display name fallbacks
- Routing: /recruiter/interview → lazy EmployerInterviewModule → RecruiterInterviewHubComponent
- Service auth delivery via HTTP interceptor chain

### Phase E — Message Enrichment Tests (MSG-01, MSG-02)
- listRecruiterThreads: name/email/null fallback chain
- photoUrl null coalesce
- snippet cap (120 chars)
- needsReply logic
- FE template: *ngIf null guards on avatar img
- Broken URL behavior (known gap: non-null broken URL shows broken icon)

### Phase F — Recorder Import Fix (REC-01)
- Correct import: `recordrtc` (lowercase)
- Old import: `recordRtc` (wrong case) absent

### Phase G — Mobile Sidebar Tests (NAV-01)
- HostListener Escape handler
- Focus management: first link on open, button on close
- Router subscription cleanup (ngOnDestroy)
- ARIA attributes: aria-controls, aria-expanded, aria-hidden scrim, role=navigation
- Keyboard accessibility on thread list items (tabindex, Enter, Space, preventDefault)

### Phase H — Security Checks
- All message routes have verifyAuth
- All interview routes have verifyAuth
- CORS wide open (known existing issue)
- Helmet absent (known existing issue)
- 50mb body limit (known risk, unchanged)

### Phase I — Accessibility Checks
- Emoji aria-hidden wrappers in interview hub
- Skeleton aria-busy
- Error states role=alert
- Thread list ARIA (role=list, role=button, aria-pressed, aria-label)

### Phase J — Report Generation
- All 7 required output files produced
