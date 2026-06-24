# GetHired — Application Completeness Backlog V2

**Date:** 2026-06-24

---

## Deferred Items

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1 | Dedicated application detail route with full card view | MEDIUM | Medium (router + data passing) |
| 2 | Per-section deep-link CTAs in missing items | MEDIUM | Low (routing only, once profile is section-routed) |
| 3 | Section icons for tip list items | LOW | Low (SVG icons per section type) |
| 4 | `snapshotCreatedAt` display ("Captured on Jan 15") | LOW | Low (use single endpoint on expand) |
| 5 | `source` field display ("Captured when submitted" vs "From current profile") | LOW | Low (single endpoint) |
| 6 | CTA click analytics (`trackApplicationCompletenessCtaClicked`) | LOW | Very low (add click handler to `<a>`) |
| 7 | Unit tests for badge + card components | MEDIUM | Medium |
| 8 | Incremental snapshot loading (show per-batch as they arrive) | LOW | Medium (requires per-ID loading state) |
| 9 | Animated count-up for percentage score | LOW | Low (motion only, not content) |
| 10 | Persistence of expanded state on back-navigation | LOW | Low (queryParam or router state) |

---

## Won't Do (by constraint)

| Item | Reason |
|------|--------|
| Show completeness to employers | Privacy violation — explicit constraint |
| Change scoring logic | Explicit constraint |
| Add new BE endpoints | Explicit constraint |
| Break existing routes | Explicit constraint |
| Remove disclaimer | Explicit constraint |
