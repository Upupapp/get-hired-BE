# GetHired Success Messages Guide — NOTIFY-3

## NOTIFY Rule: Never show success without confirmed server data

All success messages audited in this pass comply with the NOTIFY constraint:
- No success toast fires on click/submit alone
- All success paths gate on actual server-confirmed data
- `successCount > 0` is checked explicitly before the success-snackbar class is used

---

## Bulk Import Success Messages

### Contacts

| Condition | Message | Class |
|---|---|---|
| Single added | "Contact added." | success-snackbar |
| Multiple added (N > 1) | "3 contacts added." (example) | success-snackbar |
| Partial (N added, M failed) | "3 added. 2 couldn't be added." | warning-snackbar |

**Copy quality:** "Contact added." is direct and clear. "N contacts added." gives exact count. The partial-success message is honest about failures without burying them.

**One improvement opportunity:** "couldn't be added" is slightly passive. "N added. M failed." is shorter and equally honest. Flagged as low-priority copy polish.

### Candidates

Identical pattern to contacts. Messages use "Candidate"/"candidates" nouns. Verified correct.

---

## Single-Action Success Messages

| Action | Message | Class |
|---|---|---|
| Share link copied | "Link copied to your clipboard" | success-snackbar |
| Profile updated (skills) | "Profile successfully updated" | success-snackbar |
| Profile created | "Your public profile has been created" | success-snackbar |
| Resend verification email | "Verification email sent. Please check your inbox and verify your account." | success-snackbar |
| Signup complete | Navigate to /verify (no toast — page transition is the confirmation) | — |

---

## Signup Success Pattern

**File:** `signup.component.ts` line 83–84

On `success && !loading`:
```typescript
this.openVerification(this.email);
// navigates to ../verify
```

The success state is a page navigation to `/verify`, not a toast. This is correct for a high-stakes action (account creation) — the full verify page is more informative than a toast.

---

## Success Message Completeness

All success paths across audited components:
- [x] Only show after confirmed server data
- [x] Use correct snackbar class
- [x] Give specific count where applicable (bulk paths)
- [x] Close dialog / transition state after success
- [x] Reset form state after success
- [x] Dispatch store reset action after success (preventing stale state on re-open)
