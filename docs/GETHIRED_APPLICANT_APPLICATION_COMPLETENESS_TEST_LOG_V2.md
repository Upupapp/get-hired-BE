# GetHired — Application Completeness Test Log V2

**Date:** 2026-06-24  
**Phase:** 19 (Testing)

---

## Build Verification

**Command:** `ng build --configuration production`  
**Result:** PASS — zero new errors  
**Time:** ~30 seconds  
**New warnings introduced:** None (pre-existing autoprefixer + xlsx warnings unchanged)

---

## Component Unit Test Specifications (Not yet written — recommended)

### ApplicationCompletenessBadgeComponent

```typescript
describe('ApplicationCompletenessBadgeComponent', () => {
  it('should show skeleton when loading=true');
  it('should show "Unavailable" when !loading && level===null && score===null');
  it('should show "Getting started" for level==="incomplete"');
  it('should show "Excellent · 94%" when level==="excellent" and score===94');
  it('should apply .acb-level--excellent for level==="excellent"');
  it('should apply .acb-level--strong for level==="strong"');
  it('should apply .acb-level--basic for level==="basic"');
  it('should apply .acb-level--incomplete for level==="incomplete"');
  it('should have correct aria-label in each state');
  it('should show score only when score !== null');
});
```

### ApplicationCompletenessCardComponent

```typescript
describe('ApplicationCompletenessCardComponent', () => {
  it('should show skeleton when loading=true');
  it('should show error block when !loading && error=true');
  it('should emit retryClick on "Try again" click');
  it('should show unavailable note when snapshot===null');
  it('should show pre-deployment note when snapshot.hasSnapshot===false');
  it('should show positive state when hasSnapshot && no missing items');
  it('should show required tips block when missingRequired.length > 0');
  it('should show recommended tips block when missingRecommended.length > 0');
  it('should NOT show positive state when required items present');
  it('should show progress bar with correct aria-valuenow');
  it('should show disclaimer note');
  it('should show privacy note when present');
  it('should NOT show privacy note when empty/null');
  it('trackByReason() should return reason string');
  it('sectionLabel() should map "work experience" → "Work Experience"');
  it('sectionLabel() should return "Your Profile" for unknown reason');
});
```

### ApplicantApplicationsComponent

```typescript
describe('ApplicantApplicationsComponent', () => {
  it('should call loadData() not ngOnInit() from retry()');
  it('should reset expandedSnapshotId on retry()');
  it('should toggle expandedSnapshotId on toggleSnapshot()');
  it('should collapse card on second toggleSnapshot() call');
  it('should call analytics.trackApplicationCompletenessViewed on expand');
  it('should NOT re-call analytics on collapse');
  it('onSnapshotRetry() should NOT reset the applications list');
  it('snapshotsError should be true when batch forkJoin errors');
  it('trackByAppId() should return jobApplicationId');
});
```

---

## Manual Verification Checklist

- [ ] Applications list loads with skeletons in badges until snapshots resolve
- [ ] Badge shows correct level + score after load
- [ ] Badge shows "Unavailable" for applications with no snapshot entry
- [ ] Toggle button expands/collapses card on click
- [ ] Card shows loading skeleton while `!snapshotsLoaded`
- [ ] Card shows positive state when no missing items
- [ ] Card shows required amber block when missingRequired present
- [ ] Card shows recommended blue block when missingRecommended present
- [ ] Card shows pre-deployment note for hasSnapshot=false
- [ ] Card shows error state + retry when batch fails
- [ ] Retry in error state refreshes snapshots, not full page
- [ ] Profile CTA routes to /user/profile/edit
- [ ] Toggle button keyboard accessible (Enter/Space)
- [ ] CTA links keyboard accessible
- [ ] Reduced motion: shimmer and reveals suppressed

---

## SQLite/Prod Test Note

Per `sqlite_test_schema_gap` memory note: `php artisan test` is blocked by ~90/132 missing SQLite migrations. Backend testing for this feature should use prod smoke scripts against the live `/applicant/application/snapshots` endpoint.
