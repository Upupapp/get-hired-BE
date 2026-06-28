# GETHIRED_ANGULAR_OPTIMIZATION_AUDIT.md
## QA Cycle 11 — Angular Optimization Audit

### Change Detection

| Component | CD strategy | Finding |
|---|---|---|
| `RecruiterInterviewHubComponent` | Default | Calls `getFilteredItems()` in template (`*ngFor="let item of getFilteredItems()"`). This method is called on every CD cycle. For 200 items, each call runs a `.filter()` — O(200) every keystroke/event. **Should cache filtered results in a property.** |
| `RecruiterMessagesComponent` | Default | `filteredThreads` is a property (not a getter) and is updated only in `applyFilter()`. Good — no unnecessary recalculation. |
| `EmployerPanelComponent` | Default | `mobileNavOpen` toggled on click — triggers CD for entire panel. Acceptable; no expensive bindings in the toggle path. |

**Top finding (Angular):** `getFilteredItems()` is a method call in the `*ngFor` template directive. Angular's default CD re-calls this on every single CD cycle. With `activeFilter === 'all'` returning the full `items` array (up to 200 items), this is 200 object reads per CD tick. Fix: cache the result in `filteredItems: InterviewHubItem[]` and recompute only in `setFilter()` and `loadHub()`.

---

### trackBy functions

| Component | trackBy | Status |
|---|---|---|
| `RecruiterInterviewHubComponent` | `trackByApplicationId` — returns `item.applicationId` | Correct |
| `RecruiterMessagesComponent` | `trackByThreadId` — returns `t.threadId` | Correct |
| Skeleton ngFor `[1,2,3,4,5]` in messages | No trackBy | OK — static literal array, re-renders are negligible |

---

### Subscription management

| Component | Mechanism | Assessment |
|---|---|---|
| `RecruiterMessagesComponent` | `Subject destroy$` + `takeUntil` in `loadThreads()` | Correct — no leak |
| `RecruiterInterviewHubComponent` | `private sub: Subscription` + manual `unsubscribe()` in `ngOnDestroy` | Correct — no leak |
| `EmployerPanelComponent` | `routerSub: Subscription` manually unsubscribed | Correct — no leak |

---

### Lazy loading

| Route | Status | Notes |
|---|---|---|
| `/recruiter/interview` (InterviewHub) | Lazy via `EmployerInterviewModule` | Correct |
| `/recruiter/messages` (RecruiterMessages) | Eager in `EmployerPanelModule` | Minor issue — not lazy but small component, low risk |
| `/recruiter/jobs` | Lazy | Correct |
| `/recruiter/contacts` | Lazy | Correct |
| `/recruiter/company` | Lazy | Correct |
| `/recruiter/subscription` | Lazy | Correct |

---

### `RecordService` / RecordRTC bundle concern

`RecordService` is `{ providedIn: 'root' }` and imports `RecordRTC` as a static top-level import at line 4 of `recorder.service.ts`. Since `providedIn: 'root'` means the service is part of the root injector, Angular's compiler includes `recorder.service.ts` and all its static imports (`RecordRTC`) in the root bundle — meaning **RecordRTC is downloaded and parsed on every page, even login and the public portal**.

This is a pre-existing issue, not introduced in QA Cycle 11 (the fix was only a case-sensitivity change to the import path). Deferring the structural fix (lazy provide) to the backlog.

---

### OnPush opportunities (future)

Both new components use `Default` CD. Neither has particularly expensive template expressions (after the `getFilteredItems()` fix), but both would benefit from `ChangeDetectionStrategy.OnPush` in a follow-up pass — the data flow is already `Observable`-based, making OnPush adoption straightforward.

---

### `@HostListener` scope

`EmployerPanelComponent` attaches `document:keydown.escape` via `@HostListener`. This fires on every keydown globally while the employer panel is mounted. Since the handler immediately returns when `!mobileNavOpen`, the overhead is a boolean check per Escape key press — negligible.
