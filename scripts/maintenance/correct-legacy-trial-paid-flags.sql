-- GetHired only. Owner confirmed no actual paid accounts, 2026-09-21.
-- Trial-only correction: Premium requires a separate access decision.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE gethired.companies_subscription, gethired.invoices, gethired.payment_webhook_events IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS gethired.subscription_data_corrections (
 correction_key text NOT NULL,
 subscription_row_id integer NOT NULL,
 reason text NOT NULL,
 before_row jsonb NOT NULL,
 after_row jsonb NOT NULL,
 corrected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(correction_key,subscription_row_id)
);
DO $$
DECLARE total integer; corrected integer;
BEGIN
 SELECT count(*) INTO corrected FROM gethired.subscription_data_corrections WHERE correction_key='20260921_unpaid_trials';
 IF corrected=15 THEN
  IF EXISTS(SELECT 1 FROM gethired.companies_subscription s JOIN gethired.subscription_data_corrections a ON a.subscription_row_id=s.id
    WHERE a.correction_key='20260921_unpaid_trials' AND (s.is_paid IS DISTINCT FROM FALSE OR s.payment_date IS NOT NULL)) THEN
   RAISE EXCEPTION 'Previously corrected records changed; manual review required';
  END IF;
  RETURN;
 END IF;
 IF corrected<>0 THEN RAISE EXCEPTION 'Partial prior correction; review required'; END IF;
 IF EXISTS(SELECT 1 FROM gethired.invoices) OR EXISTS(SELECT 1 FROM gethired.payment_webhook_events) THEN
  RAISE EXCEPTION 'Payment evidence changed; review required';
 END IF;
 SELECT count(*) INTO total FROM gethired.companies_subscription WHERE subscription_id=1 AND is_paid=TRUE;
 IF total<>15 THEN RAISE EXCEPTION 'Expected exactly 15 legacy paid trial flags'; END IF;
 IF EXISTS(SELECT 1 FROM gethired.companies_subscription WHERE subscription_id=1 AND is_paid=TRUE AND (COALESCE(amount_paid,0)<>0 OR provider_reference IS NOT NULL)) THEN
  RAISE EXCEPTION 'Trial payment evidence present; review required';
 END IF;
 INSERT INTO gethired.subscription_data_corrections(correction_key,subscription_row_id,reason,before_row,after_row)
 SELECT '20260921_unpaid_trials',id,'Owner confirmed no actual paid accounts; clear legacy trial payment defaults',to_jsonb(s),to_jsonb(s)||'{"is_paid":false,"payment_date":null}'::jsonb
 FROM gethired.companies_subscription s WHERE subscription_id=1 AND is_paid=TRUE;
 UPDATE gethired.companies_subscription s SET is_paid=FALSE,payment_date=NULL
 FROM gethired.subscription_data_corrections a WHERE a.correction_key='20260921_unpaid_trials' AND a.subscription_row_id=s.id;
 GET DIAGNOSTICS total=ROW_COUNT;
 IF total<>15 THEN RAISE EXCEPTION 'Unexpected correction count'; END IF;
END $$;
COMMIT;
