# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — COPY/CLAIMS QA V5
**Date:** 2026-07-01

---

## Purpose

Audit all user-visible copy related to certification/license requirements for false or misleading claims. GetHired is a Philippine job board — DOLE fair hiring guidelines apply: employers cannot reject applicants solely for lacking a non-legally-required credential.

---

## Audit Scope

### Employer Form (Create/Edit Job)

| Location | Current Copy | Status |
|---|---|---|
| Section header | "Certifications & Licenses" | ✅ Neutral |
| Helper text | "Add certifications, licenses, permits, or eligibility requirements that are important for this role." | ✅ Acceptable |
| Fair-hiring notice | "Only add credentials that are relevant to the job." | ✅ Required — keep |
| Row placeholder | e.g. "PRC license, Driver's license, TESDA NC II..." | ✅ Examples only, not pre-filled |
| Empty state | "No certifications or licenses added yet." | ✅ OK |
| Add button label | "+ Add certification or license" | ✅ OK |
| Required importance label | "Required" | ✅ Employer-stated only |
| Preferred importance label | "Preferred" | ✅ OK |
| expiry notice to employer | "Valid/unexpired document may be requested" | ✅ "may be" — non-binding |
| verification notice to employer | "Employer may ask for proof" | ✅ "may" — non-binding |
| Publish checklist | "Optional: Certifications & Licenses" | ✅ Correctly optional |

**No false claims found in employer form.** ✅

---

### Public / Applicant Job Detail Page

| Location | Current Copy | Status |
|---|---|---|
| Section header | "Certifications & Licenses" | ✅ Neutral |
| Required group header | "Required" | ✅ Employer-stated, not platform-enforced |
| Preferred group header | "Preferred" | ✅ OK |
| Expiry notice to applicant | "Valid/unexpired document may be requested" | ✅ "may be" — non-binding |
| Verification notice to applicant | "Employer may ask for proof" | ✅ "may" — non-binding |
| Application info notice | "This job lists required credentials. The employer may ask for proof during the application or interview process." | ✅ Informational only |

**No "verified by GetHired" copy.** ✅
**No "credential matched" copy.** ✅
**No "your application may be declined" copy.** ✅
**No "GetHired verifies credentials" copy.** ✅

---

## FORBIDDEN Claims (Must Never Appear)

| Copy | Why Forbidden |
|---|---|
| "Verified by GetHired" | No verification system exists |
| "AI-verified credential" | No AI verification |
| "Credential matched to your profile" | No match integration in V1 |
| "Your profile meets this requirement" / "You don't meet this requirement" | No credential comparison |
| "Applications without this credential may be declined" | Makes platform an automatic gatekeeper — DOLE concern |
| "Blocked from applying due to missing credential" | Apply never blocked by credentials |
| "Credential required by law" | GetHired cannot make legal determinations |

---

## Philippine Labor Compliance Note

- PD 442 (Labor Code) + DOLE D.O. 174 + Republic Acts: employers cannot use credential requirements to discriminate
- Listings must allow all applicants to apply regardless of stated requirements
- Required/Preferred labels represent EMPLOYER PREFERENCES, not GetHired-enforced gates
- The platform must never block an application based on credentials

---

## Copywriting Consistency Checklist

| Check | Status |
|---|---|
| No "verified" badge anywhere | ✅ None in codebase |
| No "matched" language | ✅ None |
| "May be requested" / "may ask" (not "will" or "must") | ✅ Confirmed |
| Section is hidden when empty | ✅ `*ngIf="length > 0"` |
| Fair-hiring notice present in employer form | ✅ Required — must not remove |
| Apply button not gated by credentials | ✅ Confirmed — no gate |

---

## Result: PASS ✅

No forbidden claims found. All copy is neutral and informational. Fair-hiring guardrails present.
