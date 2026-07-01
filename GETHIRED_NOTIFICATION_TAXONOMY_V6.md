# GETHIRED NOTIFICATION TAXONOMY V6
**Date:** 2026-07-01

Classification of all notification types across the system, updated with V6 surfaces.

---

## Taxonomy Levels

| Level | Name | Description | Channel |
|---|---|---|---|
| L1 | Inline validation | Immediate field-level feedback | Form field annotation |
| L2 | Toast | Transient ephemeral message, auto-dismisses | Toast overlay |
| L3 | Alert banner | Persistent until dismissed, page-level | Alert div in template |
| L4 | Status page / full-screen state | Dedicated loading/error/success page | Route component |
| L5 | Modal confirmation | Blocking dialog requiring user action | Material dialog |
| L6 | Email | Async out-of-band communication | SendGrid |

---

## V6 New Surfaces

### LinkedIn OIDC Complete Page — L4

The `/linkedin/complete` route is a dedicated callback page that is L4 (full-screen state). It transitions through three states: loading, error, implicit-success (navigates away). The error state is now L4 + accessible (V6-NOT-001 applied role="alert").

| State | Level | Channel | Accessible |
|---|---|---|---|
| Loading | L4 | In-page spinner + aria-live | Yes (polite) |
| Error | L4 | In-page error card + role=alert | Yes (after V6-NOT-001 fix) |
| Success | L4 → L2 | Navigation (no lingering message) | Via destination page |

### Company Setup Success Modal — L5

The company setup success modal is L5 (blocking dialog). The checklist provides a mixed state: done items (L2-equivalent success confirmation) and to-do items (L4-equivalent next-step guidance). This dual use within a single modal is novel — assessed as effective.

| Content | Level | Accessible |
|---|---|---|
| Eyebrow + title | L5 header | Partially (h2 via aria-labelledby; eyebrow hidden) |
| Trial badge | L5 | Hidden by aria-hidden on parent — gap |
| Checklist | L5 | Yes (aria-label per item) |
| CTAs | L5 | Yes (button labels clear) |

### Sign-Out — L4 (absent)

Sign-out currently provides no confirmation notification. The system navigates to /signin silently. Recommended: set a L3 alert banner (loginMessage) before navigation.

---

## Full System Taxonomy Map

| Feature | L1 | L2 | L3 | L4 | L5 | L6 |
|---|---|---|---|---|---|---|
| Email/password login | — | — | Alert banner | — | — | — |
| Email verification | — | — | Alert banner | — | — | Verification email |
| Password reset | — | — | Alert banner | — | — | Reset email |
| Google auth | — | — | Alert banner | — | — | Welcome email |
| LinkedIn auth (new V6) | — | — | — | L4 callback page | — | Welcome email (same flow) |
| Role classification | — | — | — | Full-screen form | — | — |
| Company setup | — | — | — | — | L5 success modal | — |
| Job publish | — | Toast | — | — | — | — |
| Job apply | — | Toast | — | — | — | Notification email |
| Profile save | — | Toast | — | — | — | — |
| Easy Job Post extraction | — | Toast | — | — | — | — |
| Video upload | — | Toast | — | — | — | — |
| PayMongo subscription | — | Toast | — | — | — | Subscription email |
| Sign-out | — | — | (missing) | — | — | — |
| Session expiry | — | — | (missing) | — | — | — |
| Interview invitation | — | — | — | — | — | Email |
| Subscription renewal/expiry | — | — | — | — | — | Email |

---

## Message Channel Priority Rules

1. L1 fires first — always inline, never delayed
2. L2 fires for non-blocking success — dismisses automatically (3-5s)
3. L3 fires for errors the user must act on — dismisses on user action
4. L4 fires for full-screen async operations (OAuth callbacks, long processes)
5. L5 fires for modal confirmations requiring deliberate user choice
6. L6 fires async — never block UI waiting for email confirmation
