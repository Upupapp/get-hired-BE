# GetHired Recruiter Interview Hub — State Map V1

**Date:** 2026-06-25

---

## Component State Machine

```
ngOnInit()
    │
    ▼
loadHub()
    │
    ├─► loading = true, error = false
    │         │
    │         ▼
    │   hubService.getInterviewHub()
    │         │
    │    ┌────┴────┐
    │  success   error
    │    │         │
    │    ▼         ▼
    │  items=[]  error=true
    │  loading=false  loading=false
    │    │
    │    ├─ items.length === 0 ──► EMPTY STATE
    │    └─ items.length > 0 ───► CONTENT STATE
    │
    └─ (while loading) ──────────► LOADING STATE
```

## State Variables

| Variable | Type | Default | Meaning |
|----------|------|---------|---------|
| `loading` | boolean | true | Show skeleton |
| `error` | boolean | false | Show error panel |
| `items` | `InterviewHubItem[]` | [] | Hub data from API |
| `activeFilter` | `FilterKey` | 'all' | Active chip |

## Filter States

```
activeFilter
    ├─ 'all'          → getFilteredItems() returns all items
    ├─ 'has-video'    → items where hasVideoAnswers === true
    └─ 'review-stage' → items where applicationStatusId === 3
```

When filtered list is empty but main list is not, shows:
`"No candidates match this filter."`

## Transitions

| Event | From → To |
|-------|-----------|
| `ngOnInit` | → loading=true |
| API success | loading=true → loading=false, items populated |
| API error | loading=true → loading=false, error=true |
| `retry()` click | error state → loading=true |
| `setFilter(key)` | any content state → filtered content |
| `ngOnDestroy` | unsubscribe from observable |
