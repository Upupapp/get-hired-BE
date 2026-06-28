# GETHIRED_JOB_READINESS_BAR_CHIPS_BEST_PRACTICES_PLAN_V1

## Design Principles Applied

### 1. Deterministic, not AI
All readiness logic is pure TypeScript — no HTTP calls, no MATCH engine, no external signals.
The `JobReadinessService.evaluate()` method is a pure function: same input → same output.
No caching, no subscriptions, no side effects.

### 2. B04 preservation
Interview/video questions are OPTIONAL per B04. They appear in the `recommended` bucket,
not the `blocking` bucket. The B04 comment in job-create.component.ts is preserved.

### 3. Mirrors actual publish gate
`canPublish` in `JobReadinessResult` mirrors the exact condition in `publishJobPost()`:
jobTypeId + jobLevelId + jobCity + jobCountry + jobDescription + workSetupId + banner + companyId.
Certifications, salary, brand, benefits, and interview questions do NOT block publish.

### 4. Readiness levels
- `draft`: required fields missing
- `basic`: can publish, < 3 recommended sections complete
- `strong`: can publish, 3+ but not all recommended
- `excellent`: can publish + all recommended complete

### 5. Accessibility (WCAG 2.1 AA)
- Progress bar: role="progressbar" with aria-valuemin/max/now/label
- Chips: all interactive chips are `<button>` elements
- Not color-only: every chip has an icon + text
- Keyboard navigation: Tab/Enter/Space on all interactive chips
- Screen reader: role="status" aria-live="polite" on publish-ready confirmation
- Reduced-motion: all animations guarded with `@media (prefers-reduced-motion: reduce)`

### 6. Performance
- `ChangeDetectionStrategy.OnPush` on both bar and chips components
- Debounced 300ms form value subscription in job-create
- trackBy on chip ngFor loops

### 7. No forbidden copy
Zero instances of: AI score, AI optimized, Perfect, Guaranteed, Top ranked, 500K candidates,
Missing certifications lower match, Missing video questions lower match, Best job post.

### 8. Encapsulation
- `JobReadinessService`: `providedIn: 'root'` (tree-shakeable, no module registration needed)
- Both components declared in `JobModule` and exported (so `EmployerJobsModule` which imports `JobModule` gets them)

### 9. Haptics / effects
- Bar fill: `width` CSS transition 600ms
- Level chip glow: one-shot box-shadow animation on level change
- Skeleton shimmer: background-position animation, `@include ambient-motion-safe`
- Chip enter: fade + translateY 200ms
- Blocking chip nudge: shake keyframe 400ms, one-shot
- Recommended chip hover: scale(1.03), `@include motion-safe`
- Jump-to-section button press: scale(0.97) active state

### 10. Public isolation
- Readiness is employer-only — never exposed in:
  - Public job detail (`/jobs/details/:id`)
  - Applicant job detail
  - Application flow
  - Any component accessible without recruiter auth
