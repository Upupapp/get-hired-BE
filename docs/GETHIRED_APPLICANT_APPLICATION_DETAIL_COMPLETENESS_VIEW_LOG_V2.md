# GetHired — Application Detail Completeness View Log V2

**Date:** 2026-06-24  
**Phase:** 9

---

## Status: Inline Expand Pattern (No Separate Route)

### Decision
No dedicated application detail page or route was built. The expand-in-list pattern was chosen because:
1. No existing application detail route exists — creating one would require router changes, guard updates, and data-passing architecture out of scope
2. The inline expand pattern (toggle button in list row → card in same row) is standard for this screen density
3. All required state is available in the list: `snapshotsMap` already holds all batch data; no additional fetch needed on expand

### Implementation
- Toggle button wraps the badge pill (always visible) + chevron arrow
- `aria-expanded` + `aria-controls` provide keyboard accessibility for the expand/collapse
- Card is conditionally rendered (`*ngIf`) — DOM is removed on collapse, not just hidden
- `aria-live="polite"` on the card container announces content changes to screen readers

### If a Detail Route is Added in the Future
The `ApplicationCompletenessCardComponent` is designed to be reused:
- It accepts `snapshot`, `loading`, `error`, `retryClick` as inputs
- It does not depend on the list component's internal state
- The single-endpoint (`getApplicationSnapshot(id)`) is available in `ApplicationService` and would provide `snapshotCreatedAt` + `source` fields not available in the batch response

### Profile Edit Route (Confirmed)
- Route: `/user/profile/edit` → `ApplicantProfileFormComponent`
- Path defined in `applicant-profile.module.ts`
- All CTAs in the card and badge components route to this path
