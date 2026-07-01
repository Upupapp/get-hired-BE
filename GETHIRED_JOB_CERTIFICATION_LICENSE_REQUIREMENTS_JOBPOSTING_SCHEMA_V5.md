# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — JOBPOSTING SCHEMA V5
**Date:** 2026-07-01

---

## Decision: Do NOT Add certificationRequirements to JobPosting JSON-LD in V1

**Reason:** No dedicated schema.org property for structured credential requirements exists in the JobPosting schema. The safest approach is to fold credential requirements into the `description` field (which already contains the full job description).

**JobPosting JSON-LD is already deferred in V5 OPTIMIZE report** — the full JobPosting schema implementation is a backlog item.

---

## When JobPosting JSON-LD IS Eventually Implemented

When the main JobPosting JSON-LD block is added (see OPTIMIZE V5 report, OPT-005):

### Option A: Include in description (simplest, Google-safe)
```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "...",
  "description": "... Required certifications: PRC license (LTO), BOSH certificate ...",
  ...
}
```

Pros: Simple, no schema extension needed, Google-safe
Cons: Less structured

### Option B: Use `qualifications` property (if schema.org supports)
```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "qualifications": "PRC license required. BOSH certificate preferred.",
  ...
}
```

### Strict Rules
- Only include credential requirements in schema if they are VISIBLE on the public page ✅
- Do NOT include `id`, `canonicalKey`, or internal fields ✅
- Do NOT include requirements for draft/unpublished jobs ✅
- Do NOT include fake qualification data ✅
- Do NOT claim requirements are "verified" ✅
- Empty requirements → omit from schema entirely ✅

---

## SEO Impact

- JobPosting JSON-LD with clear qualifications may improve Google Jobs rich result quality
- Google may surface the job to candidates who search for specific credential keywords
- This is informational only — not a ranking factor for match scoring

---

## Status

| Item | Status |
|---|---|
| JobPosting JSON-LD base implementation | ❌ Deferred (OPTIMIZE V5 backlog OPT-005) |
| certificationRequirements in JSON-LD | ❌ Deferred (depends on base implementation) |
| Public page shows requirements | ✅ Implemented |
| Schema matches visible content rule | ✅ Will hold when implemented |
