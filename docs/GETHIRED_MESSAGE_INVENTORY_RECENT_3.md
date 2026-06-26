# GetHired Message Inventory — NOTIFY-3
## All user-facing messages audited in this pass

**Scope:** Changes since last NOTIFY (NOTIFY-V5), focused on 6 flagged areas

---

## 1. Job Not Found State — job-posts-details.component.html

| Condition | Heading | Body | CTA(s) | Class/Role |
|---|---|---|---|---|
| `errMsg === 'Unable to load this job for the current session.'` | "Session required" | "Sign in to view this job." | [Sign In → /signin], [Browse all jobs → /jobs] | `role="alert"`, `aria-live="assertive"` |
| All other errors | "This job isn't available" | "It may have expired, been removed, or the link may be incorrect." | [Browse all jobs → /jobs] | `role="alert"`, `aria-live="assertive"` |

**Quality:** PASS. Heading is informative, body explains cause without blame, CTAs give a path forward.

---

## 2. Snackbar Toast Messages — styles.scss + consumers

| Message | Trigger location | Class | Duration | Notes |
|---|---|---|---|---|
| "Your session has expired. Please sign in again to continue." | unauthorize.interceptor.ts | danger-snackbar | 4000ms | Clear, actionable |
| "You've made too many requests. Please wait a moment and try again." | unauthorize.interceptor.ts (429) | warn-snackbar | 5000ms | Non-alarmist, correct guidance |
| "Contact added." | import-add-contact (single) | success-snackbar | 4000ms | Correct |
| "N contacts added." | import-add-contact (bulk all-success) | success-snackbar | 4000ms | Correct |
| "N added. M couldn't be added." | import-add-contact (partial) | warning-snackbar | 6000ms | Honest |
| "No new contacts were added. These contacts are already in your list." | import-add-contact (all-duplicate) | info-snackbar | 6000ms | Explains reason |
| "This contact is already in your list." | import-add-contact (single dup) | info-snackbar | 5000ms | Friendly |
| "No contacts were added." | import-add-contact (all-fail) | danger-snackbar | 6000ms | Correct |
| "Candidate added." | import-add-candidate (single) | success-snackbar | 4000ms | Correct |
| "N candidates added." | import-add-candidate (bulk all-success) | success-snackbar | 4000ms | Correct |
| "N added. M couldn't be added." | import-add-candidate (partial) | warning-snackbar | 6000ms | Honest |
| "No new candidates were added. These candidates are already in your list." | import-add-candidate (all-dup) | info-snackbar | 6000ms | Clear |
| "This candidate is already in your list." | import-add-candidate (single dup) | info-snackbar | 5000ms | Clear |
| "No candidates were added." | import-add-candidate (all-fail) | danger-snackbar | 6000ms | Correct |
| "Link copied to your clipboard" | job-posts-details (share) | success-snackbar | 4000ms | Clear |
| "Something went wrong please try again later or contact your administrator" | import-add-contact/candidate (API error) | danger-snackbar | 4000ms | Generic but acceptable |
| "No Available Devices to record" | recorder-setting (no devices) | error-snackbar | 4000ms | Clear |
| "Verification email sent. Please check your inbox and verify your account." | account-authentication (resend) | success-snackbar | 4000ms | Clear |

---

## 3. Signup Form Validation Messages — signup.component.html

| Field | Validation | Message |
|---|---|---|
| First Name | required | "First Name is required" |
| Last Name | required | "Last Name is required" |
| Email | required | "Email is required" |
| Password | required | "Password is required" |
| Password | pattern | "Password must be 8 characters long with mixed uppercase, special characters and numbers." |
| Confirm Password | required | "Re-enter Password is required" |
| Confirm Password | notEquivalent | "Passwords do not match" |
| Role | required | "Role is required" |

**Quality:** Adequate. Trigger is `invalid && touched` or `dirty` — consistent. No premature validation.

---

## 4. Page Titles (SEO + Browser Tab)

| Page | Title |
|---|---|
| Signup | "Create Account | GetHired Online" |
| Signin | "Sign In | GetHired Online" |
| Account verify | "Verify Account | GetHired Online" |
| Job detail (loaded) | "{jobTitle} at {companyName} | GetHired" |
| Job detail (error) | "Job not found | GetHired" |

---

## 5. OG Meta Copy (social sharing)

| Tag | Value | Quality |
|---|---|---|
| og:title | Page title | Consistent with `<title>` — correct |
| og:description | Page description | Consistent with `<meta name="description">` |
| og:image | `https://gethiredonline.app/assets/brand/gethired-og-default.png` | Correct path |
| og:image:width | 1200 | Correct (matches image spec) |
| og:image:height | 630 | Correct (matches image spec) |
| og:image:type | image/png | Correct |
| og:type | website (default) or article/object | Configurable per page |
| og:site_name | GetHired Online | Consistent |

---

## 6. Employer Signup Variant Copy (signup.component.html role=2)

| Element | Generic | Employer (?role=2) |
|---|---|---|
| Page title | "Create Account" | "Create your employer account" |
| Subtitle | (none) | "Start hiring in minutes. Post your first job and reach qualified candidates." |
| Submit button | "Create Account" (i18n) | "Create employer account" |
| Submitting state | "Creating account..." | "Creating account..." |
| Already have account | Generic i18n prompt | "Already have an employer account? Sign in" |

**Quality:** Contextual copy is appropriate and not misleading.
