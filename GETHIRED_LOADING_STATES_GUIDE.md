# GETHIRED_LOADING_STATES_GUIDE.md
## QA Cycle 11 — Loading state inventory and quality guide

---

## Principles applied

1. Every loading state must communicate progress to sighted and screen-reader users.
2. Skeleton screens are preferred over spinners for content-heavy lists.
3. aria-busy="true" + aria-label tells screen readers something is loading without
   polluting the live region with spinner text.
4. Never show stale data while reloading (prefer skeleton over cached-stale).

---

## Loading state inventory

---

### Recruiter Messages Inbox

```html
<div *ngIf="loading" class="rm-skeleton-wrap" aria-busy="true" aria-label="Loading messages">
  <div class="rm-skeleton-row" *ngFor="let i of [1,2,3,4,5]"></div>
</div>
```

- aria-busy: YES
- aria-label: "Loading messages"
- Skeleton rows: 5 — appropriate for a list view
- No spinner text visible to sighted users: correct (skeleton rows handle visual feedback)
- **PASS**

---

### Interview Hub

```html
<div *ngIf="loading" class="ih-skeleton" aria-busy="true" aria-label="Loading interview activity">
  <div class="ih-skeleton-filters">...</div>
  <div class="ih-skeleton-cards">...</div>
</div>
```

- aria-busy: YES
- aria-label: "Loading interview activity"
- Skeleton: filter chips + 3 cards — matches real content layout
- **PASS**

---

### message-thread (shared)

```html
<div *ngIf="loading" class="msg-thread-loading">Loading conversation…</div>
```

- aria-busy: NO
- aria-label: NO
- Has visible text "Loading conversation…" — sighted users see it; screen readers
  will encounter it in the DOM but without live region context
- **BORDERLINE** — add aria-live="polite" to parent or role="status" to the div

---

### Employer Panel (profile load)

```html
<app-loading></app-loading>
```

- Depends on the shared loading component implementation
- No aria-label or aria-busy passed here
- **UNKNOWN** — requires inspection of app-loading component (outside scope of this
  cycle's new components, but flagged for next cycle)

---

### Recruiter Messages retry button in-progress

```html
{{ retrying ? 'Trying…' : 'Try again' }}
[disabled]="retrying"
```

- Visual in-progress state: YES ("Trying…")
- Button disabled during retry: YES
- aria-busy on button: NO (not required — label change is sufficient for this pattern)
- **PASS**

---

### message-thread send in-progress

```html
{{ sending ? 'Sending…' : 'Send' }}
[disabled]="!threadId || sending || !newBody.trim()"
```

- Visual in-progress state: YES ("Sending…")
- Button disabled during send: YES
- **PASS**

---

## Recommendations

| Location | Issue | Fix |
|---|---|---|
| message-thread loading div | No aria-busy/live | Add role="status" to the loading div |
| app-loading component | Unknown aria implementation | Verify in next cycle |

---

*Generated: NOTIFY QA Cycle 11*
