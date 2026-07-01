# GETHIRED LOADING STATES GUIDE V6
**Date:** 2026-07-01

All loading states reviewed with V6 additions for LinkedIn OIDC.

---

## Loading State Standard

A loading state must:
1. Indicate that something is happening
2. Name what is happening (not just a spinner)
3. Be announced to screen readers via `aria-live="polite"` or `role="status"`
4. Not mislead about duration

---

## V6: LinkedIn OIDC Loading State

**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.html`

```html
<div class="li-complete-loading" aria-live="polite">
  <div class="li-complete-spinner" role="status" aria-label="Completing LinkedIn sign-in"></div>
  <p class="li-complete-label">Completing LinkedIn sign-in…</p>
</div>
```

| Criterion | Met? | Note |
|---|---|---|
| Shows something is happening | Yes | Spinner |
| Names what is happening | Yes | "Completing LinkedIn sign-in…" |
| Screen reader accessible | Yes | aria-live="polite" on parent |
| No misleading duration | Yes | Ellipsis implies in-progress |
| Duplication issue | Minor | Both aria-live and role="status" will announce — consider removing role="status" from spinner |

**Assessment:** Good. Minor duplication between `aria-live="polite"` on the wrapper and `role="status"` on the spinner — both will cause an announcement. The visible text label inside the live region means the spinner's `aria-label` is redundant. Removing `role="status"` from the spinner is a low-severity cleanup.

---

## V6: Company Setup Modal — No Loading State

The modal opens only after the server has responded successfully. There is no in-modal loading state. If the server is slow, the loading state would be in the parent company-setup form (not audited in V6). No gap identified for the modal itself.

---

## V6: Sign-Out — No Loading State

Sign-out in `header.component.ts` and `employer-panel.component.ts` calls `localStorage.clear()` and `coreService.logout()` synchronously, then navigates. The BE logout call (`logoutAdmin()`) in `admin.service.ts` is fire-and-forget — it's subscribed but the user is already navigated before response. No loading state is shown or needed.

---

## Full System Loading State Inventory

| Surface | Loading shown? | Text | aria-live? | Quality |
|---|---|---|---|---|
| Signin submit | Yes (gif spinner on button) | None — visual only | No | Partial — no text for screen readers |
| Google auth | Yes — "Connecting to Google…" | "Connecting to Google…" | Yes (aria-live polite) | Good |
| LinkedIn auth loading (V6) | Yes — spinner + label | "Completing LinkedIn sign-in…" | Yes (aria-live polite) | Good |
| Role classification submit | No spinner on submit | — | — | Missing — V5-NOT-002 |
| Job post extraction | Yes (Easy Job Post) | Context | Depends on toast | Partial |
| Job apply | Yes | Context | Depends on toast | Partial |
| Profile save | Yes | Context | Depends on toast | Partial |
| PayMongo payment | Yes | Context | Depends | Partial |
| Video upload | Yes | Context | Yes | Good |

---

## Loading State Copy Standards

| Do | Don't |
|---|---|
| "Completing LinkedIn sign-in…" — name the operation | "Loading…" alone |
| Use ellipsis to signal in-progress | Use "Please wait" without context |
| aria-live="polite" for in-progress operations | No live region for dynamic state |
| Keep loading text brief (≤ 5 words) | Long explanatory sentences |
| Set aria-live on the wrapper, not just the spinner | role="status" + aria-live on same element (duplication) |
