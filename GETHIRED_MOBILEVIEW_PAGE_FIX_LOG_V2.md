# GETHIRED MOBILEVIEW PAGE FIX LOG V2 — RECENT DEPLOYMENT

## Fix Applied: safe-area-inset-bottom on JAC footer

**File:** table-control-modal.component.scss
**Issue:** On iOS with home indicator, .gh-jac-footer may be behind safe area
**Fix:** Add `padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px))` to `.gh-jac-footer`
**Status:** APPLYING

## mobile-issue-001 · .gh-jac-close touch target (32px)
**Status:** DEFERRED — close button is at top of modal, rarely used on mobile (swipe-to-dismiss via CDK backdrop); deferred to next mobile pass

## mobile-issue-002 · .gh-jac-btn height (~40px)
**Status:** DEFERRED — part of ACT-007

## mobile-issue-003 · Footer safe-area
**Status:** APPLYING (safe fix above)
