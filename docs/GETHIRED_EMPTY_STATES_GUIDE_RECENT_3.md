# GetHired Empty States Guide — NOTIFY-3

## Scope: Empty states in or adjacent to the 6 audited change areas

---

## 1. Job Detail — Job Not Found (Treated as Empty/Error)

**Component:** `job-posts-details.component.html`

This is technically an error state, but from the user's perspective it is the "empty" experience for a job that doesn't exist or is unavailable.

**Current implementation:** GOOD
- `role="alert"` + `aria-live="assertive"` for screen reader announcement
- Heading that explains the situation ("This job isn't available")
- Body copy with cause hints ("It may have expired, been removed, or the link may be incorrect.")
- Recovery CTA: "Browse all jobs" button

**Gap:** No illustration or visual icon to reinforce the empty/error state. Low priority.

---

## 2. Contact Import — No Records After CSV Parse

**Component:** `import-add-contact.component.ts`

When a CSV file is uploaded but parses to 0 records (e.g., malformed, wrong column count), `this.records` remains empty or is an empty array. The `uploadFile()` method would dispatch with an empty array. The BE `multipleContact` handler returns 400 with "No contacts provided." in this case.

**Current gap:** There is no pre-submit empty-records guard in the FE. The component dispatches an empty array, the BE rejects it, and the user sees the generic error toast ("Something went wrong...").

**Recommended improvement (deferred):** Validate `this.records.length > 0` before dispatching and show an inline "No valid records found in this file. Check the CSV format and try again." message rather than letting the BE reject it.

---

## 3. Candidate Import — No Records After CSV Parse

Same gap as contact import above. Deferred.

---

## 4. Signup — No Visible Empty State

The signup form has proper disabled-state handling (button disabled when form invalid + terms not checked). There is no "empty" state concept here — the form is always rendered.

---

## 5. Job Detail Loading State

When `loading$ === true` and `details$ === null`, `<app-inline-loading>` is shown. This is the correct empty-loading pattern for this component. No gap.

---

## Empty State Checklist (NOTIFY Standard)

| Criterion | Job not found | CSV import empty | Contact import error |
|---|---|---|---|
| Visible UI shown | YES | NO (gap) | Partial (generic toast) |
| Explains why | YES | NO | NO |
| Recovery CTA | YES | NO | NO |
| Screen reader announced | YES (role=alert) | N/A | Snackbar (brief) |
| No blame language | YES | N/A | YES |
