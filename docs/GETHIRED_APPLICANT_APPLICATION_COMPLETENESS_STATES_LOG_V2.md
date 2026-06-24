# GetHired — Application Completeness States Log V2

**Date:** 2026-06-24  
**Phase:** 12

---

## Badge Component States (5 total)

| State | Trigger | Visual |
|-------|---------|--------|
| Loading | `loading=true` | Shimmer pill skeleton, 90×20px |
| Unavailable | `!loading && level===null && score===null` | Grey "Unavailable" italic pill |
| Excellent | `level==='excellent'` | Teal pill "Excellent · 94%" |
| Strong | `level==='strong'` | Teal pill "Strong · 82%" |
| Basic | `level==='basic'` | Amber pill "Basic · 61%" |
| Incomplete | `level==='incomplete'` | Coral pill "Getting started · 32%" |

---

## Card Component States (7 total)

| State | Trigger | Visual |
|-------|---------|--------|
| Loading | `loading=true` | 5-element skeleton shimmer |
| Error | `!loading && error` | Coral block + "Try again" button |
| Null snapshot | `!loading && !error && snapshot===null` | Soft italic unavailable note |
| Pre-deployment | `snapshot.hasSnapshot===false` | Grey left-border note |
| All complete | `hasSnapshot && no missing items` | Teal block + check icon + positive copy |
| Has required | `missingRequired?.length > 0` | Amber block + list + CTA |
| Has recommended | `missingRecommended?.length > 0` | Blue block + list + CTA |

Notes:
- "All complete" and "has required" are mutually exclusive (isComplete checks both arrays)
- "Has required" and "has recommended" can coexist (rendered sequentially)
- Pre-deployment state is visually distinct from null-snapshot (border color + copy differ)

---

## List Integration States

| State | Application Row |
|-------|----------------|
| Apps loading | Full page `<app-inline-loading>` |
| Apps error | Error block + "Try again" |
| Snapshots loading | Badge skeleton in toggle button |
| Snapshots loaded | Badge pill in toggle button |
| Card collapsed | Badge visible, no card |
| Card expanded | Badge visible, card below |

---

## State Transitions

```
App list loading
  → success → [snapshot loading → snapshot loaded] → collapsed view
  → error → error state + retry

Collapsed badge toggle clicked
  → expanded card (snapshot data from map, no new request)

Card error state retry clicked
  → re-runs loadSnapshots() only (not full app list reload)
```
