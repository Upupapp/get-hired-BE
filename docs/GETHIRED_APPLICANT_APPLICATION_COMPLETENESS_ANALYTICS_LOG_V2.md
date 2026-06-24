# GetHired — Application Completeness Analytics Log V2

**Date:** 2026-06-24  
**Phase:** 18

---

## Analytics Service

**File:** `src/app/public/services/public-portal-analytics.service.ts`  
**Pattern:** `providedIn: 'root'`, console.debug in non-prod, no-op prod (no real analytics SDK yet)

---

## New Methods Added

### `trackApplicationCompletenessViewed(applicationId: string): void`
- **Triggered by:** `ApplicantApplicationsComponent.toggleSnapshot()` on expand
- **Payload:** `{ applicationId }` — no score, no level, no profile data
- **Privacy:** applicationId is applicant's own; no employer data

### `trackApplicationCompletenessCtaClicked(applicationId: string, ctaLabel: string): void`
- **Triggered by:** Not currently wired to CTA clicks (CTAs use `routerLink`, no click handler)
- **Status:** Method available, not yet called. Future enhancement: add `(click)` handlers to CTA `<a>` elements
- **Payload:** `{ applicationId, ctaLabel }` — label only ("Update your profile" / "Add to your profile")

---

## Events NOT Added (Intentional)

| Event | Reason Not Added |
|-------|-----------------|
| Per-level view (what score was seen) | Score values are PII-adjacent; not needed for basic funnel analytics |
| Retry clicked | Low-value event; error rate monitored at API level |
| Card collapsed | Not actionable; collapse is the default state |
| Every badge render | Would fire on every list load — too noisy |

---

## Privacy Compliance
- All analytics payloads use `applicationId` (UUID) not score values
- No profile field content in any payload
- Console.debug only in non-prod — no real data transmitted currently
- Pattern consistent with existing analytics methods in this file
