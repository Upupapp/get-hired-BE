# GETHIRED_RECRUITER_MESSAGES_INBOX_ACCESSIBILITY_MOBILE_QA_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Semantic Structure

| Check | Implementation | Pass |
|---|---|---|
| Page h1 "Messages" | .rm-page-title as h1 element | PASS |
| Section aria-label | <section aria-label="Messages inbox"> | PASS |
| Thread list role="list" | <ul role="list"> | PASS (explicit because some CSS resets remove list semantics) |
| Thread row role="button" | <li role="button"> | PASS |
| Filter group role="group" | <div role="group" aria-label="Filter conversations"> | PASS |
| Detail main landmark | <main aria-label="Conversation detail"> | PASS |
| Error panel role="alert" | role="alert" on rm-state-panel--error | PASS |
| Loading state aria-busy | aria-busy="true" aria-label="Loading messages" | PASS |
| Message log role="log" | Handled by app-message-thread: role="log" aria-live="polite" | PASS |
| Heading hierarchy | h1 (page), h2 (detail name, empty state titles) | PASS |

## Keyboard Navigation

| Check | Implementation | Pass |
|---|---|---|
| Thread rows keyboard focusable | tabindex="0" on each li | PASS |
| Thread row Enter activates | (keydown.enter)="selectThread(t)" | PASS |
| Thread row Space activates | (keydown.space)="$event.preventDefault(); selectThread(t)" | PASS |
| Filter chips keyboard | tabindex via button element | PASS (native button) |
| Filter chip Enter/Space | Native button behavior | PASS |
| Back button focusable | Native button element | PASS |
| Context link buttons | Native button element | PASS |
| Composer keyboard send | (keydown.enter) on textarea → send() (existing) | PASS |
| Send button keyboard | Native button element | PASS |
| Focus not trapped | No modal; navigation allows free focus movement | PASS |

## Focus Visibility

| Check | Implementation | Pass |
|---|---|---|
| Thread rows :focus-visible | 2px solid rgba(123,97,255,0.7) outline-offset:-2px border-radius:10px | PASS |
| Filter chips :focus-visible | 2px solid rgba(123,97,255,0.7) on .rm-chip:focus-visible | PASS |
| Back button :focus-visible | 2px solid rgba(123,97,255,0.7) on .rm-back-btn:focus-visible | PASS |
| Context links :focus-visible | 2px solid rgba(123,97,255,0.7) on .rm-link-btn:focus-visible | PASS |
| Sidebar items :focus-visible | Existing: 2px solid rgba(255,112,98,0.8) on .gh-sidebar-item | PASS |
| Mobile nav :focus-visible | Existing: 2px solid rgba(255,112,98,0.85) on .gh-mobile-nav-item | PASS |

## Color and Non-Color Distinction

| Check | Implementation | Pass |
|---|---|---|
| Unread is text+badge, not color-only | Unread NOT implemented (no schema support) | N/A |
| Needs reply is text+badge | "Needs reply" amber chip with text, not color-only | PASS |
| Filter active state | aria-pressed + background change + text color (not just color) | PASS |
| Selected thread | border-left 3px + background change + aria-pressed | PASS |
| Error panel | role="alert" + red border + text | PASS |

## Labels and Instructions

| Check | Implementation | Pass |
|---|---|---|
| Thread row accessible label | aria-label via threadLabel() — includes job, time, needs-reply text | PASS |
| Needs reply badge aria-label | aria-label="Needs your reply" | PASS |
| Send button label | Text: "Send" / "Sending…" | PASS |
| Textarea label | visually-hidden label "Write a message" with htmlFor | PASS (existing) |
| Disabled send explanation | placeholder="Write a message…" as implicit hint | PARTIAL — no aria-describedby on disabled state; backlog |
| Back button label | aria-label="Back to messages list" | PASS |
| Context link labels | aria-label="Review all applicants" / "View jobs list" | PASS |

## Status Messages

| Check | Implementation | Pass |
|---|---|---|
| Send success announced | message appears in role="log" aria-live="polite" (existing) | PASS |
| Send failure announced | inline error text below composer in DOM | PARTIAL — no role="alert" on inline error; backlog |
| Load error announced | role="alert" on rm-state-panel--error | PASS |
| Loading announced | aria-busy="true" aria-label="Loading messages" | PASS |

## Mobile Touch Targets

| Check | Implementation | Pass |
|---|---|---|
| Thread row min 44x44 | padding 14px 16px on li (row height ~72px total) | PASS |
| Filter chip min 44x44 | padding 6px 14px + min-height not set; actual height ~32px | PARTIAL — chips are below 44px; acceptable as supplementary controls (list reachable without chips) |
| Sidebar items | min-width 44px via div row | PASS |
| Mobile nav items | min-width:44px min-height:44px | PASS |
| Back button | min-height via button padding | PARTIAL — no explicit min-height; backlog |
| Send button | padding 8px 16px; existing component | PARTIAL — below 44px for primary action; backlog on existing component |

## Mobile Layout

| Check | Implementation | Pass |
|---|---|---|
| List-first on mobile | rm-thread-list visible, rm-thread-detail hidden on <768px | PASS |
| Detail view on thread select | showDetail=true → rm-thread-detail--visible-mobile | PASS |
| Back to messages reachable | rm-back-btn shown on mobile | PASS |
| Composer does not cover content | page padding-bottom: 80px on mobile prevents nav bar overlap | PASS |
| Content reachable on small screens | overflow-y: auto on thread list | PASS |

## Reduced Motion

| Check | Implementation | Pass |
|---|---|---|
| Page reveal | @include motion-safe on animation | PASS |
| Skeleton shimmer | @include ambient-motion-safe (removes entirely) | PASS |
| Row hover transition | @include motion-safe on transition | PASS |
| Filter chip transition | @include motion-safe on transition | PASS |
| Empty state reveal | @include motion-safe on animation | PASS |
| Detail slide-in | @include motion-safe on animation | PASS |
| Sidebar item transition | @include motion-safe (existing) | PASS |
| gh-pressable scale | @include motion-safe (existing global class) | PASS |

## Backlog Items (Not Blocking Release)

1. Disabled send button — add aria-describedby "Write a message before sending." helper text
2. Send failure inline error — add role="alert" for immediate screen reader announcement
3. Filter chips — min-height:44px for strict mobile touch target compliance
4. Back button — min-height:44px
5. Focus moves to detail header after thread selection on keyboard — not currently forced; backlog
