-- Apply after payment and refund migrations, with application schema search_path.
ALTER TABLE referral_bunny_payments ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;
ALTER TABLE referral_bunny_payments ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
ALTER TABLE referral_bunny_refunds ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;
ALTER TABLE referral_bunny_refunds ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
CREATE INDEX IF NOT EXISTS rb_payment_retry_due ON referral_bunny_payments(connection_id,next_attempt_at) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS rb_refund_retry_due ON referral_bunny_refunds(connection_id,next_attempt_at) WHERE status IN ('pending','failed');
