# GETHIRED_ACCESSIBLE_STATUS_MESSAGES_GUIDE.md
## QA Cycle 11 — Accessible status message audit

---

## WCAG reference
- 4.1.3 Status Messages (Level AA): Status messages communicated to users via status roles
  must be programmatically determinable through role or properties such that they
  can be presented to the user by AT without receiving focus.
- Techniques: role="status", role="alert", aria-live="polite", aria-live="assertive"

---

## Audit results

### Recruiter Messages Inbox

| Element | Technique | Correct? |
|---|---|---|
| Loading skeleton | aria-busy="true" aria-label="Loading messages" | PASS |
| Error panel | role="alert" | PASS |
| Filter group | role="group" aria-label="Filter conversations" | PASS |
| Thread list | role="list" aria-label="Conversation list" | PASS |
| Thread row | role="button" tabindex="0" aria-label=threadLabel(t) | PASS |
| Thread row aria-pressed | [attr.aria-pressed]="selectedThread?.threadId === t.threadId" | PASS |
| Needs-reply badge | aria-label="Needs your reply" | PASS |
| Back button (mobile) | aria-label="Back to messages list" | PASS |
| Message history | role="log" aria-live="polite" | PASS |
| Filter chip aria-pressed | [attr.aria-pressed]="activeFilter === f.key" | PASS |
| Logo img | alt="GetHired — go to jobs" | PASS |
| Message composer label | `<label for="msg-thread-input">Write a message</label>` + visually-hidden class | PASS |

### Interview Hub

| Element | Technique | Correct? |
|---|---|---|
| Loading skeleton | aria-busy="true" aria-label="Loading interview activity" | PASS |
| Error panel | role="alert" | PASS |
| Filter group | role="group" aria-label="Filter interview activity" | PASS |
| Filter chip | aria-pressed binding | PASS |
| Card list | role="list" aria-label="Interview activity list" | PASS |
| Card item | role="listitem" | PASS |
| Video badge | aria-label="Video answers submitted" | PASS |
| Emoji icons (briefcase, play) | aria-hidden not set | PARTIAL — &#128188; and &#9654; are emoji codepoints rendered as text; should have aria-hidden="true" |

### Mobile Sidebar (B02)

| Element | Technique | Correct? |
|---|---|---|
| Hamburger button | aria-expanded, aria-label (dynamic "Open/Close navigation menu"), aria-controls="gh-mobile-drawer" | PASS |
| SVG hamburger icon | aria-hidden="true" focusable="false" | PASS |
| Scrim overlay | aria-hidden="true" | PASS |
| Mobile drawer | role="navigation" aria-label="Employer navigation" id="gh-mobile-drawer" | PASS |
| Drawer close button | aria-label="Close navigation menu" | PASS |
| Close button SVG | aria-hidden="true" focusable="false" | PASS |
| Nav links | routerLinkActive + aria-current="page" binding | PASS |
| Drawer nav list | role="list" | PASS |
| Logo img in drawer | alt="GetHired" but also aria-hidden="true" | ACCEPTABLE — aria-hidden takes priority |
| Bottom nav | aria-label="Mobile employer navigation" role="navigation" | PASS |
| Bottom nav items | aria-label per item | PASS |
| Bottom nav SVGs | aria-hidden="true" focusable="false" | PASS |
| Billing bar link | aria-label="Subscription and Billing" | PASS |

### Employer Sidebar (desktop, existing)

| Element | Technique | Correct? |
|---|---|---|
| Nav element | role="navigation" aria-label="Employer panel navigation" | PASS |
| Nav items | role="button" tabindex="0" aria-current binding | PASS |
| Sub-route items | role="button" tabindex="0" aria-current binding | PASS |
| Icon images | aria-hidden="true" | PASS |
| User initials | aria-hidden="true" | PASS |

### Focus management (B02 mobile drawer)

| Behavior | Implementation | Correct? |
|---|---|---|
| Open → focus moves to first link | setTimeout 200ms → firstDrawerLinkRef.focus() | PASS |
| Close → focus returns to hamburger | setTimeout 50ms → mobileMenuBtnRef.focus() | PASS |
| Escape key → closes drawer | @HostListener('document:keydown.escape') | PASS |
| Navigation → closes drawer | router events NavigationEnd subscription | PASS |

---

## Gaps requiring fixes

### Gap 1 — emoji characters in Interview Hub cards need aria-hidden
```html
<span class="ih-card-job-label" aria-label="Job">&#128188;</span>
<!-- fix: -->
<span class="ih-card-job-label" aria-hidden="true">&#128188;</span>
```
The aria-label on the span overrides the emoji content but the pattern is
inconsistent (the video play icon at line 115 uses aria-label="Video answers submitted"
which is correct and makes the parent span the accessible container).

### Gap 2 — message-thread loading div: no role="status"
```html
<div *ngIf="loading" class="msg-thread-loading">Loading conversation…</div>
<!-- fix: -->
<div *ngIf="loading" class="msg-thread-loading" role="status">Loading conversation…</div>
```

### Gap 3 — message-thread error div: no role="alert"
```html
<div *ngIf="!loading && error && messages.length === 0" class="msg-thread-error">
<!-- fix: -->
<div *ngIf="!loading && error && messages.length === 0" class="msg-thread-error" role="alert">
```

### Gap 4 — message-thread send error: no live announcement
```html
<p *ngIf="error && messages.length > 0" class="msg-thread-inline-error">{{ error }}</p>
<!-- fix: -->
<p *ngIf="error && messages.length > 0" class="msg-thread-inline-error" role="alert">{{ error }}</p>
```

### Gap 5 — legacy empty-section image: no alt
```html
<img src="/assets/images/placeholder/empty.png" class="img-fluid">
<!-- fix: -->
<img src="/assets/images/placeholder/empty.png" class="img-fluid" alt="">
```

---

## Overall assessment
- New components (B01 recruiter-messages, B02 mobile sidebar): EXCELLENT a11y
- B03 Interview Hub: GOOD, two minor emoji/aria gaps
- Shared message-thread component: PARTIAL — 3 missing role attributes
- Legacy empty-section: FAIL on image alt

---

*Generated: NOTIFY QA Cycle 11*
