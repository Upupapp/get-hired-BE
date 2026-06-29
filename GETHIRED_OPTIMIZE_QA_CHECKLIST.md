# GETHIRED OPTIMIZE QA CHECKLIST — RECENT DEPLOYMENT

## Performance
- [x] No new npm dependencies
- [x] Bundle size not increased
- [x] Animations: gh-shimmer, gh-confirm-fade — both reduced-motion guarded
- [x] No width/height animations (no layout thrash)
- [x] No synchronous DB queries (3 async queries per endpoint call)
- [x] No N+1 problem in action-summary endpoint

## A11y
- [x] All buttons have accessible labels
- [x] Skeleton chips aria-hidden
- [x] Icon-only elements aria-hidden
- [x] Delete confirm uses role="alertdialog"
- [x] V7 error state uses role="alert"
- [x] V7 boilerplate notice uses role="status"
- [ ] role="dialog" double-nesting (deferred — OPT-001)
- [ ] .gh-jac-btn 44px touch target (deferred — OPT-002)

## Mobile
- [x] JAC modal: max-width 96vw
- [x] JAC modal bottom-sheet on ≤600px
- [x] border-radius 16px 16px 0 0 on mobile
- [x] max-height 92dvh (dynamic viewport)
- [x] overflow-y auto on .gh-jac-body
- [x] Action rows are full-width with comfortable touch padding

## SEO
- [x] V7 breadcrumb: single semantic <nav>, <ol> structure
- [x] aria-current="page" on final breadcrumb item
- [ ] JSON-LD structured data for job posting (deferred — OPT-004)
