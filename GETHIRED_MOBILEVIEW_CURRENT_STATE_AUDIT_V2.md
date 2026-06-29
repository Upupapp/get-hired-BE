# GETHIRED MOBILEVIEW CURRENT STATE AUDIT V2 — RECENT DEPLOYMENT

## JAC Modal (table-control-modal) — Mobile Audit

| Viewport | Issue | Severity |
|---|---|---|
| 320px | min-width overridden correctly (unset) | PASS |
| 320px | Header meta wraps | PASS |
| 320px | Action rows scroll vertically | PASS |
| 375px | Bottom-sheet position correct | PASS |
| 375px | 92dvh max-height fits content | PASS |
| 430px | Summary chips wrap if many | PASS |
| 600px | Bottom-sheet breakpoint fires correctly | PASS |
| 600px | Close button: 32px (below 44px) | FAIL — mobile-issue-001 |
| All | .gh-jac-btn height: ~40px (borderline) | PARTIAL — mobile-issue-002 |
| All | Footer: no safe-area-inset-bottom | WARN — mobile-issue-003 |

## V7 Public Job Detail — Mobile Audit

| Viewport | Issue | Severity |
|---|---|---|
| 320px | Breadcrumb wraps cleanly | PASS |
| 320px | Boilerplate notice fills width | PASS |
| 320px | Rating column hidden correctly when 0 | PASS |
| 375px | Sticky rail hidden on mobile | PASS |
| 375px | Mobile sticky bar visible | PASS |
| All | No horizontal overflow | PASS |
