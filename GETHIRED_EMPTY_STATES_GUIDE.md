# GETHIRED_EMPTY_STATES_GUIDE.md
## QA Cycle 11 — Empty state inventory and quality guide

---

## Grading rubric (applied to each state)

A = Heading + explanation + at least one CTA → PASS
B = Heading + explanation, no CTA → BORDERLINE (acceptable for read-only views)
C = Heading only → NEEDS WORK
F = No empty state (bare div or nothing) → FAIL

---

## Recruiter Messages Inbox

### Global empty (no threads at all)
- Heading: "No messages yet" — clear, non-alarming
- Body: "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile." — explains WHEN and HOW it populates
- CTA 1: "Review applicants" — routes to /recruiter/contacts
- CTA 2: "View jobs" — routes to /recruiter/jobs/list
- **Grade: A** — both CTAs give productive next steps

### Filtered empty (filter returns zero)
- Heading: "No messages match this filter"
- Body: "Try another filter or return to all conversations."
- CTA: "View all messages" — resets filter to 'all'
- **Grade: A** — CTA directly resolves the situation

### Thread detail idle (no thread selected, desktop)
- Text: "Select a conversation to read and reply."
- No heading, no icon, no CTA
- **Grade: B** — acceptable for idle desktop state; not an error state

### message-thread no-messages-yet
- Text: "No messages yet. Say hello to get the conversation started."
- No CTA (cannot link out from within the chat component)
- **Grade: B** — encourages action inline via the composer below

---

## Interview Hub

### Global empty (items.length === 0)
- Heading: "No interview activity yet"
- Body: "Candidates will appear here when they apply to your jobs or submit video responses to your interview questions."
- CTA 1: "Review applicants" — /recruiter/contacts/candidates
- CTA 2: "View jobs" — /recruiter/jobs
- **Grade: A** — clear trigger conditions explained + two productive CTAs

### Filtered empty (active filter returns no items)
- Text: "No candidates match this filter." (single `<p>`, no heading, no CTA)
- **Grade: C** — needs a CTA to reset filter or improvement copy
- **Recommended fix:** "No candidates match this filter. Try 'All applicants' to see everyone."

---

## Employer Panel fallback (profile load failure)
- Text: "We couldn't load your profile. Please refresh the page or sign in again."
- Link: "sign in again" → /signin
- **Grade: B** — recoverable action provided but no retry button

---

## Legacy empty-section component
- Driven by `title` + `subTitle` inputs from each calling component
- No default copy built in
- Image: `/assets/images/placeholder/empty.png` with no alt attribute
- **Grade: varies by caller / F for accessibility** — missing alt on image

---

## Recommended improvements (all low-risk copy changes)

| Location | Change |
|---|---|
| Interview Hub filter empty | Add: "Try 'All applicants' to see everyone." + "Show all" button |
| Legacy empty-section img | Add `alt=""` (decorative — aria-hidden would also work) |
| Panel error | Add a "Retry" button alongside "sign in again" |

---

*Generated: NOTIFY QA Cycle 11*
