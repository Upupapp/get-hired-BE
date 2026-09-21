-- Additive only. Does not grant access or change any account.
BEGIN;
ALTER TABLE gethired.companies_subscription
 ADD COLUMN IF NOT EXISTS access_kind text NOT NULL DEFAULT 'standard',
 ADD COLUMN IF NOT EXISTS access_granted_by text,
 ADD COLUMN IF NOT EXISTS access_granted_at timestamptz,
 ADD COLUMN IF NOT EXISTS access_reason text;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='gethired.companies_subscription'::regclass AND conname='subscription_access_kind_check') THEN
  ALTER TABLE gethired.companies_subscription ADD CONSTRAINT subscription_access_kind_check CHECK (
   access_kind='standard' OR (
    access_kind='internal_complimentary' AND subscription_id>1 AND subscription_id IS NOT NULL
    AND is_paid IS FALSE AND payment_date IS NULL AND COALESCE(amount_paid,0)=0 AND provider_reference IS NULL
    AND access_granted_by IS NOT NULL AND length(trim(access_granted_by))>0
    AND access_granted_at IS NOT NULL AND access_reason IS NOT NULL AND length(trim(access_reason))>0
   )
  );
 END IF;
END $$;
COMMIT;
