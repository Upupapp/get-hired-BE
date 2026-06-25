# GETHIRED_RECRUITER_MOBILE_SIDEBAR_BADGES_COUNTS_LOG_V1

## Phase 7 — Badges / Counts Log
Date: 2026-06-25

---

## Policy

Only show badges if real data is available. Never fabricate counts or fake urgency.

---

## Badge Assessment Per Nav Item

| Item | Badge Source Available? | Decision | Notes |
|------|------------------------|----------|-------|
| Dashboard | N/A | No badge | Dashboard is a summary view |
| Jobs | Job count in store? Not exposed to panel shell | No badge | Job count available inside jobs component, not in panel shell |
| Candidates | N/A | No badge | |
| Messages | `GET /api/messages/recruiter/threads` (B01) | No badge — BACKLOG | `RecruiterMessagesComponent` loads threads on init as component-local state. No shared store/observable exposed to `EmployerPanelComponent`. Would need a MessagesService with an `unreadCount$` observable. |
| Company | N/A | No badge | |
| Subscription | N/A | No badge | |

---

## Messages Badge BACKLOG

**Condition for implementation:**
1. Create `RecruiterMessagesService` (or extend existing) with `unreadCount$: Observable<number>`
2. Inject into `EmployerPanelComponent`
3. Use `async` pipe: `{{ unreadCount$ | async }}`
4. Show badge only when count > 0
5. Cap display at 99 (show "99+" for larger counts)

**Template when ready:**
```html
<span class="gh-drawer-badge" *ngIf="(unreadCount$ | async) > 0" aria-label="unread messages">
  {{ (unreadCount$ | async) > 99 ? '99+' : (unreadCount$ | async) }}
</span>
```

**SCSS when ready:**
```scss
.gh-drawer-badge {
  background: $color-global-red-buttons;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-left: auto;
}
```

---

## Current Status

No badges implemented in B02. HTML comment in Messages item documents BACKLOG clearly.
Zero fake counts. Zero fake urgency copy.
