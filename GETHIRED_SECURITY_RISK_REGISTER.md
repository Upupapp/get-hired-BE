# GETHIRED SECURE RISK REGISTER — RECENT DEPLOYMENT

| ID | Title | Category | Severity | Likelihood | Impact | Fixed | Release Blocker |
|---|---|---|---|---|---|---|---|
| SR-001 | Cross-company BOLA on action-summary | BOLA | P0 | HIGH | HIGH | YES (company WHERE clause) | NO |
| SR-002 | Unauth access to action-summary | Auth | P0 | HIGH | HIGH | YES (verifyAuth) | NO |
| SR-003 | SQL injection via jobId param | SQLi | P0 | MEDIUM | HIGH | YES (parameterized) | NO |
| SR-004 | Applicant PII in response | Privacy | P1 | HIGH | MEDIUM | YES (COUNT only) | NO |
| SR-005 | Open redirect via publicUrl | Redirect | P1 | LOW | MEDIUM | N/A (not a vector) | NO |
| SR-006 | XSS via job description | XSS | P1 | LOW | MEDIUM | YES (Angular interpolation) | NO |
| SR-007 | Nested role=dialog | A11y | P2 | MED | LOW | DEFERRED | NO |
| SR-008 | Double confirm UX | UX | P2 | MED | LOW | DEFERRED | NO |

All P0/P1 risks MITIGATED. No release blockers.
