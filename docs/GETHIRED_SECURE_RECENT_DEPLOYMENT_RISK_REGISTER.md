# GETHIRED SECURE — Risk Register (Recent Deployment)
**Scope:** FE HEAD 5ab9a05 — ApplicantApplicationDetailComponent + ApplicationCompletenessCardComponent
**Date:** 2026-06-24

---

| ID | Category | Title | Severity | Likelihood | Impact | Residual Risk | Mitigations | Status |
|----|----------|-------|----------|------------|--------|---------------|-------------|--------|
| R-01 | Auth / Access Control | `ApplicantGuard` absent from `user/` child routes | P1 | Medium — requires authenticated wrong-role user to know a valid URL | Low — BE 403 backstop prevents data return; redirect fires quickly | LOW | (1) `AuthGuard` blocks unauthenticated users; (2) BE IDOR guard returns 403 for ownership mismatch; (3) Fix applied: `canActivate: [ApplicantGuard]` added to parent route | FIXED |
| R-02 | Auth / Access Control | `AuthGuard` returns `true` for wrong-role authenticated users (systemic) | INFO | Low — requires authenticated user of wrong role to directly navigate to a sibling-product URL | Low — redirected before meaningful interaction | LOW | Guard redirects user to correct dashboard before page renders | OPEN — backlog |
| R-03 | Input Validation | Router state spoofing: `jobTitle`/`companyName`/`status` from `window.history.state` | INFO | Medium — any user can set these values | Very low — display-only, own browser only, Angular-escaped | NEGLIGIBLE | Values are display-only, never sent to BE, never used in security decisions, Angular interpolation escapes output | ACCEPTED |
| R-04 | IDOR / Data Access | Applicant accesses `/user/applications/<other-user-id>` | P0 concern (mitigated) | Medium — ID is in URL, sequential IDs are guessable | High if exploitable — would expose another user's application data | VERY LOW | BE `getApplicantApplicationSnapshot` checks `candidate_id !== uid` before returning data; 403 triggers FE error state; no data rendered | CLOSED (BE guard) |
| R-05 | XSS | Snapshot text fields (`disclaimerNote`, `privacyNote`, `tip.reason`) rendered unsafely | P0 concern (mitigated) | Low — requires malicious data in DB | High if exploitable | NEGLIGIBLE | All fields bound with Angular `{{ }}` interpolation (HTML-escaped); no `[innerHTML]` usage found | CLOSED (safe binding) |
| R-06 | Privacy / PII leak | Analytics service sending PII to external provider | P1 concern (mitigated) | Low — no real SDK is wired | N/A until SDK is integrated | NEGLIGIBLE | Analytics service is a no-op in prod; payload contains only internal ID and static strings | CLOSED (no-op) |
| R-07 | Security — Supply Chain | Future analytics SDK integration may introduce PII leak | INFO | Low — requires future code change | Medium | LOW | Standing comment in analytics service documents the privacy rule; payload structure must be reviewed at integration time | OPEN — future |

---

## Risk Scoring Key

- **Severity:** P0 (critical), P1 (high), P2 (medium), INFO (informational)
- **Likelihood:** Low / Medium / High (probability of exploitation in practice)
- **Impact:** Low / Medium / High / Very High (blast radius if exploited)
- **Residual Risk:** NEGLIGIBLE / VERY LOW / LOW / MEDIUM / HIGH (after mitigations)
- **Status:** FIXED (code change applied) / CLOSED (mitigated without code change) / OPEN (backlog) / ACCEPTED (risk accepted)
