# GETHIRED BRAND QA CHECKLIST — RECENT DEPLOYMENT

## Visual
- [x] Header uses Deep Navy (#1a1830) background
- [x] Primary action uses Coral (#FF7062) accent
- [x] Secondary actions use Azure (#6C6BAD) accent  
- [x] Delete/danger uses Red (#dc2626) — NOT coral
- [x] Status chips: published=green, draft=amber, expired=red, archived=gray
- [x] White card background (#fff) with 16px border-radius
- [x] Subtle gray borders (#e5e7eb = gh-gray-200)

## Motion
- [x] Skeleton shimmer: gh-shimmer keyframe
- [x] Reduced motion: animation:none + static background fallback
- [x] Confirm fade: gh-confirm-fade keyframe (opacity+transform)
- [x] Reduced motion: confirm fade animation:none
- [x] Hover lift: translateY(-1px) on action rows
- [x] Global prefers-reduced-motion block in styles.scss suppresses transitions

## Haptics
- [x] Haptic on clipboard copy: navigator.vibrate(8)
- [x] Guard: typeof navigator !== undefined && navigator.vibrate check
- [x] Try/catch wrapper
- [x] NOT on page load
- [x] NOT on delete/error events
- [x] NOT on loading states

## Typography
- [x] Action labels: 14px/600
- [x] Action descriptions: 12px/400 gray
- [x] Header title: 18px/700 white
- [x] Group labels: 10px/700 uppercase 0.08em tracking (eyebrow pattern)
- [x] Status/meta: 11px/600-700

## Brand integrity
- [x] No fake applicant counts (real COUNT from DB)
- [x] No fake interview question counts (real COUNT from DB)
- [x] No fake "verified" labels
- [x] No fake urgency signals
- [x] No "AI-powered" claims
- [x] No hiring outcome guarantees
