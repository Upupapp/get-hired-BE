# GETHIRED_NOTIFY_REPORT_RECENT_V2
Scope: BE `8a2a205` + FE `a25cb38` — notification/messaging quality audit

---

## 1. Error Message Quality After Refactor

The `errorResponse()` factory is now used consistently across all 15 controllers.
The problem is the strings themselves, not the factory.

**Worst offenders — generic across critical paths:**

| Controller | Function | String | Why it's bad |
|---|---|---|---|
| `userController` | `logout` | "Operation not successful. Please try again." | User has no idea their logout failed; session may be stale |
| `userController` | `getVerificationLink`, `resendVerification`, `verifyEmail` | "Operation not successful. Please try again." | 3 separate Firebase failures, same string — user can't tell if it's a network issue or their email is blocked |
| `companiesController` | `createInitialCompany`, `updateCompany`, all dashboard calls | "Operation not successful. Please try again." | 10+ occurrences, no action the user can take |
| `interviewController` | All 8 handlers | "Operation not successful. Please try again." | Zero specificity in interview creation/update flows |
| `messageController` | All 4 handlers | "Operation not successful. Please try again." | Message send failures look identical to message load failures |
| `userController` L141 | `registerUser` (post-Firebase, pre-DB) | "Operation not Successful." | Capitalisation inconsistency; also wrong — Firebase succeeded, the DB write failed |
| `subscriptionController` | `createPaymentIntent` | "Operation not successful. Please try again." | Payment link creation failure has no indication that money is not being charged |

**Better strings already in the codebase (good examples to replicate):**
- `loginUser`: "Login failed. Please check your credentials and try again."
- `changePw`: "Your password reset link may have expired. Please request a new one."
- `applicationController`: context-specific messages like "Unable to retrieve your application snapshot."

**Priority fixes:** `verifyEmail`, `resendVerification`, `createPaymentIntent`, `logout`.

---

## 2. addCompanyUserByEmail Error Surface

**BE response shape:** `{ status: "failed", msg: "Failed to add user" }`
(catch-all in `addCompanyUserByEmail` lines 583-589)

**FE handling:**
- `ImportAddUserComponent` dispatches `SAVE_COMPANY_USER` to the NgRx store.
- On success, it receives `invite.companyUserRes.emails` (the `{ email, status, msg }` array) and stores it in `invitedUsersList`.
- The template at `import-add-user.component.html` line 179-181 renders:
  ```
  Email Address: {{item?.email}}
  Message: {{item?.msg}}
  Status: {{item?.message}}   ← BUG: reads item.message not item.status
  ```

**Two bugs:**

1. **Template field name mismatch:** The template binds `item?.message` for the status row, but the BE response key is `item.status`. The Status field always renders empty/undefined. The recruiter sees "Failed to add user" as the Message but no Status value at all.

2. **Success toast fires even on partial failure:** `snackBar.open("Successfully added contact", ...)` fires whenever `invite.companyUserRes.emails.length > 0`, regardless of whether any entries have `status: "failed"`. If 5 emails are invited and all 5 fail, the recruiter sees a green "Successfully added contact" snackbar.

---

## 3. Login Flow PII Removal

The removed `console.log(endSubs)` and `console.log(nowMili)` were **debug-only** — neither fed into any user-facing response or conditional branch. The subscription expiry check (`new Date(subs[0].endAt) > new Date()`) was and still is a silent boolean: `isActive` is computed but **never used in the response** (line 82 uses `userCompany.withActiveSubscription` from the DB, not `isActive`). The cleanup is safe and correct. The `isActive` local variable is now dead code — it can be removed entirely in a future pass.

**User-facing impact:** None. The subscription check is redundant to `withActiveSubscription` from the DB join in `getUserCompany`.

---

## 4. Verification Email Flow

**`getVerificationLink`** (route handler, line 190-207): calls `sendEmailVerificationFirebase(email)`. If Firebase throws, the `catch` block returns `errorResponse("Operation not successful. Please try again.")` — generic, no mention of email verification. The removed `console.log(verify)` was debug-only.

**`getVerification`** (internal helper, line 487-503): No try/catch of its own. A Firebase failure throws `Error("Failed Verification")` which propagates to the calling route (`registerUser`, `resendVerification`). Those callers check `if (!isVerified)` for a falsy return but `getVerification` always throws rather than returning falsy — so the `!isVerified` branch (line 143-148 of registerUser) is **dead code**; the actual error path exits via the outer `catch`. The user sees "Registration failed. Please try again." — which correctly surfaces, but conflates a Firebase email error with a DB registration error.

**Silent failure risk:** If Firebase's `sendEmailVerification` resolves but the email is silently dropped (e.g., spam filter), there is no confirmation step or delivery status check. The user receives "Registration failed" if Firebase throws, but a silently-undelivered email shows the success path — user sees the registration success response but never receives the verification email.

---

## 5. PayMongo Webhook — Retry Risk

**PayMongo retry policy:** PayMongo retries failed webhooks on non-2xx responses using exponential backoff (up to 7 retries over ~24 hours per their documentation).

**Current BE behaviour:**
- Signature mismatch → `400` (PayMongo does **not** retry 4xx — correct)
- Unhandled `webhookEvent` type → falls through both `if/else if` blocks with no `return`, reaching the `catch` only if an error is thrown; otherwise falls out of the `try` with `undefined` returned (no response sent — **potential hang/timeout**)
- DB error during subscription activation → `catch` returns `500` — PayMongo **will retry** 5xx responses

**Retry loop risk (MEDIUM):** If `createCompanySubscription` fails (DB down, constraint violation), PayMongo retries up to 7 times. Each retry re-runs `insertTransactionTable` and `updateCart` before hitting the failing `createCompanySubscription`. `insertTransactionTable` has no upsert/idempotency guard — duplicate `id` inserts will throw a constraint error on retries, meaning retry #2+ will fail even faster. The subscription never activates.

**User-facing impact on webhook failure:** The user's PayMongo payment page shows "Payment Successful" (PayMongo controls that page). The GetHired UI has no polling mechanism for subscription status after checkout redirect — it relies entirely on the webhook having fired. If the webhook fails and all retries are exhausted, the user has paid but their account shows no active subscription. There is no email notification and no UI feedback path for this scenario. The user must contact support.

**Recommendation:** Add idempotency key on `insertTransactionTable` (upsert on `id`), and add a subscription-activation recovery endpoint or at minimum a payment-status polling endpoint the FE can call after returning from the PayMongo checkout URL.

---

## Summary Table

| Finding | Severity | Action |
|---|---|---|
| `item?.message` vs `item.status` in invite template | HIGH | Fix field name — Status column always blank |
| Success toast fires even on all-failed invites | HIGH | Check for at least one `status === "success"` before showing green toast |
| `isActive` local var is dead code in `loginUser` | LOW | Remove; `withActiveSubscription` from DB is used instead |
| Generic "Operation not successful" on 30+ paths | MEDIUM | Prioritise: verify email, payment intent, logout |
| Webhook 500 triggers PayMongo retry; no idempotency guard | HIGH | Upsert on transaction id; add subscription recovery path |
| No user feedback when payment webhook exhausts retries | HIGH | Add checkout-return polling or support escalation path |
| Silent verification email delivery failure | MEDIUM | Add explicit delivery failure message; distinguish Firebase error from silent drop |
