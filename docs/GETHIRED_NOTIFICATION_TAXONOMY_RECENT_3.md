# GetHired Notification Taxonomy — NOTIFY-3

## Toast / Snackbar Class Taxonomy

| Class | Color token | Hex | Contrast vs white | WCAG AA | Semantic meaning | Use case |
|---|---|---|---|---|---|---|
| success-snackbar | $color-global-red-buttons | #FF7062 | ~2.9:1 | MARGINAL | Positive outcome, action completed | Saved, added, copied, sent |
| warning-snackbar | $color-warning-amber | #b45309 | 5.02:1 | PASS | Partial success or recoverable issue | N added, M failed |
| info-snackbar | $color-info-gray | #6b7280 | 4.83:1 | PASS | Neutral information, no action failed | Duplicate, already exists |
| danger-snackbar | $color-global-red | #FE6F61 | ~2.9:1 | MARGINAL | Error, failure, session expired | All failed, auth error |
| warn-snackbar | $color-warning-amber | #b45309 | 5.02:1 | PASS | Rate limit / transient blocking signal | 429 responses |
| error-snackbar | $color-global-red | #FE6F61 | ~2.9:1 | MARGINAL | Device/media error | No recording devices |

**Note:** Red-family classes (success, danger, error) use the brand red (#FE6F61 / #FF7062) which achieves ~2.9:1 contrast vs white — below WCAG AA 4.5:1 for small text. This is a known brand constraint. No new defect for this pass.

---

## Outcome → Toast Mapping Rule

```
outcome = 'all_success'    → success-snackbar
outcome = 'partial_success' → warning-snackbar
outcome = 'duplicate_only' → info-snackbar
outcome = 'all_failed'     → danger-snackbar
API call threw/rejected    → danger-snackbar (generic "Something went wrong")
Auth failure (401/403)     → danger-snackbar + redirect
Rate limit (429)           → warn-snackbar (no redirect)
Media device missing       → error-snackbar
```

---

## Alert / Inline Error Taxonomy

| Component | Element | Role | Message type |
|---|---|---|---|
| signup.component.html | `.alert.alert-danger` | `role="alert"` | Auth error (from API) |
| signin.component.html | Similar pattern | `role="alert"` | Auth error |
| job-posts-details.component.html | `.job-detail-error-state` | `role="alert"` `aria-live="assertive"` | Job fetch error |

---

## Page State Taxonomy (applicable to this NOTIFY scope)

| Page | Loading state | Empty state | Error state | Success state |
|---|---|---|---|---|
| Job detail | `<app-inline-loading>` when `loading$ && !details$` | N/A (job not found = error) | `.job-detail-error-state` with heading + body + CTAs | Full job card section |
| Signup | Submit button disabled + "Creating account..." text | N/A | `.alert.alert-danger` inline | Navigate to /verify |
| Contact import | `isLoading` flag disables submit | Empty records array | danger-snackbar | success/info/warning-snackbar + dialog closes |
| Candidate import | `isLoading` flag disables submit | Empty records array | danger-snackbar | success/info/warning-snackbar + dialog closes |

---

## Duration Policy

| Duration | Use for |
|---|---|
| 4000ms | Single-item success, auth events |
| 5000ms | Single-item duplicate/info |
| 5000ms | Rate limit (429) |
| 6000ms | Bulk outcomes (partial, duplicate-only, all-failed) — need longer to read |
