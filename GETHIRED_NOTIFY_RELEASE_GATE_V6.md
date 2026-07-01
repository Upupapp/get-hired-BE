# GETHIRED NOTIFY RELEASE GATE V6
**Date:** 2026-07-01

Release-blocking vs. non-blocking communication/notification issues.

---

## Release-Blocking Issues (Must Fix Before Production)

None. All identified V6 issues are low-to-medium severity with no blocking impact on the user's ability to sign in, post jobs, or apply.

The V6-NOT-001 fix (LinkedIn error role="alert") has been applied. The only remaining issue that could be considered blocking for an accessibility-compliant release is:

### Potential Blocker for Accessibility Certification
**Issue:** Company setup modal header `aria-hidden="true"` hides "7-day free trial active" from screen readers.
**Severity:** Medium — material information hidden from screen readers.
**Blocking?** Not a launch blocker for a commercial release, but would be a gap in WCAG 2.1 AA compliance.
**Recommendation:** Fix before any accessibility audit or App Store / government procurement that requires WCAG AA.

---

## Non-Blocking Issues (Ship Now, Fix in Next Sprint)

| ID | Issue | Severity | ETA |
|---|---|---|---|
| BACKLOG-NOT-H1 | GIS load failure silent (V5) | High | Next sprint |
| BACKLOG-NOT-M1 | Role classification no loading state | Medium | Next sprint |
| BACKLOG-NOT-M2 | Modal header aria-hidden hides trial badge | Medium | Next sprint |
| BACKLOG-NOT-M3 | Session expiry — no user message | Medium | Next sprint |
| BACKLOG-NOT-M4/M5 | LinkedIn error copy improvements (2) | Medium | Low-effort, anytime |
| BACKLOG-NOT-L1 | Sign-out confirmation | Low | Anytime |
| BACKLOG-NOT-L2/L3 | LinkedIn jargon copy fixes (2) | Low | Anytime |
| BACKLOG-NOT-L4 | Spinner duplicate announcement | Low | Cosmetic |
| BACKLOG-NOT-L5/L6 | Modal eyebrow + CTA copy | Low | PM decision needed |
| BACKLOG-NOT-L7 | loginMessage set but never displayed | Low | Design decision |

---

## V6 Surfaces — Communication Readiness Summary

| Surface | Functional | Accessible | Copy Quality | Verdict |
|---|---|---|---|---|
| LinkedIn OIDC loading state | Yes | Yes (aria-live polite) | Good | Ship |
| LinkedIn OIDC error states | Yes | Yes (V6-NOT-001 applied) | Good (2 minor copy gaps) | Ship |
| LinkedIn OIDC retry button | Yes | Yes | Good | Ship |
| Company setup success modal | Yes | Partial (badge hidden) | Good (eyebrow debatable) | Ship with known gap |
| Sign-out flow | Yes | N/A | No confirmation (low severity) | Ship |
| LinkedIn button labels | Yes | Yes | Good | Ship |

---

## Gate Result: PASS (With Notes)

All V6 surfaces are **shippable**. The accessibility gap in the company setup modal (V6-NOT-004, trial badge hidden from screen readers) is the highest-priority fix for the next sprint.

---

## V5 Gate Items Carry-Forward

| V5 Item | Status |
|---|---|
| GIS load failure silent (V5-NOT-001) | Still open — not a blocker |
| Role classification loading state (V5-NOT-002) | Still open — not a blocker |
| 409 message fix (V5-NOT-003) | Fixed V5 |
