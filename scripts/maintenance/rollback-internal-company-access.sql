-- Run only as part of the documented rollback, before reverting the application.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE a gethired.internal_access_audit%ROWTYPE; s gethired.companies_subscription%ROWTYPE; c gethired.companies%ROWTYPE;
BEGIN
 SELECT * INTO a FROM gethired.internal_access_audit WHERE grant_key='20260921_owner_confirmed_internal' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Grant audit missing'; END IF;
 SELECT * INTO s FROM gethired.companies_subscription WHERE id=a.subscription_row_id FOR UPDATE;
 SELECT * INTO c FROM gethired.companies WHERE company_id=a.company_id FOR UPDATE;
 IF to_jsonb(s) IS DISTINCT FROM a.after_subscription OR to_jsonb(c) IS DISTINCT FROM a.after_company THEN RAISE EXCEPTION 'Account changed after grant; review before rollback'; END IF;
 UPDATE gethired.companies_subscription SET access_kind=a.before_subscription->>'access_kind',
 access_granted_by=a.before_subscription->>'access_granted_by',access_granted_at=(a.before_subscription->>'access_granted_at')::timestamptz,
 access_reason=a.before_subscription->>'access_reason',is_paid=(a.before_subscription->>'is_paid')::boolean,
 payment_date=(a.before_subscription->>'payment_date')::timestamp WHERE id=a.subscription_row_id;
 UPDATE gethired.companies SET account_usage=a.before_company->>'account_usage' WHERE company_id=a.company_id;
 -- Keep the audit trail. Re-grant requires explicit review after a rollback.
END $$;
COMMIT;
