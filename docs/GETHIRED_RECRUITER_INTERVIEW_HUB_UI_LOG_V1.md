# GetHired Recruiter Interview Hub — UI Log V1

**Date:** 2026-06-25

---

## Component: RecruiterInterviewHubComponent

**Location:** `src/app/employer-panel/recruiter-interview-hub/`
**Selector:** `app-recruiter-interview-hub`
**Module:** `employer-interview.module.ts`

---

## States Implemented

### 1. Loading State
- 3 skeleton cards with shimmer animation
- 3 skeleton filter chips
- `aria-busy="true"` + `aria-label` for screen readers
- Shimmer uses `@include ambient-motion-safe` — suppressed under `prefers-reduced-motion`

### 2. Error State
- Heading: "We couldn't load interview activity."
- Body: neutral, non-alarming copy
- Two actions: "Try again" (calls `retry()`) + "Back to dashboard" link
- `role="alert"` for screen reader announcement
- No mention of "error" in the heading to reduce anxiety

### 3. Empty State
- Icon: plain Unicode play symbol (no external dependency)
- Heading: "No interview activity yet"
- Body: explains when candidates will appear
- Two CTAs: "Review applicants" (→ contacts) + "View jobs" (→ jobs)

### 4. Content State
- Filter chips: "All applicants", "Video answers" (with count badge), "Under review"
- Card list with `role="list"` / `role="listitem"` for accessibility
- Each card shows: applicant name, status chip, job title, video badge (if any), date applied
- Action links per card: "View applicants", "Review responses" (if video), "Message"

---

## Filter Logic

| Filter | Condition |
|--------|-----------|
| All applicants | No filter — all items |
| Video answers | `item.hasVideoAnswers === true` |
| Under review | `item.applicationStatusId === 3` (status seeded as "Under Review", set when video answers present) |

---

## Status Chip Colors

| StatusId | Label | Color |
|----------|-------|-------|
| 1 | Pending Review | Yellow |
| 2 | Applied | Blue |
| 3 | Under Review | Green |
| 4 | Shortlisted | Purple |
| 5 | Rejected | Red |
| 6 | Hired | Green |

---

## Motion Effects

| Effect | Element | Token Used |
|--------|---------|-----------|
| Page reveal fadein | `.ih-header` | `$motion-duration-card`, `ambient-motion-safe` |
| Card hover lift | `.ih-card:hover` | `transform: translateY($gh-lift)` + `motion-safe` |
| Card tap compress | `.ih-card:active` | `scale(0.99)` + `motion-safe` |
| Filter chip transition | `.ih-filter-chip` | `$motion-duration-micro` + `motion-safe` |
| Skeleton shimmer | `.ih-skeleton-line`, `.ih-skeleton-chip` | `ambient-motion-safe` |
| Button press | `.ih-btn:active`, `.ih-action:active` | `scale(0.96)` + `motion-safe` |

All animations suppressed under `prefers-reduced-motion: reduce` via `@include motion-safe` / `@include ambient-motion-safe`.
