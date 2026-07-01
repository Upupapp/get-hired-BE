# GETHIRED TEST COVERAGE MATRIX V6
**Date:** 2026-07-01 | Updated from V5 to add LinkedIn OIDC, modal, and sign-out

---

## Coverage Legend
- AUTO: Automated test exists and passes
- MANUAL: Covered by manual QA only
- ZERO: No test of any kind
- FIXED: Code fix confirmed by static analysis; no regression test yet

---

## BE Coverage

| Feature / Flow | File(s) | Coverage | Notes |
|---|---|---|---|
| **Email+Password auth** | authController.js | MANUAL | Unchanged from V5 |
| **Google firebase-session** | googleAuthController.js | ZERO | V5 gap, unchanged |
| **Google choose-role** | googleAuthController.js | ZERO | V5 gap, unchanged |
| **LinkedIn /start** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /callback — valid existing user** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /callback — new user intent** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /callback — role_required** | linkedinAuthController.js | ZERO | New V6; Finding #3 affects downstream |
| **LinkedIn /callback — state JWT validation** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /callback — ID token soft checks** | linkedinAuthController.js | ZERO | Finding #1: sig not verified |
| **LinkedIn /complete — authenticated** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /complete — role_required** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /complete — ticket replay** | linkedinAuthController.js | ZERO | CRITICAL security gap |
| **LinkedIn /choose-role — jobseeker** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /choose-role — employer** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /choose-role — race/retry** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /choose-role — empty email (Finding #3)** | linkedinAuthController.js | ZERO | BUG — no test to catch it |
| **LinkedIn /unlink** | linkedinAuthController.js | ZERO | New V6 |
| **LinkedIn /link-status** | linkedinAuthController.js | ZERO | New V6 |
| **createLinkedinState** | middleware/linkedinSession.js | ZERO | New V6 |
| **verifyLinkedinState** | middleware/linkedinSession.js | ZERO | New V6 |
| **makeTicketJwt** | middleware/linkedinSession.js | ZERO | New V6 |
| **decodeTicketJwt** | middleware/linkedinSession.js | ZERO | New V6 |
| **getJobCertificationRequirements — strips id/canonicalKey** | services/job.service.js | FIXED | Static confirmed; no regression test |
| **getJobCertificationRequirements — table-not-exist fallback** | services/job.service.js | ZERO | |
| **mappedJob() — includes certificationRequirements** | services/job.service.js | ZERO | |
| **PayMongo webhook sig verification** | webhookController.js | ZERO | V5 gap, unchanged |
| **AI Job Preview claim** | publicJobPreviewController.js | ZERO | V5 gap |
| **Job CRUD (create/update/delete)** | jobsController.js | MANUAL | |
| **Company CRUD** | companiesController.js | MANUAL | |
| **Subscription lifecycle** | subscriptionController.js | MANUAL | |
| **Rate limiting (globalLimiter etc.)** | server.js | MANUAL | |
| **CORS config** | server.js | MANUAL | |

---

## FE Coverage

| Feature / Flow | File(s) | Coverage | Notes |
|---|---|---|---|
| **LinkedIn startLinkedInFlow** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn exchangeTicket** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn handleCompleteResponse — authenticated** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn handleCompleteResponse — role_required** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn handleCompleteResponse — error** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn storeSession — role=2 no company** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn storeSession — role=2 with company + sub** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn storeSession — role=3** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn submitRoleSelection — throws if no token** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn clearPendingRoleState** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn unlinkLinkedIn** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedIn getLinkStatus** | linkedin-auth.service.ts | ZERO | New V6 |
| **LinkedInCompleteComponent — error param** | linkedin-complete.component.ts | ZERO | New V6 |
| **LinkedInCompleteComponent — no ticket** | linkedin-complete.component.ts | ZERO | New V6 |
| **LinkedInCompleteComponent — valid ticket → navigate** | linkedin-complete.component.ts | ZERO | New V6 |
| **RoleClassificationComponent — LinkedIn branch** | role-classification.component.ts | ZERO | New V6 |
| **RoleClassificationComponent — no pending → /signin** | role-classification.component.ts | ZERO | New V6 |
| **RoleClassificationComponent — submit 401** | role-classification.component.ts | ZERO | New V6 |
| **SetupSuccessModal — ngOnInit reads data** | employer-company-setup-success-modal.component.ts | ZERO | New V6 |
| **SetupSuccessModal — sessionStorage write** | employer-company-setup-success-modal.component.ts | ZERO | New V6 |
| **SetupSuccessModal — postFirstJob CTA** | employer-company-setup-success-modal.component.ts | ZERO | New V6 |
| **SetupSuccessModal — completeProfile CTA** | employer-company-setup-success-modal.component.ts | ZERO | New V6 |
| **SetupSuccessModal — viewPublicProfile CTA** | employer-company-setup-success-modal.component.ts | ZERO | New V6 (window.open) |
| **SetupSuccessModal — goToDashboard CTA** | employer-company-setup-success-modal.component.ts | ZERO | New V6 |
| **EmployerSettingsComponent.dialogSuccess() — opens modal** | employer-settings.component.ts | ZERO | New V6 |
| **EmployerPanelComponent.logout() → /signin** | employer-panel.component.ts | ZERO | New V6 |
| **Google sign-in button** | google-signin-button.component.ts | ZERO | V5 gap, unchanged |
| **Google handleGoogleSessionResponse** | google-auth.service.ts | ZERO | V5 gap, unchanged |
| **Email signin form** | signin.component.ts | MANUAL | |
| **Email signup form** | signup.component.ts | MANUAL | |
| **Job creation form** | job-create.component.ts | MANUAL | |
| **UpdatedDialogComponent** | updated-dialog.component.spec.ts | AUTO (shell) | Boilerplate spec only — no assertions |

---

## Overall Coverage Totals

| Category | Total Test Cases | Automated | Manual | Zero |
|---|---|---|---|---|
| LinkedIn BE endpoints (6) | ~35 | 0 | 0 | 35 |
| LinkedIn FE service + components | ~20 | 0 | 0 | 20 |
| Company setup modal | 9 | 0 | 0 | 9 |
| Sign-out fix | 2 | 0 | 0 | 2 |
| Cert API fix | 4 | 0 | 4 (manual) | 0 |
| Existing flows (Google, email, jobs) | ~30 | 0 | 30 | 0 |
| **TOTAL** | **~100** | **0** | **~34** | **~66** |

**Automated test coverage of new V6 code: 0%**

---

## Coverage Gaps by Risk

| Risk | Gap |
|---|---|
| CRITICAL | LinkedIn ticket replay — no test; only runtime DB UPDATE behavior prevents it |
| CRITICAL | LinkedIn role_required → choose-role data handoff — broken (Finding #3), no test to catch |
| CRITICAL | LinkedIn /callback ID token signature not verified — no test validates mitigation |
| HIGH | LinkedIn unlink auth gate — no test |
| HIGH | Company setup modal CTA navigation — no test |
| MEDIUM | Sign-out → /signin navigation — no test |
| LOW | Cert API strip — confirmed by static read; no automated regression |
