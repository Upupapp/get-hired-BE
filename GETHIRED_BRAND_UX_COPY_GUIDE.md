# GETHIRED_BRAND_UX_COPY_GUIDE.md
## BRAND QA Cycle 11 — UX Copy Guide
_Generated: 2026-06-25_

---

## Copy Audit — QA11 Scope

### Interview Hub Copy

| Context | Current Copy | Assessment |
|---|---|---|
| Page title | "Interviews" | PASS — clear, single word |
| Page subtitle | "Review candidates who applied to your jobs and submitted video responses." | PASS — factual, no fake AI claim |
| Loading label | "Loading interview activity" (aria-label) | PASS — screen-reader-facing, descriptive |
| Error heading | "We couldn't load interview activity." | PASS — first-person "We", owns the issue |
| Error body | "This might be a temporary issue. Try again or return to your dashboard." | PASS — two options, no blame |
| Error CTA 1 | "Try again" | PASS — imperative, clear |
| Error CTA 2 | "Back to dashboard" | PASS |
| Empty heading | "No interview activity yet" | PASS — "yet" implies activity will come |
| Empty body | "Candidates will appear here when they apply to your jobs or submit video responses to your interview questions." | PASS — explains the trigger, sets expectation |
| Empty CTA 1 | "Review applicants" | PASS |
| Empty CTA 2 | "View jobs" | PASS |
| Filter "all" | "All applicants" | PASS |
| Filter "video" | "Video answers" | PASS — not "Video responses" (shorter) |
| Filter "review" | "Under review" | PASS — matches status ID 3 label |
| Filter empty | "No candidates match this filter." | PASS — factual, no drama |
| Card action 1 | "View applicants" | PASS |
| Card action 2 | "Review responses" | PASS |
| Card action 3 | "Message" | PASS |
| Video badge | "N video response" / "N video responses" | PASS — correct singular/plural |

### Mobile Drawer Copy

| Context | Current Copy | Assessment |
|---|---|---|
| Open button aria-label | "Open navigation menu" | PASS |
| Closed button aria-label | "Close navigation menu" | PASS |
| Drawer landmark | "Employer navigation" (aria-label) | PASS |
| Close button aria-label | "Close navigation menu" | PASS |
| Nav items | Dashboard, Jobs, Candidates, Messages, Company, Subscription | PASS — matches desktop sidebar |
| Footer link | "Settings" | PASS |
| Page title (topbar) | "GetHired" | PASS — brand name |

### Messages Inbox Copy

| Context | Current Copy | Assessment |
|---|---|---|
| Page title | "Messages" | PASS |
| Page subtitle | "Manage candidate conversations across your jobs." | PASS — action-oriented |
| Error heading | "We couldn't load your messages" | PASS — "We", first-person |
| Error body | "Please try again. If the issue continues, go back to your dashboard." | PASS — escalation path |
| Retry CTA (loading) | "Trying…" (while retrying) | PASS — live feedback |
| Retry CTA (idle) | "Try again" | PASS |
| Empty heading | "No messages yet" | PASS |
| Empty body | "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile." | PASS — explains both trigger paths |
| Filter empty heading | "No messages match this filter" | PASS |
| Filter empty body | "Try another filter or return to all conversations." | PASS |
| Filter empty CTA | "View all messages" | PASS |
| Detail idle | "Select a conversation to read and reply." | PASS — instruction, not placeholder |
| Needs-reply badge | "Needs reply" | PASS |
| Back button | "Back to messages" | PASS |

---

## BRAND Copy Rules Compliance

| Rule | Status |
|---|---|
| No fake AI ("AI-powered", "smart", "intelligent") | PASS — none found in QA11 scope |
| No fake urgency ("Act now", "Limited time") | PASS |
| No fake counts or metrics | PASS — all counts from real data |
| Error messages own the issue ("We couldn't") | PASS — consistent first-person |
| Empty states explain the trigger | PASS |
| CTAs are imperative verbs | PASS — "Try again", "View applicants", "Review applicants" |

---

## Minor Copy Improvements (Backlog)

**BACKLOG-C1:** Interview Hub filter-empty "No candidates match this filter." lacks a CTA. Add "Show all applicants" inline link.

**BACKLOG-C2:** The video badge shows `&#9654;` (play triangle) as icon. This works but may not render consistently across OSes. Consider an SVG icon instead.

**BACKLOG-C3:** Job card label uses `&#128188;` (briefcase emoji). Emoji rendering is OS-dependent. Consider SVG.
