# GETHIRED NOTIFY — Release Gate: Application Snapshots
**Date:** 2026-06-24
**Deployment:** Application Snapshots System (BE controllers + service + FE employer snapshot card)

---

## Gate A — Message Safety
**Status: PASS**

No stack traces, raw error objects, SQL query strings, tokens, internal field names, or internal identifiers are exposed in any user-facing message after fixes.

Verified paths:
- `submitApplication` catch — was `"ERROR: " + error`, now safe generic message
- `getApplicantApplicationSnapshot` catch — was `"ERROR: " + error`, now safe contextual message
- `getEmployerApplicantSnapshotSummary` catch — was `"ERROR: " + error`, now safe contextual message
- `privacyNote` — was raw database column names (`civil_status`, `political_views`...), now plain English examples

Remaining `"Forbidden."` and `"Application not found."` responses are minimal, safe, and appropriate — they reveal no exploitable information. The employer controller's 404→403 collapse (done by the linter post-fix) is an additional enumeration oracle protection.

---

## Gate B — Employer Snapshot Copy
**Status: PASS**

All states of the employer snapshot card are clear and non-ambiguous after fixes:

| State | String | Verdict |
|-------|--------|---------|
| Loading | Skeleton with `aria-label="Loading application snapshot"` | Clear |
| Null (no snapshot) | "No snapshot was captured for this application. Snapshots are recorded at submission time." | Clear — explains why, not just that |
| Error (no card shown) | Card hidden when `snapshotSummary` is falsy — supplementary card, acceptable | Acceptable |
| Completeness label | "excellent" / "strong" / "basic" / "incomplete" | Clear, factual |
| Match badge | "Strong" / "Partial" / "Limited" / "Limited data" | Clear, neutral |
| Section labels | "Completeness", "Signal strength at submission" | Clear |
| Disclaimer paragraph | Full `DISCLAIMER` constant from BE | Clear, complete |

---

## Gate C — Fair-Hiring Copy
**Status: PASS**

1. **Disclaimer is present and rendered:** The `DISCLAIMER` constant from `employerApplicantSignalsService.js` is passed as `matchDisclaimer` in the employer snapshot summary and rendered in the FE snapshot card's disclaimer paragraph. The same text also appears in the applicant list's `role="note"` banner when any match signal is present.

2. **No punitive framing for low scores:**
   - Completeness level "incomplete" is displayed in a neutral grey badge, not red. No failure language used.
   - Match signal "low" is now displayed as "Limited" — factual, not a judgment on the applicant.
   - No message says an applicant "failed," "was rejected," or "does not qualify."

3. **Score is contextualized:**
   - `disclaimerNote` in the applicant-facing endpoint: "Application completeness measures submitted information, not candidate quality. It is not a hiring score."
   - `evidence.disclaimerNote` in the scoring function: same aligned wording.

4. **Protected attributes:** `EXCLUDED_FIELDS` covers gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, raw biometric data, and personality analysis. None of these appear in completeness scoring or match evidence.

---

## Gate D — Accessibility
**Status: PASS**

1. **Loading state:** Skeleton loader uses `role="status"`, `aria-label="Loading application snapshot"`, wrapped in `aria-live="polite"` `aria-atomic="true"` container. Screen readers will announce when loading completes.

2. **Completeness badge:** `[attr.aria-label]="'Completeness level: ' + snapshotSummary.completenessLevel"` — not color-only; accessible label provided.

3. **Match badge:** `[attr.aria-label]` updated to use the display-mapped label (e.g. "Match signal strength: Limited") rather than the raw enum value ("low").

4. **Disclaimer banner:** `role="note"` applied to the applicant list match signals disclaimer. The snapshot card itself uses `role="region"` with `aria-label="Application snapshot summary"`.

5. **No information conveyed by color alone:** Every badge has both a color class and visible text. All accessible text matches visible text (post fix 12).

---

## Gate E — Applicant Copy
**Status: PASS**

The `/applicant/application/snapshot` endpoint returns these applicant-facing fields:

| Field | Value | Verdict |
|-------|-------|---------|
| `disclaimerNote` | "Application completeness measures submitted information, not candidate quality. It is not a hiring score." | Clear, non-alarming, non-shaming |
| `privacyNote` | "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring." | Plain English, no technical field names, reassuring |
| `missingRequired[].reason` | e.g. "Helps employers understand your work history" | Second-person, actionable, non-punitive |
| `missingRecommended[].reason` | e.g. "A CV gives employers more detail to review alongside your application" | Second-person, actionable, non-punitive |
| `completedSections` | e.g. "Work experience", "Skills", "Education" | Clear, factual section names |

No endpoint error message exposes internals. No endpoint leaks cross-applicant data (ownership check enforced before data is returned).

---

## Summary

| Gate | Status |
|------|--------|
| A — Message Safety | PASS |
| B — Employer Snapshot Copy | PASS |
| C — Fair-Hiring Copy | PASS |
| D — Accessibility | PASS |
| E — Applicant Copy | PASS |

**Overall release gate: PASS**
All 5 gates pass after 12 copy fixes across 3 files. No logic, business rules, or schema were modified.
