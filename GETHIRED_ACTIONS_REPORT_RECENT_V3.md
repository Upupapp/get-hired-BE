# GETHIRED ACTIONS REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 + Employer Portal V4 — Prioritized Backlog

---

## WHAT SHIPPED (this deployment)

| Item | Status |
|---|---|
| Federated public search (BE + FE) | SHIPPED |
| All/Jobs/Companies tabs with URL state | SHIPPED |
| Company spotlight card | SHIPPED |
| Enriched autocomplete (sublabel, logoUrl, grouped) | SHIPPED |
| Employer subscription pulse stats alignment fix | SHIPPED |
| Employer portal V4 (23-section revamp) | SHIPPED |

---

## PRIORITY BACKLOG

### P0 — Immediate action required

| ID | Item | Why |
|---|---|---|
| ACT-P0-01 | Job-create submit footer z-index fix (mobile) | Employer cannot publish jobs on mobile; `z-index: 99` hidden behind bottom nav `z-index: 999` |
| ACT-P0-02 | BE secrets in git history (GetHired) | Security risk; needs git-filter-repo + GitHub secret scanning suppression |

### P1 — High value, complete before next major push

| ID | Item | Why |
|---|---|---|
| ACT-P1-01 | Change Password smoke test on prod | Feature exists but unverified live |
| ACT-P1-02 | `pw_changed` SendGrid email template | Missing; user gets no confirmation email on password change |
| ACT-P1-03 | Employer jobs list table — mobile overflow | 375px layout broken; interim `overflow-x: auto` or card pattern |
| ACT-P1-04 | Employer applicant list — mobile overflow | Same root cause as P1-03 |
| ACT-P1-05 | FE auto-deploy GitHub Actions secrets | rsync path + SSH key not set; every FE deploy requires manual chmod step |
| ACT-P1-06 | Automated smoke tests for search endpoints | No test coverage on federated search; manual only |

### P2 — Medium value, schedule

| ID | Item | Why |
|---|---|---|
| ACT-P2-01 | Messages KPI widget in employer dashboard | `is_read` column + all-threads endpoint missing; deferred from GH1 session |
| ACT-P2-02 | Admin companies page | Route not yet built |
| ACT-P2-03 | Admin reports page | Route not yet built |
| ACT-P2-04 | `trackBy` functions in *ngFor for job/company result lists | Performance improvement for large result sets |
| ACT-P2-05 | BOLA fix for remaining company_id endpoints | Some endpoints may still accept user-supplied company_id |

### P3 — Low priority / nice to have

| ID | Item | Why |
|---|---|---|
| ACT-P3-01 | Company search sort UI (most_open_roles, newest_posted) | BE supports it; FE has no sort UI for companies tab yet |
| ACT-P3-02 | Company profile page (`/companies/:slug`) | Linked from search company cards but may be sparse |
| ACT-P3-03 | Search result pagination for companies tab | Currently uses same `page` param as jobs; companies tab needs own pagination |
| ACT-P3-04 | `/employers` route structured data (JSON-LD) | Would improve SEO rich results for employer landing page |

---

## DECISION LOG

| Decision | Chosen | Rationale |
|---|---|---|
| Company spotlight gate | score ≥ 60 | Below this = likely false/weak match; exact=100, prefix=60, FTS=30 |
| `counts.all = counts.jobs + counts.companies` | Additive | Gives users full picture; avoids deduplicated count confusion |
| Employer portal V4 | Full rewrite (not additive) | Existing 4-section page had 0 brand consistency; V4 needed blank-slate CSS isolation |
| Pulse stats alignment | `flex:1 + min-height:29px` | Width equality + icon row-height equality resolved both misalignment causes |
