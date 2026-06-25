# GETHIRED_RECRUITER_MOBILE_SIDEBAR_ACTIVE_STATE_LOG_V1

## Phase 6 — Active Route State Log
Date: 2026-06-25

---

## Implementation

Each drawer nav item uses Angular's `routerLinkActive` directive with a template variable:

```html
<a routerLink="/recruiter/dashboard"
   routerLinkActive="gh-drawer-nav-item--active"
   [routerLinkActiveOptions]="{exact: true}"
   #rla0="routerLinkActive"
   [attr.aria-current]="rla0.isActive ? 'page' : null"
   class="gh-drawer-nav-item">
```

---

## Active Match Rules Per Item

| Item | routerLink | exact | Covers |
|------|-----------|-------|--------|
| Dashboard | /recruiter/dashboard | true | Only /recruiter/dashboard |
| Jobs | /recruiter/jobs | false | /recruiter/jobs, /recruiter/jobs/list, /recruiter/jobs/:id, /recruiter/jobs/expired |
| Candidates | /recruiter/contacts | false | /recruiter/contacts, /recruiter/contacts/list, /recruiter/contacts/groups, /recruiter/contacts/candidates |
| Messages | /recruiter/messages | false | /recruiter/messages |
| Company | /recruiter/company/details | false | /recruiter/company/* (all settings tabs) |
| Subscription | /recruiter/subscription | false | /recruiter/subscription/* |

---

## Active State Visual

When `gh-drawer-nav-item--active` is applied:
```scss
.gh-drawer-nav-item--active {
  background: $color-global-sidebar-employer-route-active; // #67627E
  border-left-color: $color-global-red-buttons;            // #FF7062
  color: #ffffff;
  font-weight: 600;
}
```

This matches the desktop sidebar's active item visual (same colors).

---

## aria-current

`[attr.aria-current]="rlaX.isActive ? 'page' : null"` — Angular sets the attribute to "page" when active, removes it (null = removal) when inactive. Screen readers announce "current page" on the active item.

---

## Consistency with Desktop Sidebar

Desktop sidebar uses a custom `subRouteActive(route)` method checking `this.location.match(item?.route)`. The mobile drawer uses Angular's native `routerLinkActive` which is more reliable and standards-based. No divergence in which routes appear active — both use prefix matching for Jobs/Candidates/Company.

---

## Status: VERIFIED
