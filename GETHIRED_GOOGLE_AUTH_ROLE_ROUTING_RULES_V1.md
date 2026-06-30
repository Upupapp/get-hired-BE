# GETHIRED_GOOGLE_AUTH_ROLE_ROUTING_RULES_V1

## Post-Auth Navigation Rules

Same rules as email/password login (GoogleAuthService.storeSession mirrors SigninComponent.loggedIn):

| Role ID | Condition | Navigate to |
|---|---|---|
| 1 (admin) | — | `/admin` |
| 2 (employer) | `withCompany && withActiveSubscription` | `/recruiter/dashboard` |
| 2 (employer) | `withCompany && !withActiveSubscription` | `/recruiter/subscription` |
| 2 (employer) | `!withCompany` | `/recruiter/company` |
| 3 (job seeker) | `returnURL` in localStorage | `returnURL` value |
| 3 (job seeker) | no `returnURL` | `/user/dashboard` |

Note: Admin (role=1) CANNOT be obtained via Google auth. Role 1 can never result from `chooseRole` or from `buildSessionResponse` for a Google-authenticated new user.

---

## New User Role → Route

After `chooseRole` and successful `buildSessionResponse`:

| selectedRole | roleId | Initial route |
|---|---|---|
| `'employer'` | 2 | `/recruiter/company` (no company yet → company setup) |
| `'job_seeker'` | 3 | `/user/dashboard` or `returnURL` |

---

## Role Classification Route

`/auth/choose-role` — mapped in `AuthModule` routes:
```ts
{ path: 'choose-role', component: RoleClassificationComponent }
```
No `UnauthGuard` — user has no GetHired session yet.

---

## Pending Intent Continuation After Role Selection

### AI Job Create Draft (employer)
1. `PublicJobPreviewService.savePendingToken(previewToken)` called before Google auth starts
2. Token survives in localStorage through auth flow
3. After role selection → navigate to `/recruiter/company` or `/recruiter/dashboard`
4. Employer dashboard / company setup reads `gh_preview_token` and claims the draft

### Job Apply (job seeker)
1. `localStorage.setItem('gh_pending_apply_job_id', jobId)` set at Apply gate
2. Survives through auth flow
3. After role selection → navigate to `/user/dashboard` or `returnURL`
4. `returnURL` may point directly to the job apply page

### CV Doctor
1. Per-service localStorage key preserved through auth
2. After auth → CV Doctor service reads key and resumes session
