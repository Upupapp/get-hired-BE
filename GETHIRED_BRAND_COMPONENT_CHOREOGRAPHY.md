# GETHIRED_BRAND_COMPONENT_CHOREOGRAPHY.md
## BRAND QA Cycle 11 — Component Choreography
_Generated: 2026-06-25_

---

## Interview Hub — Load Choreography

```
Route activated
  └─ Loading skeleton appears (instant)
       ├─ 3 filter chip skeletons (shimmer — currently no-op, FIX-01)
       └─ 3 card skeletons (shimmer — currently no-op, FIX-01)

HTTP response received
  ├─ SUCCESS: skeleton disappears, content fades in
  │    └─ .ih-header: ih-fadein 220ms decelerate (ambient-motion-safe)
  │    └─ filter chips appear (no entry animation — acceptable)
  │    └─ card list appears (no stagger — acceptable for MVP)
  │
  ├─ ERROR: skeleton disappears, error panel appears (role=alert, no animation)
  │
  └─ EMPTY: skeleton disappears, empty state appears (no entry animation)
```

**Gap:** No entry animation on card list. Cards appear instantly. A staggered entry (`animation-delay: Nms`) per card would improve perceived quality. Backlog item.

---

## Mobile Drawer — Open Choreography

```
User taps hamburger button
  ├─ mobileNavOpen = true (Angular change detection)
  ├─ .gh-mobile-scrim opacity: 0→1 (260ms standard ease)
  ├─ .gh-mobile-drawer translateX(-100%)→0 (260ms decelerate)
  ├─ .gh-menu-icon--open class added:
  │    ├─ top line: rotate(45deg) translate(4px,6px) (260ms decelerate)
  │    ├─ mid line: opacity 0, scaleX(0) (160ms standard)
  │    └─ bottom line: rotate(-45deg) translate(4px,-6px) (260ms decelerate)
  └─ setTimeout(200ms) → firstDrawerLink.focus()
       └─ Focus lands on "Dashboard" nav link
```

**Close Choreography:**
```
User taps scrim OR presses Escape OR taps close button
  ├─ mobileNavOpen = false
  ├─ .gh-mobile-scrim opacity: 1→0 (260ms)
  ├─ .gh-mobile-drawer translateX(0)→-100% (260ms)
  ├─ hamburger morph reverses
  └─ setTimeout(50ms) → mobileMenuBtn.focus()
       └─ Focus returns to hamburger button
```

**Choreography Assessment:**
- Scrim and drawer animate simultaneously — correct (no stagger on close/open)
- SVG morph runs concurrent with drawer — appropriate
- Focus management timing: 200ms open (waits for drawer), 50ms close (near-instant) — correct
- Escape handler is global (`@HostListener('document:keydown.escape')`) — correct, works from any position on page

---

## Messages Inbox — Thread Selection Choreography

```
User clicks thread row
  ├─ Row visual: background #f9fafb + translateY(-1px) on hover (lifted)
  ├─ On click: selectedThread = t
  ├─ (mobile) showDetail = true → thread list slides out (CSS display none, no animation)
  └─ .rm-detail-reveal: opacity 0→1 + translateX(8px→0) (220ms decelerate)
```

**Gap:** Mobile transition from list to detail is `display: none` with no animation — abrupt on small screens. A `translateX` slide would be more polished. Backlog item.

---

## Avatar Photo — Choreography

```
Thread row renders with applicantPhotoUrl
  ├─ <img> with loading="lazy" — browser controls load timing
  ├─ While loading: .rm-thread-avatar shows gradient background (avatar fallback container)
  ├─ Img loads: img fills container (object-fit: cover, border-radius: 50%)
  └─ If img fails: img element is present but broken; fallback initials NOT shown
       └─ BUG: *ngIf="t.applicantPhotoUrl" shows img only when URL present,
              and *ngIf="!t.applicantPhotoUrl" shows initial only when URL absent.
              When URL present but image 404s: broken img icon appears inside avatar circle.
              RISK-06 — see BRAND_ACCESSIBILITY_GUARDRAILS.
```
