# GETHIRED NOTIFY — Fix Log: Application Snapshots
**Date:** 2026-06-24
**Rule:** Small/safe copy fixes only — no logic changes, no business rule changes, no schema changes.

---

## Fix 1
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `errorMessage.error = "ERROR: " + error;` (in `submitApplication` catch)
**New:** `errorMessage.error = "Something went wrong. Please try again later.";`
**Why:** Raw JS error serialization exposed internal stack trace / error object to end users. Replaced with a safe, generic message that gives no internal information.

---

## Fix 2
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `privacyNote: \`Protected attributes are never scored. Excluded fields: ${EXCLUDED_FIELDS.slice(0, 6).join(", ")}...\``
**New:** `privacyNote: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."`
**Why:** The original exposed raw database column names (`civil_status`, `date_of_birth`, `political_views`) as technical jargon visible to applicants. Replaced with plain-English examples that communicate the same intent without exposing field naming conventions.

---

## Fix 3
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `errorMessage.error = "ERROR: " + error;` (in `getApplicantApplicationSnapshot` catch)
**New:** `errorMessage.error = "Unable to retrieve your application snapshot. Please try again later.";`
**Why:** Raw error object serialized into user-facing error field. Replaced with a safe, action-oriented message specific to the applicant endpoint context.

---

## Fix 4
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `errorMessage.error = "ERROR: " + error;` (in `getEmployerApplicantSnapshotSummary` catch)
**New:** `errorMessage.error = "Unable to retrieve application summary. Please try again later.";`
**Why:** Same raw error exposure pattern. Replaced with a safe message specific to the employer summary endpoint.

---

## Fix 5
**File:** `get-hired-BE/services/applicationSnapshotService.js`
**Old:** `disclaimerNote: "Application completeness measures submitted information, not candidate quality. This is not a hiring decision."`
**New:** `disclaimerNote: "Application completeness measures submitted information, not candidate quality. It is not a hiring score."`
**Why:** Inconsistent phrasing with the same note in `applicationController.js` ("It is not a hiring score."). Aligned to single consistent form. "Hiring score" is also more precise than "hiring decision" in this context.

---

## Fix 6
**File:** `get-hired-BE/services/applicationSnapshotService.js`
**Old (basic_profile reason):** `"Required for employer to understand applicant's professional intent"`
**New:** `"Helps employers understand your current professional focus"`
**Why:** Third-person system voice exposed to applicant. Rewritten in second person (applicant-facing) and softened from "required for employer to understand" (passive, mechanical) to "helps employers" (direct, human).

---

## Fix 7
**File:** `get-hired-BE/services/applicationSnapshotService.js`
**Old (work_experience reason):** `"At least one work experience entry expected for employer review"`
**New:** `"Helps employers understand your work history"`
**Why:** "At least one... expected" is system-speak. Rewritten in second person and plain language.

---

## Fix 8
**File:** `get-hired-BE/services/applicationSnapshotService.js`
**Old (skills reason):** `"Skills are used for job matching and employer review"`
**New:** `"Lets employers see what you can do and how you align with the role"`
**Why:** "Used for job matching" is technical terminology. Rewritten to explain the benefit to the applicant in plain English.

---

## Fix 9 (bundle — 4 reason strings)
**File:** `get-hired-BE/services/applicationSnapshotService.js`

| Field | Old | New |
|-------|-----|-----|
| `education` | "Helps employers understand academic background" | "Gives employers a fuller picture of your background" |
| `cv_submitted` | "Employers commonly review CVs alongside application" | "A CV gives employers more detail to review alongside your application" |
| `video_answers` | "Video answers demonstrate communication and personality" | "Video answers let you present yourself beyond a written application" |
| `certifications` | "Certifications can differentiate applicants for relevant roles" | "Certifications can strengthen your profile for roles that require specific credentials" |

**Why:** All four were third-person system voice shown to applicants. Rewritten in second person. "Differentiate applicants" is corporate-speak. "Personality" analysis is a protected signal; the new wording avoids implying personality is being evaluated.

---

## Fix 10
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`
**Old (null state):** `"No snapshot available for this application."`
**New:** `"No snapshot was captured for this application. Snapshots are recorded at submission time."`
**Why:** The original was ambiguous — employers couldn't tell if this was an error or expected. Adding "Snapshots are recorded at submission time" explains the system's behaviour and sets correct expectations.

---

## Fix 11
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`
**Old (match section label):** `"Match level at submission"`
**New:** `"Signal strength at submission"`
**Why:** "Match level" sounds like a ranking judgment. "Signal strength" is consistent with the disclaimer language ("Match Signals") and frames the information as evidence-based data, not a verdict.

---

## Fix 12
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`
**Old (match badge values):** Raw enum values displayed directly: `"strong"`, `"possible"`, `"low"`, `"limited data"`
**New (match badge values + aria-label):** Display-mapped: `"Strong"`, `"Partial"`, `"Limited"`, `"Limited data"`
**Why:** "low" shown in a grey badge is subtly punitive and stigmatizing ("this applicant is a low match"). "Partial" and "Limited" are factual and neutral, better describing the signal coverage than the applicant themselves. `aria-label` was also updated to use the display label so screen readers say "Match signal strength: Limited" rather than "Match level: low".

---

**Total fixes applied: 12 (across 3 files)**
No logic was changed. No business rules were changed. No schema was changed. No emails were sent.
