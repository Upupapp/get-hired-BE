# GetHired Message Decision Matrix — NOTIFY-3

## When to show which message type

### Bulk Import (contacts / candidates)

```
API call returned successfully (HTTP 200)?
├── YES: check res.summary
│   ├── summary present?
│   │   ├── YES
│   │   │   ├── successCount > 0 AND failureCount === 0 → success-snackbar
│   │   │   │   └── successCount === 1 → "Contact/Candidate added."
│   │   │   │   └── successCount > 1  → "N contacts/candidates added."
│   │   │   ├── successCount > 0 AND failureCount > 0 → warning-snackbar (6s)
│   │   │   │   └── "N added. M couldn't be added."
│   │   │   ├── successCount === 0 AND duplicateCount > 0 → info-snackbar (6s)
│   │   │   │   └── (bulk): "No new contacts/candidates were added. These ... are already in your list."
│   │   │   └── successCount === 0 AND duplicateCount === 0 → danger-snackbar (6s)
│   │   │       └── "No contacts/candidates were added."
│   │   └── NO (single-item response)
│   │       ├── res.status === 'DUPLICATE_CONTACT'/'DUPLICATE_CANDIDATE' → info-snackbar (5s)
│   │       │   └── "This contact/candidate is already in your list."
│   │       └── else → success-snackbar (4s)
│   │           └── "Contact/Candidate added."
└── NO: error state fires → danger-snackbar (4s)
    └── "Something went wrong please try again later or contact your administrator"
```

---

### Job Detail Error vs Loaded

```
jobError$ emits truthy value?
├── YES
│   ├── errMsg === 'Unable to load this job for the current session.'
│   │   → H5: "Session required"
│   │   → P: "Sign in to view this job."
│   │   → CTA: [Sign In] + [Browse all jobs]
│   └── else
│       → H5: "This job isn't available"
│       → P: "It may have expired, been removed, or the link may be incorrect."
│       → CTA: [Browse all jobs]
└── NO: show loading state or job content
```

---

### HTTP Interceptor (401/403/429)

```
HttpErrorResponse received?
├── status 401 OR 403
│   → logout + danger-snackbar
│   → "Your session has expired. Please sign in again to continue."
│   → redirect /signin
├── status 429
│   → warn-snackbar (no logout)
│   → "You've made too many requests. Please wait a moment and try again."
└── other status → not handled by interceptor (propagates to component)
```

---

### OG Image Meta Decision

```
setPageMeta({ ogImage: X }) called?
├── ogImage provided (non-null)
│   → set og:image, og:image:width (1200), og:image:height (630), og:image:type (image/png)
└── ogImage not provided
    → defaults to DEFAULT_OG_IMAGE = gethired-og-default.png
    → still sets width/height/type tags (default image matches 1200x630 spec)
```

---

### Signup Form Submit Button State

```
Role === 2 (employer)?
├── YES
│   ├── Not submitting → "Create employer account"
│   └── Submitting → "Creating account..." + spinner
└── NO
    ├── Not submitting → i18n: 'CREATE_ACCOUNT.REGISTRATION_BUTTON'
    └── Submitting → "Creating account..." + spinner

Button disabled when: submitting === true OR registerForm.valid === false OR agreeToTerms.value === false
```
