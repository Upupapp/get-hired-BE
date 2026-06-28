# GETHIRED_MESSAGE_DECISION_MATRIX.md
## QA Cycle 11 — Decision matrix for messaging choices

---

## How to use this matrix

For each message decision, the matrix records: what signal we received, what
we considered, what we chose, and what was ruled out and why.

---

## Decision 1 — Applicant name fallback when name is null

**Signal:** B01 BACKLOG-02. Backend JOIN returns null applicantName when the
users table has no first_name/last_name for a given uid.

**Options considered:**

| Option | Text | Ruled out? |
|---|---|---|
| A | "Unknown" | Yes — sounds like a data error, not a person |
| B | "Applicant" | Almost chosen — clean, but too generic when multiple tabs open |
| C | "Candidate A1B2C3" (uid suffix) | Chosen for threads list |
| D | Email address | Chosen as first fallback before uid suffix in backend (`applicantEmail OR null`) |

**Decision:** Backend already maps: first_name+last_name → email → null. FE then
maps: applicantName → "Candidate " + uid.slice(-6).toUpperCase() → "Candidate".

**Assessment:** "Candidate A1B2C3" is technically correct but may confuse
recruiters who have no idea what A1B2C3 means. NOTIFY recommends improving
to "Candidate (email unknown)" or suppressing threads with no identity data
from the recruiter inbox until the users table is populated. Backlog item.

---

## Decision 2 — Avatar fallback when photo URL is broken

**Signal:** `<img *ngIf="t.applicantPhotoUrl" [src]="t.applicantPhotoUrl" alt="">` —
image tag is shown whenever applicantPhotoUrl is non-null, but the URL could be
broken (404, expired CDN token, etc.).

**Current state:** When the URL is valid, the image shows. When it 404s, the
browser renders a broken-image icon. `alt=""` means screen readers skip it
(correct for decorative avatars), but sighted users see a broken image outline.

**Options:**

| Option | Approach | Chosen? |
|---|---|---|
| A | onerror="this.style.display='none'" on the img | Quickest fix |
| B | (error) output binding → show initial fallback instead | Cleanest Angular way |
| C | Leave as is (broken image visible) | Current state — NOT acceptable |

**Decision (NOTIFY fix):** Add `(error)="onAvatarError(t)"` to reset
applicantPhotoUrl to null so the initial-letter fallback renders instead.
See GETHIRED_NOTIFY_FIX_LOG.md.

---

## Decision 3 — Rate-limit 429 FE handling

**Signal:** Backend sends `{ message: 'Too many requests. Please try again later.' }`
with HTTP 429. FE interceptor handles 401+403 only.

**Options:**

| Option | Approach |
|---|---|
| A | Add 429 branch to UnAuthorizedInterceptor → show snackbar | Chosen — centralized |
| B | Handle per component | Too scattered |
| C | Leave as generic component error | Current state — NOT acceptable |

**Decision (NOTIFY fix):** Add 429 handling to `unauthorize.interceptor.ts`.
Text: "You've made too many requests. Please wait a moment and try again."
Do NOT log the user out (unlike 401/403). Show as warning snackbar, not danger.

---

## Decision 4 — Interview Hub filter labels

**Signal:** Filters are "All applicants", "Video answers", "Under review".
B03 spec used "All", "Video Answers", "Under Review".

**Assessment:** The final implementation uses slightly different labels
("All applicants" instead of "All"). This is an improvement — "All applicants"
is clearer than "All" in context. No change needed.

---

## Decision 5 — Interview Hub "Applicant" fallback when name and email are both null

**Signal:** `getDisplayName(item)` returns `item.applicantName || item.applicantEmail || 'Applicant'`

**Assessment:** Unlike the messages inbox, the interview hub shows "Applicant"
(no uid suffix). This is acceptable — the card also shows jobTitle and date,
giving enough context. Keep as is.

---

## Decision 6 — "Needs reply" vs "Unread" in messages inbox

**Signal:** No is_read column in schema. Only lastSenderRole is available.

**Decision:** Use needsReply (derived from lastSenderRole === 'applicant').
Do not fake "unread" count. Show "Unread" badge only after schema migration
adds read-state. Documented in code comments and BACKLOG.

---

## Decision 7 — "Interviews" sidebar label vs "Interview Hub"

**Signal:** Sidebar item title is "Interviews" (routing to /recruiter/interview
which renders RecruiterInterviewHubComponent).

**Assessment:** "Interviews" is the correct label for a sidebar nav item.
"Interview Hub" is the internal component name. No change needed.

---

*Generated: NOTIFY QA Cycle 11*
