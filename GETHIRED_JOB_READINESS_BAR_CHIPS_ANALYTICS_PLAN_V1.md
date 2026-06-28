# GETHIRED_JOB_READINESS_BAR_CHIPS_ANALYTICS_PLAN_V1

## Analytics Events (planned, not yet wired)

### Events to track (deferred to Phase 2)

| Event | Trigger | Properties |
|-------|---------|------------|
| `job_readiness_viewed` | Readiness bar rendered | readinessLevel, readinessPercent, jobId |
| `job_readiness_chip_clicked` | Blocking or recommended chip clicked | chipKey, chipKind, sectionId, readinessLevel |
| `job_readiness_level_changed` | Level changes on form edit | fromLevel, toLevel, jobId |
| `job_readiness_can_publish_reached` | canPublish flips true | readinessPercent, jobId |
| `job_readiness_excellent_reached` | readinessLevel === 'excellent' | jobId |
| `job_readiness_publish_with_gaps` | Publish clicked while recommendedComplete < recommendedTotal | readinessPercent, gapCount |

### Data currently available
- `readinessResult.readinessLevel` — available in job-create.component.ts
- `readinessResult.readinessPercent` — available
- `readinessResult.blockingItems.length` — available
- `readinessResult.recommendationItems.length` — available
- `jobId` — available as `this.jobId` in job-create.component.ts

### Existing analytics infrastructure
`PublicPortalAnalyticsService` tracks employer/portal events.
The readiness analytics could use the same service or a dedicated `RecruiterAnalyticsService`.

### Why deferred
- No analytics service exists specifically for recruiter job-builder events
- Adding analytics is additive (safe) and can be done without affecting existing behavior
- The readiness service is pure and would need an event emitter or analytics injection
  only at the integration layer (job-create.component.ts), not in the service itself

### Backlog item
"Add job readiness analytics events to job-create.component.ts and employer-job-dashboard"
Priority: low (data collection, not user-facing)
