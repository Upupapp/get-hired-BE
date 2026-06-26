# GetHired NOTIFY QA Checklist — NOTIFY-3

## Pre-Release Verification Checklist

### A. Job Not Found State

- [x] `jobError$` emits → `.job-detail-error-state` div is visible
- [x] Loading state (`app-inline-loading`) does NOT show when error is present
- [x] Job content section does NOT show when error is present
- [x] Session error message: heading "Session required", body "Sign in to view this job."
- [x] Session error: [Sign In] CTA navigates to /signin
- [x] Generic error message: heading "This job isn't available", body with cause hints
- [x] Both errors: [Browse all jobs] navigates to /jobs
- [x] `role="alert"` present on error div
- [x] `aria-live="assertive"` present on error div
- [x] `noindex` meta tag is set on error
- [ ] SSR: HTTP 404 status is set when `jobError$` emits (requires SSR environment to verify)
- [ ] Title set to "Job not found | GetHired" in browser tab on error

### B. Snackbar Classes

- [x] `.warn-snackbar` defined in styles.scss (#b45309, 5.02:1 contrast)
- [x] `.error-snackbar` defined in styles.scss (#FE6F61)
- [x] `.warning-snackbar` defined (#b45309, same as warn-snackbar)
- [x] `.info-snackbar` defined (#6b7280, 4.83:1 contrast)
- [x] `.danger-snackbar` defined (#FE6F61)
- [x] `.success-snackbar` defined (#FF7062) with `color: #ffffff`
- [ ] Visual smoke test: trigger a 429 response → should see amber/brown snackbar (warn)
- [ ] Visual smoke test: trigger session expiry → should see red snackbar (danger)
- [ ] Visual smoke test: no recording device → should see error-snackbar (red)

### C. Signup Form

- [x] `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` key used at confirm-password label
- [x] Key exists in en.json with value "Confirm Password"
- [x] Password field shows "Password" label
- [x] Confirm password field shows "Confirm Password" label
- [ ] Both fields visually show correct distinct labels in browser
- [x] No console.log in signup.component.ts
- [ ] Signup flow: submit → snackbar does NOT appear → navigate to /verify

### D. Bulk Import Messaging (Contacts)

- [x] Single contact added: success-snackbar "Contact added."
- [x] Bulk all added: success-snackbar "N contacts added."
- [x] Bulk partial: warning-snackbar "N added. M couldn't be added." (amber)
- [x] Bulk all-duplicate: info-snackbar "No new contacts were added..."
- [x] Single duplicate: info-snackbar "This contact is already in your list."
- [x] All failed: danger-snackbar "No contacts were added."
- [ ] Visual smoke test: import a CSV with 1 new + 1 duplicate → partial success path
- [ ] Visual smoke test: import a CSV with all duplicates → duplicate-only path

### E. Bulk Import Messaging (Candidates)

- [x] Same NOTIFY-P2 pattern as contacts
- [x] "Candidate"/"candidates" nouns used correctly
- [ ] Visual smoke test: import a CSV with all new → all_success path

### F. OG Meta Tags

- [x] `og:image:width` set to "1200" in seo.service.ts
- [x] `og:image:height` set to "630" in seo.service.ts
- [x] `og:image:type` set to "image/png" in seo.service.ts
- [x] Tags only set when ogImage is truthy (guarded)
- [ ] Verify with Facebook Sharing Debugger that OG tags render correctly
- [ ] Verify og:image resolves (asset file exists at path)

### G. Debug Log Cleanup (NOTIFY-3 Fixes)

- [x] `console.log(this.data)` removed from import-add-contact.component.ts
- [x] `console.log('dapat di na')` removed from signin.component.ts
- [x] `console.log(user)` removed from signin.component.ts
- [x] `console.log(redirect)` removed from signin.component.ts
- [x] `console.log('For implementation')` removed from account-authentication.component.ts
- [x] `console.log('mode missing')` removed from account-authentication.component.ts
- [x] `console.log('verified na')` removed from account-authentication.component.ts
- [x] `console.log(err)` removed from account-authentication.component.ts
- [ ] Verify: open DevTools → log in → no user object or token logged in Console tab
