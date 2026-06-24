# GetHired Employer Certification & License Activation Addendum V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** CONFIRMED PRESENT (v1), NO MATCH SCORING WIRED

---

## Implementation Status (Confirmed from V4 Audit)

| Feature | Status |
|---------|--------|
| certificationRequirements FormArray in job builder step 1 | Implemented (v1) |
| Data stored per job | Implemented |
| Displayed in job view | Likely (in job-view component) |
| Displayed on public job detail | Conditional |
| Applicant MATCH scoring against certs | NOT implemented — do not wire |
| Cert taxonomy / controlled vocabulary | NOT implemented |
| Auto-reject based on cert requirements | NOT implemented — do not wire |
| Cert expiry tracking | NOT implemented |
| Cert verification workflow | NOT implemented |

---

## What V5 Does (Nothing New for Certs)

V5 does NOT:
- Wire certificationRequirementFactor()
- Create a certification taxonomy
- Add cert matching to any scoring system
- Add "Auto-match licenses" copy anywhere
- Change the FormArray implementation

V5 DOES:
- Preserve the existing certificationRequirements FormArray (untouched)
- Remove interview questions as a publish blocker (B04) — this does NOT affect certification requirements which were never a publish requirement

---

## FormArray Definition (Unchanged)

```typescript
certificationRequirements: new FormArray([])
// Each entry is a FormGroup with:
// - name (string, required within entry)
// - type (string, default 'certification')
// - importance (string, default 'required')
// - issuingAuthority (string, optional)
// - expiryRequired (boolean, optional)
// - verificationRequired (boolean, optional)
```

---

## Copy Rules (Enforced)

Allowed:
- "Add certification/license requirements"
- "Show requirements"
- "Certification and license requirements"
- "Certifications and licenses required for this role"

Forbidden:
- "Auto-match licenses"
- "We'll match applicants by their certifications"
- "Candidates with required certifications will be ranked higher"
- "Missing certification detected"

---

## Hard Guardrails

1. Do NOT wire certificationRequirementFactor() — if this method exists in any scoring code, it must not be called from anywhere
2. Do NOT add certification requirements to the publish required-fields list
3. Do NOT auto-reject applicants based on cert requirements
4. Do NOT display a "cert match score" or "cert gap" to employers or applicants
5. Do NOT create a canonical cert taxonomy or normalized cert names

---

## Backlog (Safe for Future)

- Audit job-view component to confirm cert requirements display correctly
- Audit public-details component to confirm cert requirements shown to applicants
- Add empty state copy: "No certification requirements added" when FormArray is empty
- Add helper text to cert requirement form fields explaining what each field means

---

## Files Changed

None in V5.
