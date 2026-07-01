# GETHIRED SECURE QA CHECKLIST — V6
**Date:** 2026-07-01

Use this checklist before releasing LinkedIn OIDC to production.

---

## Pre-Deploy Security Checks

### LinkedIn OIDC Configuration
- [ ] `LINKEDIN_AUTH_ENABLED=true` set in production `.env`
- [ ] `LINKEDIN_CLIENT_ID` set in production `.env`
- [ ] `LINKEDIN_CLIENT_SECRET` set in production `.env` (never commit to git)
- [ ] `LINKEDIN_REDIRECT_URI` set and exactly matches LinkedIn Developer App callback URL
- [ ] `LINKEDIN_AUTHORIZATION_ENDPOINT` set (or using default)
- [ ] `LINKEDIN_TOKEN_ENDPOINT` set (or using default)
- [ ] `LINKEDIN_USERINFO_ENDPOINT` set (or using default)
- [ ] `APP_URL` set to `https://gethiredonline.app` in production `.env`

### LinkedIn OIDC Code Checks
- [ ] LI-SEC-001 fix applied (pending token stored in oauth_tickets)
- [ ] LI-SEC-003 fix applied (nonce check not doubly conditional)
- [ ] authLimiter applied to /complete, /choose-role, /start routes
- [ ] `linkedin-complete.component.html` uses `{{ errorMessage }}` (not innerHTML)

### Database Checks
- [ ] `auth_identities` table exists in production DB schema
- [ ] `oauth_tickets` table exists in production DB schema
- [ ] `UNIQUE(provider, provider_subject)` constraint on `auth_identities`
- [ ] oauth_tickets cleanup cron or pg_cron job scheduled

### Payment Webhook
- [ ] `PAYMONGO_WEBHOOK_SECRET` set in production `.env`
- [ ] `payment_webhook_events` table migrated (run `db/payment_webhook_events_ddl.sql`)
- [ ] rawBody middleware active for webhook route

### General Security
- [ ] Git history purged (Firebase SA key + SSH key removed)
- [ ] Firebase SA key rotated
- [ ] SSH key rotated
- [ ] CORS configured with explicit allowlist (not wildcard)
- [ ] Node.js version on production is 18+ LTS
- [ ] `npm audit --audit-level=high` passes with zero critical/high issues

### FE Checks
- [ ] `window.open` on company profile uses `noopener`
- [ ] LinkedIn button only sends GET redirect to /api/auth/linkedin/start (no credentials in URL)
- [ ] `/linkedin/complete` component handles `?error=` codes gracefully
- [ ] Role picker (choose-role) clears pending token after selection

### Functional Smoke Tests
- [ ] TC-LI-001: State forgery rejected
- [ ] TC-LI-003: Ticket single-use enforced
- [ ] TC-LI-005: Admin role cannot be created via LinkedIn
- [ ] TC-LI-006: Unlink own LinkedIn identity works
- [ ] TC-LI-007: Cannot unlink another user's identity
- [ ] TC-LI-011: returnTo open redirect sanitized
- [ ] TC-PM-002: Invalid webhook signature rejected
