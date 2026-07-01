# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — CANONICAL CONTRACT V5
**Date:** 2026-07-01

---

## Canonical Frontend Model

```typescript
interface JobCertificationRequirement {
  id?: number | string | null;             // DB row ID; undefined for new rows
  name: string;                            // Required when row is saved
  type: CertificationRequirementType;      // See enum below
  importance: CertificationImportance;     // 'required' | 'preferred'
  issuingAuthority?: string | null;        // Optional — PRC, LTO, TESDA, etc.
  expiryRequired: boolean;                 // Default false
  verificationRequired: boolean;           // Default false
  canonicalKey?: string | null;            // Future use — null in V1
  displayOrder?: number | null;            // Optional sort order
}

type CertificationRequirementType =
  | 'certification'
  | 'license'
  | 'permit'
  | 'eligibility'
  | 'other';

type CertificationImportance = 'required' | 'preferred';
```

---

## Canonical API Field Name

```
certificationRequirements: JobCertificationRequirement[]
```

---

## Field Rules

| Field | Required | Default | Validation | Public? |
|---|---|---|---|---|
| `id` | No (new rows have none) | undefined/null | Valid int/string | No (employer only) |
| `name` | Yes (for saved row) | — | maxLength: 200, not blank | Yes |
| `type` | Yes | 'certification' | enum allowlist | Yes |
| `importance` | Yes | 'required' | enum allowlist | Yes |
| `issuingAuthority` | No | null | maxLength: 200 | Yes (if present) |
| `expiryRequired` | No | false | boolean | Yes |
| `verificationRequired` | No | false | boolean | Yes |
| `canonicalKey` | No | null | Future use | No |
| `displayOrder` | No | null | Integer | No |

---

## Type Enum Display Labels

| Value | Display Label |
|---|---|
| certification | Certification |
| license | License |
| permit | Permit |
| eligibility | Eligibility |
| other | Other |

---

## Importance Enum Display Labels

| Value | Display Label |
|---|---|
| required | Required |
| preferred | Preferred |

---

## Normalization Rules

```typescript
// Safe normalizer for incoming job API response
function normalizeCertificationRequirements(raw: any): JobCertificationRequirement[] {
  const list =
    raw && raw.certificationRequirements != null ? raw.certificationRequirements
    : raw && raw.certification_requirements != null ? raw.certification_requirements
    : raw && raw.jobCertificationRequirements != null ? raw.jobCertificationRequirements
    : raw && raw.job_certification_requirements != null ? raw.job_certification_requirements
    : raw && raw.licenseRequirements != null ? raw.licenseRequirements
    : raw && raw.credentialRequirements != null ? raw.credentialRequirements
    : null;

  if (!list || !Array.isArray(list)) return [];

  return list
    .filter(function(item: any) { return item && item.name && item.name.trim().length > 0; })
    .map(function(item: any): JobCertificationRequirement {
      return {
        id: item.id !== undefined ? item.id : null,
        name: (item.name || '').trim(),
        type: isValidType(item.type) ? item.type : 'other',
        importance: item.importance === 'preferred' ? 'preferred' : 'required',
        issuingAuthority: item.issuingAuthority || item.issuing_authority || null,
        expiryRequired: Boolean(item.expiryRequired || item.expiry_required),
        verificationRequired: Boolean(item.verificationRequired || item.verification_required),
        canonicalKey: item.canonicalKey || item.canonical_key || null,
        displayOrder: item.displayOrder || item.display_order || null
      };
    });
}

const VALID_TYPES = ['certification', 'license', 'permit', 'eligibility', 'other'];
function isValidType(t: any): boolean {
  return typeof t === 'string' && VALID_TYPES.indexOf(t) !== -1;
}
```

---

## Public (Applicant/Anonymous) DTO

```typescript
interface PublicCertificationRequirement {
  name: string;
  type: CertificationRequirementType;
  importance: CertificationImportance;
  issuingAuthority?: string | null;
  expiryRequired: boolean;
  verificationRequired: boolean;
  // NO: id, canonicalKey, displayOrder
}
```

---

## Employer (Edit) DTO

```typescript
interface EmployerCertificationRequirement extends PublicCertificationRequirement {
  id?: number | string | null;    // For update/delete operations
  canonicalKey?: string | null;   // Future taxonomy (currently null)
  displayOrder?: number | null;   // Optional UI sort order
}
```

---

## Backward Compatibility Guarantees

| Scenario | Expected Behavior |
|---|---|
| Job with `certificationRequirements: null` | Normalize to `[]`, no crash |
| Job with `certificationRequirements: undefined` | Normalize to `[]`, no crash |
| Job with `certificationRequirements: []` | No section shown on public detail |
| Job with no `certificationRequirements` field at all | Normalize to `[]`, no crash |
| Row with missing optional fields | Display with available fields |
| Row with blank `name` | Skip row in normalization |
| Row with invalid `type` | Normalize to `'other'` |
| Row with invalid `importance` | Normalize to `'required'` |

---

## Max Rows

Recommended max: **10 rows per job** (enforced in BE validation, FE blocks "Add" button at limit)

Rationale: More than 10 credential requirements is unusual and may indicate credential-stuffing or gatekeeping. Employers can use job description for supplementary notes.
