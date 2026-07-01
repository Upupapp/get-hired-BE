# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — PUBLIC/APPLICANT DISPLAY V5
**Date:** 2026-07-01

---

## Implementation Status: ✅ FULLY IMPLEMENTED

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` (Lines 214–229)

---

## Empty Guard

```html
<div *ngIf="nJob.certificationRequirements?.length > 0">
  <!-- Section renders only when populated -->
</div>
```
**Status:** ✅ Correct — section hidden when empty/null/undefined

---

## Section Structure

```html
<section aria-label="Certifications & Licenses">
  <h3>Certifications &amp; Licenses</h3>

  <!-- Required Group -->
  <div *ngIf="requiredCerts.length > 0">
    <h4>Required</h4>
    <ul role="list">
      <li *ngFor="let req of requiredCerts" role="listitem">
        <strong>{{ req.name }}</strong>
        <span class="type-chip">({{ req.type | titlecase }})</span>
        <span *ngIf="req.issuingAuthority" class="issuer">{{ req.issuingAuthority }}</span>
        <span *ngIf="req.expiryRequired">Valid/unexpired document may be requested</span>
        <span *ngIf="req.verificationRequired">Employer may ask for proof</span>
      </li>
    </ul>
  </div>

  <!-- Preferred Group -->
  <div *ngIf="preferredCerts.length > 0">
    <h4>Preferred</h4>
    <ul role="list">
      <li *ngFor="let req of preferredCerts" role="listitem">
        <!-- same structure -->
      </li>
    </ul>
  </div>
</section>
```

---

## Current Display (from audit)

The component at `job-posts-details.component.html:214-229` shows:
- Name (bold)
- Required/Preferred badge (i18n key: `job.required` / `job.preferred`)
- Type in parentheses (`titlecase` pipe)
- Issuing authority if present (muted text)
- "Verification required" label if `verificationRequired: true` (i18n)
- "Expiry required" label if `expiryRequired: true` (i18n)

---

## What Must NOT Be Shown

| Forbidden Content | Reason |
|---|---|
| "Verified by GetHired" | No verification system exists |
| "AI verified" | No AI verification |
| "Credential matched" | No MATCH integration in V1 |
| "Missing credential lowers match score" | False claim |
| "You are unqualified" | Auto-rejection not implemented |
| "Apply" button blocked based on credentials | No application gate |
| Raw `id` / `canonicalKey` values | Internal fields (stripped in V5) |

---

## Applicant Application Info Notice (Recommended)

When published job has required credentials:
```html
<div class="cert-application-notice" *ngIf="hasRequiredCerts">
  <p>This job lists required credentials. The employer may ask for proof during the application or interview process.</p>
</div>
```

**Do NOT:**
- Block the Apply button
- Auto-score applicant
- Show "you meet/don't meet this requirement"

---

## Section Behavior by Job State

| Job State | Section Visible | Data Source |
|---|---|---|
| Draft | No (public pages don't serve drafts) | N/A |
| Published + empty certs | No (section hidden by `*ngIf`) | `[]` |
| Published + populated certs | Yes | `certificationRequirements` from API |
| Expired/archived | Depends on route guard — not shown on public portal if expired | N/A |

---

## i18n Keys (Required for Localization)

| Key | Default (English) |
|---|---|
| `certifications.section_title` | "Certifications & Licenses" |
| `certifications.required_group` | "Required" |
| `certifications.preferred_group` | "Preferred" |
| `certifications.expiry_notice` | "Valid/unexpired document may be requested" |
| `certifications.verification_notice` | "Employer may ask for proof" |
| `certifications.type.certification` | "Certification" |
| `certifications.type.license` | "License" |
| `certifications.type.permit` | "Permit" |
| `certifications.type.eligibility` | "Eligibility" |
| `certifications.type.other` | "Other" |

---

## Old Jobs Backward Compatibility

- Old job with no `certificationRequirements` field → normalizer returns `[]` → `*ngIf="length > 0"` → section hidden ✅
- Old job with `null` → same behavior ✅
- Old job with `[]` → same behavior ✅
- No crash on any of these states ✅
