# GETHIRED_MESSAGE_INVENTORY.md
## QA Cycle 11 — Full message inventory across new deployment scope

---

## 1. RECRUITER MESSAGES INBOX (B01)

### Loading state
| Location | Message text | Type |
|---|---|---|
| Thread list | (skeleton rows, no text) | skeleton |
| aria-label | "Loading messages" | a11y |
| aria-busy | true | a11y |

### Error state
| Location | Message text | Type |
|---|---|---|
| Main panel | "We couldn't load your messages" | error heading |
| Main panel | "Please try again. If the issue continues, go back to your dashboard." | error body |
| Retry button | "Try again" / "Trying…" | action |
| Fallback button | "Back to dashboard" | action |

### Empty state — global (no threads)
| Location | Message text | Type |
|---|---|---|
| Thread list | "No messages yet" | empty heading |
| Thread list | "Candidate conversations will appear here when applicants message you or when you start a conversation from an applicant profile." | empty body |
| CTA 1 | "Review applicants" | action |
| CTA 2 | "View jobs" | action |

### Empty state — filtered (threads exist, filter returns zero)
| Location | Message text | Type |
|---|---|---|
| Thread list | "No messages match this filter" | empty heading |
| Thread list | "Try another filter or return to all conversations." | empty body |
| CTA | "View all messages" | action |

### Thread rows
| Element | Message text / logic | Type |
|---|---|---|
| Name label | `applicantLabel(t)`: t.applicantName OR "Candidate " + uid.slice(-6).toUpperCase() | data |
| Snippet | `snippet(t)`: lastMessageSnippet truncated to 80 chars, OR "No messages yet." | data |
| Time | `t.lastMessageAt \| date:'shortTime'` | data |
| Badge | "Needs reply" (aria-label: "Needs your reply") | status |
| Filter chip | "All" | label |
| Filter chip | "Needs reply" | label |

### Thread detail pane
| Location | Message text | Type |
|---|---|---|
| Desktop idle | "Select a conversation to read and reply." | idle |
| Back button (mobile) | "Back to messages" (aria-label: "Back to messages list") | nav |
| Detail header | applicantLabel(selectedThread) | data |
| Job chip | selectedThread.jobTitle | data |

### app-message-thread (shared, used inside detail pane)
| Location | Message text | Type |
|---|---|---|
| Loading | "Loading conversation…" | loading |
| Empty (no messages) | "No messages yet. Say hello to get the conversation started." | empty |
| Error (no messages loaded) | `error` property — set to: "Could not open this conversation." or "Could not open this conversation. Please try again." or "Could not load messages." | error |
| Inline error (after messages loaded) | "Could not send your message. Please try again." | error |
| Send button | "Send" / "Sending…" | action |
| Textarea placeholder | "Write a message…" | placeholder |

---

## 2. INTERVIEW HUB (B03)

### Loading state
| Location | Message text | Type |
|---|---|---|
| Page | (skeleton chips + skeleton cards, no text) | skeleton |
| aria-label | "Loading interview activity" | a11y |
| aria-busy | true | a11y |

### Error state
| Location | Message text | Type |
|---|---|---|
| Error panel | "We couldn't load interview activity." | error heading |
| Error body | "This might be a temporary issue. Try again or return to your dashboard." | error body |
| Retry button | "Try again" | action |
| Fallback link | "Back to dashboard" | action |

### Empty state
| Location | Message text | Type |
|---|---|---|
| Empty heading | "No interview activity yet" | empty |
| Empty body | "Candidates will appear here when they apply to your jobs or submit video responses to your interview questions." | empty |
| CTA 1 | "Review applicants" | action |
| CTA 2 | "View jobs" | action |

### Filter chips (shown when items > 0)
| Filter key | Label |
|---|---|
| all | "All applicants" |
| has-video | "Video answers" |
| review-stage | "Under review" |

### Card content
| Element | Message text / logic | Type |
|---|---|---|
| Name | `getDisplayName(item)`: applicantName OR applicantEmail OR "Applicant" | data |
| Job | item.jobTitle | data |
| Video badge | "▶ N video response / responses" (aria-label: "Video answers submitted") | status |
| Date | "Applied <date>" | data |
| Action 1 | "View applicants" | action |
| Action 2 | "Review responses" (only when hasVideoAnswers) | action |
| Action 3 | "Message" | action |

### Filter empty state (filtered, no results)
| Location | Message text | Type |
|---|---|---|
| Inline | "No candidates match this filter." | empty |

---

## 3. MOBILE SIDEBAR (B02)

### Top bar
| Element | Message text | Type |
|---|---|---|
| Hamburger button aria-label | "Open navigation menu" / "Close navigation menu" | a11y |
| Title (aria-hidden) | "GetHired" | branding |

### Drawer
| Element | Message text | Type |
|---|---|---|
| Drawer aria-label | "Employer navigation" | a11y |
| Close button aria-label | "Close navigation menu" | a11y |
| Nav items | Dashboard, Jobs, Candidates, Messages, Company, Subscription | nav labels |

### Bottom nav (mobile)
| Item | aria-label | Label |
|---|---|---|
| Dashboard | "Dashboard" | Dashboard |
| Jobs | "Jobs" | Jobs |
| Candidates | "Candidates" | Candidates |
| Messages | "Messages" | Messages |
| Company | "Company" | Company |

### Billing bar
| Element | Message text | Type |
|---|---|---|
| Link aria-label | "Subscription and Billing" | a11y |
| Link text | "Subscription & Billing" | nav |

---

## 4. RATE LIMITING (SEC-01)

### Backend messages (server.js)
| Limiter | Message text | HTTP status |
|---|---|---|
| Global | "Too many requests. Please try again later." | 429 |
| Auth | "Too many authentication attempts. Please try again in 15 minutes." | 429 |
| Write | "Too many requests. Please try again later." | 429 |
| Sensitive | "Too many attempts. Please try again in an hour." | 429 |

### Frontend handling
| Scenario | FE behavior | Gap? |
|---|---|---|
| 429 on any API call | No dedicated 429 handler in interceptor. 401+403 redirect to signin. 429 falls through to each component's generic `error()` callback. | YES — GAP |
| Auth endpoints 429 | No FE handling. User sees generic snackBar from component or no feedback. | YES — GAP |
| Message send 429 | message-thread sets `this.error = 'Could not send your message. Please try again.'` — unhelpful when the real cause is rate limiting. | PARTIAL |

---

## 5. PANEL LOADING / FALLBACK

| Location | Message text | Type |
|---|---|---|
| Panel loading | (app-loading spinner, no text) | loading |
| Panel error | "We couldn't load your profile. Please refresh the page or sign in again." | error |

---

## 6. AUTH MESSAGES

| Location | Message text | Type |
|---|---|---|
| Signin — email not verified | "Please Verify Email with the link sent to your registered email address." | error |
| Signin — other error | localStorage `loginError` (raw server error, not sanitized) | error — RISK |
| Unauthorized interceptor (401/403) | "Your session has expired. Please sign in again to continue." | snackbar |
| Email verify success | "Verification link send to your email. Please verify and login again." [typo: "send" → "sent"] | snackbar |

---

## 7. LEGACY SHARED EMPTY SECTION

| Location | Message text | Type |
|---|---|---|
| empty-section component | `{{title}}` + `{{subTitle}}` (no default copy) | data-driven |
| Empty image alt | (none — img has no alt) | a11y GAP |

---

*Generated: NOTIFY QA Cycle 11*
