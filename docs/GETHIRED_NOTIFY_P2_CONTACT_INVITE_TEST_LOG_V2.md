# NOTIFY-P2: Test Log

**Date:** 2026-06-26

---

## Manual test cases (no automated test suite in this repo)

### TC-01: Company user invite — all succeed
1. Open employer panel → Company Users → Add Users
2. Enter 2 email addresses not yet registered on GetHired
3. Click Invite
4. **Expected:** Green "2 invites sent." toast
5. **Verifies:** Bug 1 baseline (all-success path)

### TC-02: Company user invite — all already registered
1. Enter 2 email addresses that ARE already company users
2. Click Invite
3. **Expected:** Red "No contacts were added." toast (NOT green)
4. **Verifies:** Bug 1 primary fix — `emails.length > 0` check replaced by status-based check

### TC-03: Company user invite — mixed
1. Enter 1 already-registered email + 1 new email
2. Click Invite
3. **Expected:** Amber "1 sent. 1 couldn't be added." toast
4. **Verifies:** Partial-success path

### TC-04: Add single contact — new email
1. Contacts → Add Contact → enter new email → submit
2. **Expected:** Green "Contact added." toast
3. **Verifies:** Single-contact success path

### TC-05: Add single contact — duplicate
1. Contacts → Add Contact → enter already-existing email → submit
2. **Expected:** Gray "This contact is already in your list." toast (NOT green)
3. **Verifies:** Bug 2 fix — duplicate returns `status: DUPLICATE_CONTACT`

### TC-06: Bulk import contacts — all new
1. Contacts → Import CSV → upload CSV with 3 new emails
2. **Expected:** Green "3 contacts added." toast
3. **Verifies:** Bulk success path + Promise.allSettled fix

### TC-07: Bulk import contacts — all duplicates
1. Import CSV with emails already in contacts
2. **Expected:** Gray "No new contacts were added. These contacts are already in your list." toast
3. **Verifies:** Bug 2 + structural fix for duplicate_only outcome

### TC-08: Bulk import contacts — partial
1. Import CSV with 2 new + 1 duplicate
2. **Expected:** Amber "2 added. 0 couldn't be added." toast (duplicate counted separately from failure)
   Note: duplicates are not shown as failures — they appear in duplicateCount, not failureCount
3. **Verifies:** partial_success outcome

### TC-09: Add single candidate — duplicate
1. Candidates → Add Candidate → enter already-existing email
2. **Expected:** Gray "This candidate is already in your list." toast (NOT green)
3. **Verifies:** Bug 3 fix

### TC-10: Toast copy says "Candidate" not "Contact" for candidate flow
1. Add new candidate
2. **Expected:** "Candidate added." (not "Contact added.")
3. **Verifies:** Copy fix in import-add-candidate.component.ts

### TC-11: Non-invite flows unaffected
1. Browse jobs as applicant, apply, view job details
2. **Expected:** No change in behavior
3. **Verifies:** Blast radius containment

---

## Regression risk areas

| Area | Risk | Why low |
|------|------|---------|
| `createContact` single endpoint | Low | Additive `status` field only |
| `multipleContact` response shape | Medium | Wrapped in `{ contacts, summary }` — FE patched in sync |
| `addCandidates` single endpoint | Low | Additive `status` field only |
| `multipleCandidate` response shape | Medium | Wrapped in `{ candidates, summary }` — FE patched in sync |
| Non-invite employer flows | None | No controller changes outside contact/candidate |
| Applicant flows | None | Not touched |
