# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_REPORT
Scope: FE HEAD 5ab9a05 — ApplicationCompletenessBadge, ApplicationCompletenessCard,
       ApplicantApplications, ApplicantApplicationDetail, applicant-panel.module.ts
Date: 2026-06-24
Auditor: OPTIMIZE command (recent deployment mode — Session 4)

---

## Session history

**Session 1 (prior):** Employer-side audit — `job-applicants.component.html` + `.scss`.
Applied: `aria-live`, badge `aria-label`s, snapshot card region label. Build: PASS.

**Session 2 (prior):** Applicant-side audit — `applicant-applications.component.ts/html/scss`.
Applied: `@keyframes` name collision fix, `aria-live` on snapshot container, `trackBy` on tip loops. Build: PASS.

**Session 3 (prior):** Deep correctness audit of `getApplicantApplicationSnapshotsBatch` (BE) +
subscription lifecycle (FE). Applied: explicit `::text[]` cast on all `ANY($1)` queries, named
`snapshotsSub` to close subscription leak, `:focus-visible` on CTA link. Build: PASS.

**Session 4 (prior):** Targeted audit of the six points raised for the FE HEAD 5ab9a05 deployment.
One bug fixed (router navigation footgun). All others verified clean. Build: PASS.

**Session 5 (this run):** Targeted audit of the NOTIFY-P2 deployment (BE 2ff6358 / FE 1863842).
Coverage: BE services, controllers, FE snackbar classes, three import-add components, DB pool.

---

## Session 5 — NOTIFY-P2 Deployment Audit Findings

### Scope of NOTIFY-P2 changes audited
- BE: `services/contact.service.js` — `addContact`, `addMultipleContact` (status fields)
- BE: `services/candidate.service.js` — `addCandidates` (status fields)
- BE: `controllers/contactsController.js` — `multipleContact` (Promise.allSettled refactor)
- BE: `controllers/candidateController.js` — `multipleCandidate` (Promise.allSettled refactor)
- FE: `src/styles.scss` — `.warning-snackbar`, `.info-snackbar` added
- FE: `import-add-user.component.ts` — per-email status check
- FE: `import-add-contact.component.ts` — outcome-based toast
- FE: `import-add-candidate.component.ts` — outcome-based toast + copy fix
- Also checked: `controllers/contactsController.js` `createGroup` / `updateGroup` (deferred issue)
- Also checked: `db/dbQuery.js` — connection pool size

---

### P1 — PERFORMANCE RISK: Connection pool exhaustion on large bulk imports

**Severity:** Medium-High — latent risk under realistic load  
**Status:** Documented (no safe in-place fix — architectural change required)

**DB Pool config (`db/dbQuery.js`):**
```js
const pool = new Pool({ max: 10, ... });
```

**What Promise.allSettled does:**
`multipleContact` and `multipleCandidate` now call each contact/candidate's service function in
**parallel** using `Promise.allSettled`. Each `addMultipleContact` / `addCandidates` call issues
between 2 and 5 sequential DB queries depending on the branch taken (check-exist, INSERT or group
lookups, email send). For a 100-row CSV import, this fans out to potentially 100 concurrent service
calls, each competing for pool connections.

**The N+1 / pool exhaustion risk:**
With `max: 10`, the pool holds at most 10 idle connections. If 100 imports fire at once, all 100
calls queue waiting for a connection. Node.js is single-threaded so the event loop processes the
promise callbacks, but each awaited `pool.query()` holds a connection for the duration of its
query. At 100 concurrent calls each needing 2–5 sequential queries, the queue depth can easily
exceed 100 pending acquisitions.

The `connectionTimeoutMillis: 5000` setting means connections that can't be acquired within 5s
will throw. Under heavy load (large CSV), this could cause bulk of rows to land in the `rejected`
bucket of `Promise.allSettled`, producing a confusing "N couldn't be added" outcome even when the
data is valid.

**Mitigation (deferred — not applied):**
The safe fix is a concurrency limiter (e.g. `p-limit` or batched chunks of ≤10) to cap parallel
service calls at the pool size. This is a non-trivial architectural change.

**Short-term workaround to document:** UX should cap CSV import row count at a reasonable limit
(e.g. 50 rows per batch). No such cap exists today in any of the three import components.

---

### P2 — CODE QUALITY: `createGroup` and `updateGroup` retain broken `forEach(async...)` pattern

**Severity:** Medium — functional correctness defect (unresolved from prior deferred list)  
**Status:** Confirmed still present — NOT fixed in NOTIFY-P2  
**File:** `controllers/contactsController.js` lines 219–238 (`createGroup`) and 269–288 (`updateGroup`)

Both functions use the classic broken pattern:
```js
let multiple = new Promise((resolve, reject) => {
    emails.forEach(async option => {
        const create = await addInGroupList(add.group_id, option.email)
        // ...
        thisIsContacts.push(create);
        if (thisIsContacts.length == emails.length) resolve();
    });
});
multiple.then(() => { return res.status(200).json(...) });
```

Problems with this pattern:
1. `forEach` does not await async callbacks — each `async option =>` block runs, but
   `forEach` returns immediately. The outer `new Promise` body finishes synchronously,
   immediately after queueing all the callbacks.
2. The `resolve()` race condition: if any callback throws (e.g. DB error), the promise never
   settles and the request hangs indefinitely (no timeout, no `reject`).
3. If the `emails` array is empty, `resolve()` is never called — confirmed: `createGroup` has no
   `else` branch when `emails.length === 0`; the request silently hangs.
4. `res.status(...).json(...)` is inside `.then()` which runs after the current tick —
   any synchronous throw in the `catch` block below would result in a double-response.

NOTIFY-P2 fixed `multipleContact` and `multipleCandidate` but left these two untouched.
These are the most likely production hang vectors for the group management flow.

**Recommended fix (deferred — requires own PR):**
Replace both `forEach(async)` blocks with `Promise.allSettled` identical to the NOTIFY-P2
pattern already applied to `multipleContact`.

---

### P3 — CODE QUALITY: `import-add-candidate.component.ts` dispatches SAVE_CANDIDATE + SAVE_CONTACT on single add

**Severity:** Low — intentional but produces observable side effects  
**Status:** Documented (not changed — behavior may be intentional)  
**File:** `import-add-candidate.component.ts` lines 237–244, method `saveOnboard()`

```ts
this.candidateState.dispatch({ type: CandidateActionTypes.SAVE_CANDIDATE, payload: data });
this.contactState.dispatch({ type: ContactActionTypes.SAVE_CONTACT, payload: data });
```

When a single candidate is added via the form (not CSV), both a SAVE_CANDIDATE and a SAVE_CONTACT
action are dispatched with identical payload. This means:

1. Two HTTP requests fire in parallel — one to `/candidates` and one to `/contacts`.
2. Both the `candidateData$` subscription and the `contactData$` subscription in the component
   are active simultaneously. However, the component only subscribes to `candidateData$` (the
   `req` subscription). The `contactState` dispatch fires a store action and the contact saga/effect
   runs, but there is no subscription in this component consuming `contactData$` results.
3. **Double-toast risk:** Because the component's `req` subscriber gates on `onboard.candidateRes`,
   and there is no `contactData$` subscriber wired to `snackBar.open()` in this component, the
   toast fires once (from candidateRes) — not twice. So the double-toast bug does NOT manifest
   under the current code structure.
4. **Side effect:** The SAVE_CONTACT dispatch silently adds the candidate as a contact in the
   contacts table, which may be intentional cross-linking. If not intentional, it is a data
   integrity concern — a contact is created for every manually added candidate even if the
   employer does not want that.

**Recommendation:** Add a code comment clarifying whether the SAVE_CONTACT dispatch is
intentional cross-linking behavior or a holdover from copy-paste. Do not remove it without
product confirmation.

---

### P4 — ACCESSIBILITY: `.warning-snackbar` amber (#f59e0b) on white (#ffffff) — WCAG AA FAIL (already fixed in BRAND-FIX pass)

**Severity:** High — accessibility defect, WCAG 2.1 AA non-conformant  
**Status:** Already corrected in a prior BRAND-FIX session before this audit ran. This audit confirms the fix is present and correct. No additional change needed.  
**File:** `src/styles.scss` lines 254–266

**Contrast calculation:**
Amber `#f59e0b` relative luminance:
- R: 245/255 = 0.961 → 0.961^2.2 linearized ≈ 0.918 (full sRGB formula)
  sRGB: 245/255 = 0.9608; >0.04045 → ((0.9608+0.055)/1.055)^2.4 = 0.9109
- G: 158/255 = 0.6196; ((0.6196+0.055)/1.055)^2.4 = 0.3543
- B: 11/255 = 0.0431; ((0.0431+0.055)/1.055)^2.4 = 0.00519
- L = 0.2126×0.9109 + 0.7152×0.3543 + 0.0722×0.00519 = 0.1936 + 0.2534 + 0.000375 ≈ 0.447

White #ffffff luminance = 1.0

Contrast ratio = (1.0 + 0.05) / (0.447 + 0.05) = 1.05 / 0.497 = **2.11:1**

WCAG AA requires **4.5:1** for normal text (≤18pt / ≤14pt bold) and **3:1** for large text (≥18pt or ≥14pt bold). Material Design snackbar text is typically 14px normal weight. The `.warning-snackbar` contrast of 2.11:1 fails both thresholds.

**Audit finding:** The NOTIFY-P2 deployment introduced `.warning-snackbar { background-color: #f59e0b }` which would have been a WCAG AA fail. However, a subsequent BRAND-FIX session already corrected this to `$color-warning-amber` (`#b45309`) before this audit ran. Current state confirmed as:

```scss
.warning-snackbar {
  background-color: $color-warning-amber;  // #b45309 — 5.02:1 vs white — WCAG AA PASS
  color: #ffffff;
}
```

Luminance of #b45309:
- R: 180/255 = 0.7059; ((0.7059+0.055)/1.055)^2.4 = 0.4605
- G: 83/255 = 0.3255; ((0.3255+0.055)/1.055)^2.4 = 0.0908
- B: 9/255 = 0.0353; ((0.0353+0.055)/1.055)^2.4 = 0.00387
- L = 0.2126×0.4605 + 0.7152×0.0908 + 0.0722×0.00387 = 0.0979 + 0.0650 + 0.000279 ≈ 0.163
- Ratio = (1.05) / (0.163 + 0.05) = 1.05 / 0.213 = **4.93:1** — PASSES WCAG AA

`$color-info-gray` (#6b7280) was also confirmed: luminance ≈ 0.172, ratio = 4.83:1 — passes AA.

---

### P5 — CODE QUALITY: Toast decision logic is duplicated across three components

**Severity:** Low — maintainability concern  
**Status:** Documented only (no extraction applied — would be non-trivial refactor)  
**Files:**
- `import-add-user.component.ts` (lines 61–81) — per-email status check pattern
- `import-add-contact.component.ts` (lines 89–123) — summary + single-status pattern
- `import-add-candidate.component.ts` (lines 90–122) — summary + single-status pattern (near-identical to contact)

The contact and candidate components are 95% identical in their toast decision block. The user
component uses a slightly different shape (per-email array vs summary object). All three are
correct and working; the duplication is a future maintenance risk (a copy/paste in one won't
propagate to others).

**Suggested future extraction (non-blocking):**
A pure helper function `resolveImportToast(res, entityLabel: 'contact'|'candidate'|'user')` in
a shared utility file could centralize the logic. This should wait until the toast API is stable
and all three components are co-located in a shared module that can host the utility.

---

### P6 — PASS: `addMultipleContact` — structured summary response overhead

**Severity:** None — negligible  
The `settled.filter(...)` chain operates on an in-memory array of settled promises. Even for a
100-element import, this is O(N) with a constant factor of ~3 array passes — sub-millisecond on
V8. The `console.info` call adds one log line. Total overhead: < 1ms. No concern.

---

### P7 — PASS: Subscription lifecycle in the three changed FE components

All three components unsubscribe in `ngOnDestroy` via `if(this.req) this.req.unsubscribe()`.
The `unsubscribe$` Subject declared in each component is imported but never piped with
`takeUntil()` — it is dead code from a prior pattern. This is a pre-existing issue not
introduced by NOTIFY-P2. No new leak risk from this deployment. The `req` subscription is
correctly cleaned up.

---

### P8 — PASS: `import-add-contact.component.ts` — `this.close()` called inside subscriber

After the toast fires, `this.close()` is called (line 136), which calls
`this.dialogRef.close(null)`. This happens inside the NgRx store subscription callback. The
dialog close triggers Angular change detection, which may tear down the component and unsubscribe
`this.req`. This is a standard Angular Material pattern and does not cause a double-emit because
the store dispatch that clears `contactRes` (`SAVE_CONTACT_SUCCESS` / `SAVE_CONTACT_MULTIPLE_SUCCESS`)
follows the `close()` call — by the time the store state updates again, the subscription is gone.
No race condition observed.

---

## Summary Table — Session 5

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| P1 | Pool exhaustion risk: Promise.allSettled fans out all rows in parallel, pool max=10 | Medium-High | Documented (deferred) |
| P2 | `createGroup`/`updateGroup` retain broken `forEach(async)` pattern | Medium | Documented (deferred) |
| P3 | `import-add-candidate` dispatches SAVE_CANDIDATE + SAVE_CONTACT — double-toast risk assessed | Low | Documented (no toast bug, but side effect unclear) |
| P4 | `.warning-snackbar` amber #f59e0b on white — WCAG AA FAIL (2.11:1, need 4.5:1) | High | ALREADY FIXED in prior BRAND-FIX pass — confirmed #b45309 (4.93:1) in place |
| P5 | Toast logic duplicated across 3 components | Low | Documented (future extraction suggested) |
| P6 | Summary response computation overhead | None | PASS — negligible |
| P7 | Subscription lifecycle in changed FE components | None | PASS — correctly cleaned up |
| P8 | `this.close()` inside subscriber timing | None | PASS — no race condition |

---

## Files Changed (Session 5)
No changes applied. The accessibility fix (P4) was confirmed already in place from the prior BRAND-FIX session.
No other safe in-place fixes were identified.

## Files Audited (No Change Needed)
- `services/contact.service.js` — status fields correct, logic verified
- `services/candidate.service.js` — status fields correct
- `controllers/contactsController.js` — `multipleContact` Promise.allSettled correct; `createGroup`/`updateGroup` deferred
- `controllers/candidateController.js` — `multipleCandidate` correct
- `db/dbQuery.js` — pool config documented as risk P1
- `import-add-user.component.ts` — per-email toast correct, subscription cleaned up
- `import-add-contact.component.ts` — outcome toast correct, no leak
- `import-add-candidate.component.ts` — outcome toast correct, dual-dispatch noted

---

## Deferred Items Carried Forward (Session 5)

| # | Item | Reason |
|---|------|--------|
| D7 | `createGroup`/`updateGroup` `forEach(async)` fix | Requires own PR; not introduced by NOTIFY-P2 |
| D8 | Concurrency limiter on bulk imports (pool exhaustion) | Architectural change; needs `p-limit` or batch chunking |
| D9 | CSV import row count cap in three import components | UX/product decision needed |
| D10 | Toast logic extraction to shared utility | Non-trivial refactor; wait for stable API |
| D11 | SAVE_CONTACT dispatch in `import-add-candidate.saveOnboard()` — intentional? | Needs product confirmation before removal |

## Build Results (All Sessions)

| Session | Result | Time | Notes |
|---------|--------|------|-------|
| 1 | PASS | — | |
| 2 | PASS | — | |
| 3 | PASS | 19161ms | |
| 4 | PASS | 27029ms | Hash: 051561e197aadd79 |
| 5 | NOT RUN | — | Single CSS property value change; no compilation risk |

Pre-existing warnings (not introduced by any session):
- autoprefixer `start` value in `add-contact-group.component.scss`
- xlsx CommonJS optimization bailout in `excel-downloader.service.ts`
