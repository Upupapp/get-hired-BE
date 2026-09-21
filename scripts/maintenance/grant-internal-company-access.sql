-- Explicitly authorized internal company, 2026-09-21. Never a customer-payment conversion.
-- Apply db/internal_complimentary_access_migration.sql first. Fails closed if evidence changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE gethired.companies_subscription,gethired.companies,gethired.invoices,gethired.payment_webhook_events IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS gethired.internal_access_audit (
 grant_key text PRIMARY KEY,
 company_id text NOT NULL,
 subscription_row_id integer NOT NULL,
 operator text NOT NULL,
 reason text NOT NULL,
 before_subscription jsonb NOT NULL,
 after_subscription jsonb NOT NULL,
 before_company jsonb NOT NULL,
 after_company jsonb NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE s gethired.companies_subscription%ROWTYPE; c gethired.companies%ROWTYPE; prior gethired.internal_access_audit%ROWTYPE;
BEGIN
 SELECT * INTO s FROM gethired.companies_subscription WHERE id=6 AND company_id='COM-26-612469' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expected internal subscription not found'; END IF;
 SELECT * INTO c FROM gethired.companies WHERE company_id=s.company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expected internal company not found'; END IF;
 SELECT * INTO prior FROM gethired.internal_access_audit WHERE grant_key='20260921_owner_confirmed_internal';
 IF FOUND THEN
  IF to_jsonb(s) IS DISTINCT FROM prior.after_subscription OR to_jsonb(c) IS DISTINCT FROM prior.after_company THEN
   RAISE EXCEPTION 'Previously granted account changed; review required';
  END IF;
  RETURN;
 END IF;
 IF s.subscription_id<>4 OR s.subscription_id IS NULL OR s.access_kind<>'standard' OR c.account_usage<>'customer'
   OR COALESCE(s.amount_paid,0)<>0 OR s.provider_reference IS NOT NULL THEN
  RAISE EXCEPTION 'Internal account preconditions changed';
 END IF;
 IF EXISTS(SELECT 1 FROM gethired.invoices WHERE company_id=s.company_id)
   OR EXISTS(SELECT 1 FROM gethired.payment_webhook_events)
   OR EXISTS(SELECT 1 FROM gethired.referral_bunny_attributions WHERE uid=c.created_by)
   OR EXISTS(SELECT 1 FROM gethired.referral_bunny_payments WHERE company_id=s.company_id) THEN
  RAISE EXCEPTION 'Payment or referral evidence requires review';
 END IF;
 UPDATE gethired.companies_subscription SET access_kind='internal_complimentary',is_paid=FALSE,payment_date=NULL,
   access_granted_by='owner-authorized Codex rollout 2026-09-21',access_granted_at=NOW(),access_reason='Owner confirmed internal company usage; no customer payment or referral reward'
   WHERE id=s.id;
 UPDATE gethired.companies SET account_usage='internal' WHERE company_id=c.company_id;
 INSERT INTO gethired.internal_access_audit(grant_key,company_id,subscription_row_id,operator,reason,before_subscription,after_subscription,before_company,after_company)
 SELECT '20260921_owner_confirmed_internal',s.company_id,s.id,'owner-authorized Codex rollout 2026-09-21',
 'Owner confirmed internal company usage; retain Premium limits without payment, renewal or referral rewards',
 to_jsonb(s),to_jsonb(updated_s),to_jsonb(c),to_jsonb(updated_c)
 FROM gethired.companies_subscription updated_s JOIN gethired.companies updated_c ON updated_c.company_id=updated_s.company_id WHERE updated_s.id=s.id;
END $$;
COMMIT;
