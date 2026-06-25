# NOTIFY-P2: Release Gate

**Date:** 2026-06-26

---

## Go/No-Go Checklist

### Backend

- [x] `addContact` returns `status: 'DUPLICATE_CONTACT'` on duplicate, `status: 'ADDED'` on new insert
- [x] `addMultipleContact` same status fields
- [x] `addCandidates` returns `status: 'DUPLICATE_CANDIDATE'` on duplicate, `status: 'ADDED'` on new insert
- [x] `multipleContact` uses `Promise.allSettled` — no broken async forEach
- [x] `multipleCandidate` uses `Promise.allSettled` — no broken async forEach
- [x] Bulk endpoints return `{ contacts/candidates, summary }` shape
- [x] Summary includes `totalRequested`, `successCount`, `failureCount`, `duplicateCount`, `outcome`
- [x] Structured `console.info` log on every bulk invite call
- [x] No email addresses, UIDs, or tokens logged

### Frontend

- [x] `styles.scss` has `warning-snackbar` and `info-snackbar` classes defined
- [x] `import-add-user.component.ts` reads `e.status !== 'failed'` per email
- [x] `import-add-user.component.ts` never shows success toast when `successCount === 0`
- [x] `import-add-contact.component.ts` reads `res.summary` for bulk, `res.status` for single
- [x] `import-add-candidate.component.ts` reads `res.summary` for bulk, `res.status` for single
- [x] Copy says "Candidate added." (not "Contact added.") for candidate flow
- [x] Partial-success uses `warning-snackbar` with 6s duration
- [x] Duplicate-only uses `info-snackbar`
- [x] All-failed uses `danger-snackbar`

### Non-regression

- [x] Public job browsing and application flows: not touched
- [x] SEC-01/SEC-02 auth guards: not touched
- [x] MATCH scoring: not touched
- [x] Recorder/video answers: not touched
- [x] Payment/PayMongo: not touched
- [x] BOLA guards on contact/candidate endpoints: retained (callerCompany checks unchanged)

---

## Deployment order

1. Deploy BE (SCP + PM2 restart) — status fields are additive, non-breaking for old FE
2. Deploy FE (push to GitHub master → GitHub Actions) — reads new status fields, backwards-compatible with old BE (falls back to default "Contact added." if no status field)
3. Smoke test TC-02 (all-failed invite) and TC-05 (duplicate single contact) on production

---

## Rollback plan

**BE rollback:** Reverting the status fields in services is safe — FE fallback to default "Contact added." is better than false-positive. The bulk response shape change (`{ contacts, summary }`) is the only potentially breaking change; if FE is not yet deployed, the old FE may not handle the new shape gracefully (it subscribed to the array directly). In that window, the bulk import flow may not display results correctly in the UI, but no data is lost — contacts were still saved.

**FE rollback:** Reverting FE toast logic restores the false-positive behavior but does not cause data loss or errors.
