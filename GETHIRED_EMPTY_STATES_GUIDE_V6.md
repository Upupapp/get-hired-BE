# GETHIRED EMPTY STATES GUIDE V6
**Date:** 2026-07-01

Guide for all empty state messages across the system. No new empty states added in V6 (LinkedIn OIDC and company setup modal do not have empty states). V5 carry-forward below.

---

## What Is an Empty State?

An empty state is shown when a list, feed, or data surface has no items to display — not because of an error, but because nothing exists yet (first use, no results, cleared data).

---

## Empty State Formula

```
[Illustration or icon — optional]
[Why is it empty — 1 line]
[What to do — CTA]
```

---

## V6 New Surfaces — Empty State Assessment

| Surface | Has empty state? | Assessment |
|---|---|---|
| LinkedIn complete page | N/A — always loading or error/success | Not applicable |
| Company setup success modal | N/A — modal only shows after success | Not applicable |
| Sign-out | N/A | Not applicable |

---

## Full System Empty State Inventory (V5 carry-forward)

| Surface | Current empty text | CTA | Quality |
|---|---|---|---|
| Employer job list | "You haven't posted any jobs yet" (inferred) | "Post a job" | Good if present |
| Applicant application list | "You haven't applied to any jobs yet" (inferred) | "Browse jobs" | Good if present |
| Pipeline / candidates | Context-dependent | Varies | Review in MOBILEVIEW pass |
| Messages widget | "No messages yet" | "Start a conversation" | Deferred (no is_read column) |
| Search results (no match) | Unknown | Unknown | Not audited in V6 |

---

## Empty State Copy Standards

| Do | Don't |
|---|---|
| Say why it's empty ("You haven't posted any jobs yet") | Say "No data" or "No records found" |
| Give a path forward (CTA) | Leave a dead end |
| Use first-person plural ("Let's get started") | Use passive ("Nothing is here yet") |
| Match role context (employer vs applicant) | Use generic copy for both roles |

---

## V6 Status

No new empty states introduced. Existing V5 gaps remain open.
