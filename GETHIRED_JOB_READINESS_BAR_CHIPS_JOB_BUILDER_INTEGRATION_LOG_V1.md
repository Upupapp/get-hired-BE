# GETHIRED_JOB_READINESS_BAR_CHIPS_JOB_BUILDER_INTEGRATION_LOG_V1

## Changes to job-create.component.ts
1. Added import: `JobReadinessService`, `JobReadinessResult` from `../services/job-readiness.service`
2. Added import: `debounceTime` from `rxjs`
3. Added property: `readinessResult: JobReadinessResult | null = null`
4. Added constructor injection: `private jobReadiness: JobReadinessService`
5. Added handler: `onReadinessJumpToSection(sectionId: string)` — scrolls to element by ID
6. In `setFormGroup()`, after the existing formSubs block:
   - Added `this.jobForm.valueChanges.pipe(debounceTime(300)).subscribe(...)` to recompute on change
   - Added immediate compute after subscription setup (so bar shows on load)

## Changes to job-create.component.html
Added readiness panel between the stepper section and the form sections:
```html
<div class="jrc-builder-readiness-panel" *ngIf="stepper !== 4">
  <div class="card card-body py-3 jrc-readiness-card">
    <app-job-readiness-bar [result]="readinessResult"></app-job-readiness-bar>
    <app-job-readiness-chips [result]="readinessResult" (jumpToSection)="onReadinessJumpToSection($event)">
    </app-job-readiness-chips>
  </div>
</div>
```
NOTE: Panel is hidden on stepper === 4 (preview step) because the preview step has its own readiness card.

## Changes to job-create.component.scss
Added `.jrc-builder-readiness-panel`, `.jrc-readiness-card`, `.jrc-readiness-card-header`, `.jrc-readiness-card-title`

## debounce choice: 300ms
Matches the spec requirement. Prevents recomputation on every keystroke.
The formSubs.unsubscribe/new-Subscription pattern (FIX-10) means the debounce
subscription is properly cleaned up when editJob$ emits (which calls setFormGroup again).

## Preserved behaviors
- initialFormValid / jobInfoValid / interviewValid stepper logic unchanged
- stepperItems disabled states unchanged
- B04: interview questions not in blocking list
- save/publish/draft flows unchanged
- companyId source (localStorage) unchanged
