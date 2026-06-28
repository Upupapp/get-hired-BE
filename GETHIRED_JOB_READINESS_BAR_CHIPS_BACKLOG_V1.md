# GETHIRED_JOB_READINESS_BAR_CHIPS_BACKLOG_V1

## Deferred Items (not in B13 scope)

### P2 — Analytics events
Wire `job_readiness_chip_clicked`, `job_readiness_level_changed`, etc.
Service is already pure — events can be added at integration layer without touching the service.

### P2 — Haptic feedback on level change
`HapticFeedbackService.success()` or custom `readinessLevelUp()` when readinessLevel improves.
Requires review of HapticFeedbackService public API to ensure no new capability needed.

### P2 — Section anchor IDs on form fields
The jump-to-section feature emits sectionId strings (e.g. `section-job-title`).
Currently these need matching `id` attributes in the form HTML.
Add `id="section-job-title"` etc. to the relevant form sections in job-post-detail-step and
create-job-post-step templates to make the scroll land precisely.

### P3 — Per-chip section targeting by form field
Currently `jumpToSection` emits a section ID and scrolls to the element.
For cases where the element doesn't exist (no ID set on the form field), the scroll silently fails.
Consider adding a fallback (scroll to step label, or scroll to top of the step).

### P3 — Unit test spec file
`src/app/job/services/job-readiness.service.spec.ts` — write the 12 planned test cases.
The service is designed as a pure function specifically to make this easy.

### P3 — Compact readiness badge on job-list rows
The job-list uses `<app-reusable-table>` which doesn't support per-row custom content.
To add a compact badge, a new column type in `reusable-table` would be needed.
This is a medium-risk change (reusable-table is used across 5+ surfaces).
Deferred until reusable-table has a safe extension point.

### P3 — Readiness trend over edit sessions
Track readiness level changes across save-draft events to give recruiters
feedback like "Last time: basic → now: strong". Requires DB storage or local storage
of previous readiness state per jobId.

### P4 — Copy localisation
All readiness copy is currently English. If the app internationalises, the copy strings
in JobReadinessService.getLevelLabel() and chip labels need i18n treatment.

### P4 — Stagger animation on chip groups
Currently all chips animate in simultaneously at 200ms.
A stagger (each chip delayed 30ms after the previous) would look more polished.
Deferred because it requires restructuring the ngFor animation or using Angular animations
trigger instead of CSS animations.
