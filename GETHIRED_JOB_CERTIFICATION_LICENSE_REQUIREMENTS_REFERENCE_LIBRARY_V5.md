# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — REFERENCE LIBRARY V5
**Date:** 2026-07-01

---

## §1 Job-Relatedness and Fair-Hiring Framework

Credential requirements on job posts must be:
- Directly related to the job's actual duties
- Based on genuine business necessity
- Applied consistently and without discriminatory intent
- Transparent about what is required vs. preferred

### GetHired Helper Copy (Required on Employer Form)
> "Only add credentials that are relevant to the job."
> "Only add credentials that are required or genuinely preferred for this role."

### What Employers Should Ask Before Adding a Requirement
1. Is this credential legally required for this role in the Philippines?
2. Is this credential standard practice in this industry for this role?
3. Would the absence of this credential create a genuine business or safety risk?
4. Can I apply this requirement consistently to all candidates regardless of protected traits?

### Fair-Hiring Guardrails
- Do NOT add requirements that indirectly screen for protected traits (age, gender, nationality, religion, disability, appearance)
- "With pleasing personality" is NOT a credential requirement
- "Young and dynamic" is NOT a credential requirement
- "Filipino-looking" is NOT a credential requirement
- Age limits disguised as "experience caps" are NOT acceptable

---

## §2 Structured Hiring Transparency Framework

Structured credential requirements improve hiring transparency compared to vague description text.

### Why Structure Matters
| Vague (Bad) | Structured (Better) |
|---|---|
| "Must have license" | License: Professional Driver's License (LTO) — Required — Valid/unexpired |
| "Preferred with certs" | Certification: TESDA NC II in Electrical Installation — Preferred |
| "Safety certified" | Certification: BOSH/COSH — Required — Employer may ask for proof |

### Structured Fields
| Field | Description | Required? |
|---|---|---|
| `name` | Credential name | Yes (if row saved) |
| `type` | One of: certification, license, permit, eligibility, other | Yes |
| `importance` | required or preferred | Yes |
| `issuingAuthority` | Who issues it (e.g., "PRC", "LTO", "TESDA") | No |
| `expiryRequired` | Employer requests valid/unexpired document | No (default false) |
| `verificationRequired` | Employer may ask for proof | No (default false) |

---

## §3 Required vs. Preferred Clarity Framework

### Visual Distinction Rules
- Required and Preferred must be visually distinct
- Must NOT rely on color alone
- Must use both label text AND visual grouping
- Chips/badges must have readable text labels

### Display Pattern
```
CERTIFICATIONS & LICENSES

Required
  [License] Professional Driver's License  (LTO)
             Valid/unexpired document may be requested

Preferred
  [Certification] TESDA NC II in Electrical Works
  [Certification] BOSH Certificate  (DOLE)
                  Employer may ask for proof
```

### Accessibility Rules
- `role="list"` on each group
- Each item: `role="listitem"`
- Type chip: has accessible text label (not just color)
- Empty section: not rendered, no empty heading

---

## §4 Angular Dynamic Form Framework

### Pattern for Dynamic Rows
Use `FormArray` in Angular Reactive Forms:
```typescript
get certificationRequirements(): FormArray {
  return this.jobForm.get('certificationRequirements') as FormArray;
}

addRequirement(): void {
  this.certificationRequirements.push(this.buildRequirementGroup());
}

removeRequirement(index: number): void {
  this.certificationRequirements.removeAt(index);
}

buildRequirementGroup(req?: Partial<JobCertificationRequirement>): FormGroup {
  return this.fb.group({
    id: [req && req.id !== undefined ? req.id : null],
    name: [req && req.name ? req.name : '', Validators.maxLength(200)],
    type: [req && req.type ? req.type : 'certification'],
    importance: [req && req.importance ? req.importance : 'required'],
    issuingAuthority: [req && req.issuingAuthority ? req.issuingAuthority : null, Validators.maxLength(200)],
    expiryRequired: [req && req.expiryRequired ? req.expiryRequired : false],
    verificationRequired: [req && req.verificationRequired ? req.verificationRequired : false]
  });
}
```

### Rules
- Empty FormArray is valid (no certification requirements)
- `trackBy` is required for `*ngFor` on dynamic rows
- Focus must return to the "Add credential" button after removing a row
- Save button should not be blocked by an empty credential section

---

## §5 Public DTO and JobPosting Consistency Framework

### Public DTO Must
- Strip `id` / `canonicalKey` / internal fields
- Only include: name, type, importance, issuingAuthority, expiryRequired, verificationRequired
- Only appear for published/open jobs
- Be empty array (or omitted) for draft jobs

### Public DTO Must NOT
- Include applicant matching data
- Include internal DB IDs unless existing app pattern requires them
- Include verification results
- Include scoring or ranking signals

---

## §6 API Object-Level Authorization Framework

Every mutation on `job_certification_requirements` must:
1. Verify caller is authenticated employer/recruiter
2. Derive `company_id` from auth token, NEVER from request body
3. Verify parent `job_id` belongs to caller's company
4. Verify child `requirement_id` (if updating/deleting) belongs to the parent `job_id`

### BOLA/IDOR Tests Required
- Employer A cannot update Employer B's job requirements
- Employer A cannot delete requirement ID belonging to another job
- Applicant/anonymous cannot call mutation endpoints
- User cannot inject `company_id` or `job_id` in body

---

## §7 Backward Compatibility Framework

All normalization must handle:
- `certificationRequirements: null` → treat as `[]`
- `certificationRequirements: undefined` → treat as `[]`
- `certificationRequirements: []` → render nothing (hide section)
- Missing field entirely → treat as `[]`
- Old job API response with no field → no crash
- Individual row with missing optional fields → show with available fields only

---

## §8 Honest Copy Framework (V1 Display-Only)

### This V1 IS
- A structured display feature showing what employers want
- A transparency improvement over unstructured description text
- A basis for future matching (without implementing it now)

### This V1 IS NOT
- A credential verification engine
- An applicant matching system
- An automated screening tool
- A ranking system
- An AI credential checker

### Copy Rules
| ✅ Allowed | ❌ Forbidden |
|---|---|
| "Certifications & Licenses" | "Automatically match licensed applicants" |
| "Required" | "AI will verify certifications" |
| "Preferred" | "GetHired verifies licenses" |
| "Employer may ask for proof" | "Verified by GetHired" |
| "Valid/unexpired document may be requested" | "License matched" |
| "Add credentials relevant to this role" | "Credential score" |
| "Applicants can see these requirements on the job post" | "Missing certifications lower match score" |

---

## §9 Reduced-Motion and Performance Framework

### CSS Animation Rules
- Use `transform` and `opacity` only (no layout-affecting properties)
- Gate all animations: `@media (prefers-reduced-motion: no-preference)`
- No infinite loops, no flashing, no heavy animation library
- No layout shift in public job detail
- Skeleton shimmer for loading: opacity pulse only

### Haptic Rules
- Light (5ms): row add, row remove, chip select
- Never on page load
- Never repeated/looping
- Never the only feedback

---

## §10 Regression-First QA Framework

This command is scoped stabilization only.

**Fix only:**
- Bugs directly blocking the certification/license V1 feature from working
- Unsafe copy in touched files
- Missing BOLA guards on requirement mutation endpoints
- Missing null/undefined normalization for old jobs

**Backlog (do not fix now):**
- Taxonomy/canonical credential dictionary
- MATCH integration
- Applicant credential comparison
- Global copy audit
- Global accessibility refactor
- E2E tests

---

## §11 Philippine Context — Common Credentials

### Common Required Credentials in PH Hiring
| Industry | Credential | Issuing Authority |
|---|---|---|
| Healthcare | PRC license | PRC |
| Driving/Logistics | Professional Driver's License | LTO |
| Construction | TESDA NC II/III | TESDA |
| Food Service | Food Handler's Certificate | Local Government |
| Security | SOSIA license | PNP |
| Electrical | PEC license | PRC |
| Teaching | LET/PRC license | PRC |
| Government | Civil Service Eligibility | CSC |
| Safety | BOSH/COSH | DOLE |
| Accounting | CPA license | PRC |

### Placeholder Examples (Not Defaults)
These are placeholder text for the "requirement name" field hint, NOT auto-inserted data:
- "PRC license"
- "Driver's license"
- "TESDA NC II"
- "Civil Service eligibility"
- "BOSH/COSH certificate"
- "Food safety certificate"
