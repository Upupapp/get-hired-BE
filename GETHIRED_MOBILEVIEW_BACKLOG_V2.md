# GETHIRED MOBILEVIEW BACKLOG V2 — RECENT DEPLOYMENT

## MB-001 · .gh-jac-close: 32px → 44px touch target
Priority: P2 | Effort: XS
Files: table-control-modal.component.scss
Fix: Change width/height from 32px to 44px; adjust icon positioning

## MB-002 · .gh-jac-btn: ensure 44px touch target
Priority: P2 | Effort: XS
Files: table-control-modal.component.scss
Fix: Add min-height: 44px to .gh-jac-btn; part of ACT-007

## MB-003 · Footer safe-area-inset-bottom (JAC)
Priority: P2 | Effort: XS
Files: table-control-modal.component.scss
Status: FIXED in this pass (see PAGE_FIX_LOG_V2)

## MB-004 · Close button safe-area (top area, iOS notch)
Priority: P3 | Effort: XS
Files: table-control-modal.component.scss
Fix: Add `padding-top: env(safe-area-inset-top, 0px)` to header on mobile
