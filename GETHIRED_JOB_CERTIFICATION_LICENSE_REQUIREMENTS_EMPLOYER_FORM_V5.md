# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — EMPLOYER FORM V5
**Date:** 2026-07-01

---

## Current Implementation Status: ✅ FULLY IMPLEMENTED

**File:** `src/app/job/job-create/components/job-post-detail-step/job-post-detail-step.component.html` (Lines 406–491)
**File:** `src/app/job/job-create/components/job-post-detail-step/job-post-detail-step.component.ts`

---

## Section Header
**Current:** "Certifications & Licenses" ✅
**Recommended helper copy below header:**
> "Add certifications, licenses, permits, or eligibility requirements that are important for this role."

**Fair-hiring helper (must be present):**
> "Only add credentials that are relevant to the job."

---

## Form Fields

| Field | Label | Type | Required | Default | Validation |
|---|---|---|---|---|---|
| `name` | "Requirement name" | Text input | Yes (when saving row) | — | maxLength: 200 |
| `type` | "Type" | Dropdown | Yes | 'certification' | Enum allowlist |
| `importance` | "Required or Preferred" | Dropdown/Radio | Yes | 'required' | Enum allowlist |
| `issuingAuthority` | "Issuing authority (optional)" | Text input | No | null | maxLength: 200 |
| `expiryRequired` | "Valid/unexpired document required" | Checkbox/Toggle | No | false | Boolean |
| `verificationRequired` | "Employer may ask for proof" | Checkbox/Toggle | No | false | Boolean |

---

## FormArray Pattern

```typescript
// job-post-detail-step.component.ts
get certificationRequirements(): FormArray {
  return this.jobForm.get('certificationRequirements') as FormArray;
}

addCertificationRequirement(): void {
  this.certificationRequirements.push(this.buildRequirementGroup());
}

removeCertificationRequirement(index: number): void {
  this.certificationRequirements.removeAt(index);
  // TODO: return focus to "Add requirement" button after removal (accessibility)
}

buildRequirementGroup(req?: Partial<JobCertificationRequirement>): FormGroup {
  return this.fb.group({
    id: [req && req.id !== undefined ? req.id : null],
    name: [req && req.name ? req.name : '', [Validators.maxLength(200)]],
    type: [req && req.type ? req.type : 'certification'],
    importance: [req && req.importance ? req.importance : 'required'],
    issuingAuthority: [req && req.issuingAuthority ? req.issuingAuthority : null, [Validators.maxLength(200)]],
    expiryRequired: [Boolean(req && req.expiryRequired)],
    verificationRequired: [Boolean(req && req.verificationRequired)]
  });
}
```

---

## Empty State

**When no requirements added:**
> "No certifications or licenses added yet. Add one only if this role requires or prefers a specific credential."

**Add button:**
`+ Add certification or license`

---

## Type Dropdown Options

| Value | Display Label |
|---|---|
| certification | Certification |
| license | License |
| permit | Permit |
| eligibility | Eligibility |
| other | Other |

---

## Importance Options

| Value | Display Label |
|---|---|
| required | Required |
| preferred | Preferred |

---

## Placeholder Examples (NOT Default Values)

The name input's placeholder attribute should suggest common Philippine credentials:
```
placeholder="e.g. PRC license, Driver's license, TESDA NC II, Civil Service eligibility..."
```
Do NOT insert these as actual default values. Do NOT pre-fill the name field.

---

## Max Rows
- Maximum: 10 requirement rows per job
- When 10 rows reached: "Add" button is disabled
- Rationale: More than 10 credentials is unusual; prevents credential-stuffing

---

## Validation Rules

| Rule | Trigger |
|---|---|
| Name is required | On submit, not on blur (per current UX) |
| Blank rows are dropped server-side (not FE validation error) | Silent |
| Type must be valid enum | FE: dropdown enforces; BE: DB CHECK |
| Importance must be valid enum | FE: dropdown enforces; BE: DB CHECK |
| Max 10 rows | FE: Add button disabled at 10 |
| issuingAuthority maxLength 200 | FE: Validators.maxLength(200) |

---

## Publish Checklist Behavior

**Certifications are NOT required for publish.** The publish checklist/validation:
- Does NOT block publish for missing certifications ✅ (confirmed in `validateJobPublishPayload`)
- May warn for incomplete rows (a row with a name but no type selected)
- May recommend if a regulated industry is detected (future, not V1)

**Copy for publish checklist:**
> "Optional: Certifications & Licenses — Add specific credential requirements if this role requires them"

**NOT:**
> "Required: Add certifications before publishing"

---

## Integration Points

| Surface | Status |
|---|---|
| Job Create (main form) | ✅ Implemented |
| Job Edit (same form via different route) | ✅ Implemented (same component) |
| Easy Job Posting / GetHired Assistant | ✅ Form section included |
| AI Job Create / Draft Review Center | ✅ Draft claim → same edit form |
| Employer preview / Preview & Publish step | ✅ Shows as applicant will see it |
