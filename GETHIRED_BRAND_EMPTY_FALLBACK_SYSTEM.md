# GETHIRED_BRAND_EMPTY_FALLBACK_SYSTEM.md
## BRAND QA Cycle 11 — Empty + Fallback System
_Generated: 2026-06-25_

---

## Empty State Coverage

### Interview Hub — Global Empty
**Trigger:** `!loading && !error && items.length === 0`
- Icon: `&#9654;` (play triangle, `aria-hidden="true"`) — themed with `$color-blue-primary`
- Heading: "No interview activity yet" — h2 level, explains zero state
- Body: Explains when candidates will appear — no fake urgency
- Actions: "Review applicants" (primary, links to candidates) + "View jobs" (ghost, links to jobs list)

**Verdict:** PASS — meaningful explanation, actionable CTAs, no fake activity

### Interview Hub — Filter Empty
**Trigger:** `getFilteredItems().length === 0` (when content is present but filter returns nothing)
- Copy: "No candidates match this filter." — single sentence, no CTA
- Container: `.ih-filter-empty` (gray text, padding)
- No animation applied to filter-empty

**Gap:** No CTA to clear the filter ("Show all"). Minor usability issue. Flagged for backlog.

### Messages Inbox — Global Empty
**Trigger:** `threads.length === 0`
- SVG icon (speech bubble outline, 52px)
- Heading: "No messages yet"
- Body: Explains when conversations appear, no fake counts
- Actions: "Review applicants" + "View jobs"
- Animation: `.rm-empty-state--reveal` → `opacity 0→1 + translateY(8px)`, 280ms decelerate, `@include motion-safe`

**Verdict:** PASS — well-structured, animated, reduced-motion safe

### Messages Inbox — Filter Empty
**Trigger:** `threads.length > 0 && filteredThreads.length === 0`
- Heading: "No messages match this filter"
- Body: "Try another filter or return to all conversations."
- CTA: "View all messages" (outline button, calls `setFilter('all')`) — GOOD, has a clear recovery path

**Verdict:** PASS — better than Interview Hub's filter empty; has recovery CTA

### Panel Shell Fallback
**Trigger:** `employee$` never emits (auth/network failure)
- Container: `.gh-fallback-page` (role="alert")
- Copy: "We couldn't load your profile. Please refresh the page or sign in again."
- Sign-in link: `/signin`

**Verdict:** PASS — functional safety net

## Animation Compliance

| Element | Animation | Mixin | Status |
|---|---|---|---|
| `.rm-empty-state--reveal` | opacity+translateY, 280ms | `@include motion-safe` | PASS |
| `.ih-empty` | No animation | n/a | PASS (static is acceptable) |
| `.rm-detail-idle` | No animation | n/a | PASS |

## Backlog Items

**BACKLOG-E1:** Interview Hub filter-empty needs a "Show all applicants" recovery CTA.
**BACKLOG-E2:** Add entry animation to `.ih-empty` matching `.rm-empty-state--reveal` pattern for visual consistency.
