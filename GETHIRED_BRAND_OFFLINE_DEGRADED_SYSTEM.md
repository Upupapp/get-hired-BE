# GETHIRED_BRAND_OFFLINE_DEGRADED_SYSTEM.md
## BRAND QA Cycle 11 — Offline + Degraded System
_Generated: 2026-06-25_

---

## Offline Handling Assessment

### Current State
GetHired FE has **no service worker or offline detection** in the audited components. There is no `navigator.onLine` check, no `window.addEventListener('offline')` handler, and no offline-specific UI state.

This was true prior to QA11 and is unchanged by the new Interview Hub and Mobile Sidebar code.

### Degraded State Behavior

When the network fails:
1. **Interview Hub:** HTTP error from `RecruiterInterviewHubService` → `error = true` → error panel displayed with "Try again" CTA. Functionally handles degraded state as a generic error.
2. **Messages Inbox:** Same pattern — HTTP error triggers `.rm-state-panel--error`.
3. **Panel Shell:** If `employee$` never resolves → fallback error panel.

### Gap Analysis

| Scenario | Current UX | Ideal UX | Gap |
|---|---|---|---|
| Initial load offline | Generic error message | "You appear to be offline. Check your connection and try again." | MEDIUM |
| Goes offline while using app | No detection | Subtle banner "You're offline — some features may be unavailable" | LOW (acceptable) |
| Returns online | Manual retry only | Auto-retry on reconnect | LOW (acceptable) |

### Recommendation

The existing error→retry pattern is a valid graceful degradation. The gap is in **error copy specificity**: when `navigator.onLine === false`, the error message could be more targeted. This is a backlog item, not a blocking issue.

**BACKLOG-O1:** Add a check in `loadHub()` and messages `retry()` for `navigator.onLine` and surface a more specific offline message when false.

**BACKLOG-O2:** Add a global Angular service (`NetworkStatusService`) that listens to `online`/`offline` window events and exposes an `isOnline$` observable. Wire a non-intrusive banner in `employer-panel.component.html` for degraded state.

## Current Compliance

All existing error paths silently handle offline as a network error — no app crashes, no broken states, no fake activity. This meets the minimum bar for the current deployment scope.
