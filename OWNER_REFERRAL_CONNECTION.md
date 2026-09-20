# Owner-configured GetHired connection

The deployment owner pins REFERRAL_BUNNY_OWNER_CONNECTION_ID and REFERRAL_BUNNY_OWNER_PROGRAM_ID to the designated Referral Bunny connection and program. The confidential POST /api/integrations/referral-bunny/owner-connect requires the existing server bearer secret and both exact identifiers. It accepts the event signing secret over HTTPS and stores it encrypted. No employer account can authorize a platform connection.

The resulting connected_by marker is owner-configured. Every capture, claim and status check revalidates the deployment pins. Removing or changing pins pauses access. Disconnect invalidates outstanding receipts; reconnect after disconnect creates a new generation. Repeating an active connection preserves its generation. Another active program cannot be overwritten. Owner setup never grants payment authorization.

Referral Bunny additionally pins GETHIRED_OWNER_CONNECTION_ID and retains active tenant owner/admin checks and CSRF protection. Its configured connection action completes directly without GetHired login. Other programs cannot use that action.

No frontend build, dependency installation or database migration is needed. Reload PM2 after backend/environment deployment, refresh Laravel caches and ensure web-readable file permissions. Keep financial flags off until verified billing prerequisites and explicit payment authorization are implemented.

Tests: tests/referral-bunny.test.cjs uses the existing isolated PGlite harness from the integration workspace (test-only dependency); 7 tests passed. Laravel GetHiredConnectorTest: 10 passed, 84 assertions; two unrelated existing PHP deprecations.
