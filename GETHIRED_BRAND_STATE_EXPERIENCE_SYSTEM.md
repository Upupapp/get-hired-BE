# GETHIRED BRAND STATE EXPERIENCE SYSTEM — RECENT DEPLOYMENT

## States covered in JAC Modal

| State | Component | Treatment |
|---|---|---|
| Loading (summary) | Summary strip | Skeleton shimmer chips (gh-shimmer) |
| Success (link copy) | Copy link button | "Link copied!" + icon change + 8ms haptic |
| Disabled (share when not published) | Copy link button | opacity 0.52, not-allowed cursor, explains why |
| Danger/confirm (delete) | Confirm panel | Red bg, red border, gh-confirm-fade entry animation |
| Error (summary load fail) | (implicit) | Falls back to list row data; no visible error notice |

## States covered in V7 Job Detail

| State | Component | Treatment |
|---|---|---|
| Loading | inline-loading component | Shown while job loads |
| Error | role=alert div | Context-aware message + CTA |
| Content quality warning | role=status div | Info notice with icon |

## Gaps:
- JAC summaryError=true has no visible notice (silent degradation) — see BRAND BACKLOG BB-004
