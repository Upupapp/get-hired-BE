-- Apply after retry migration, with the configured application schema search_path.
CREATE TABLE IF NOT EXISTS referral_bunny_review_actions (
 id bigserial PRIMARY KEY, connection_id varchar(100) NOT NULL,
 event_kind varchar(10) NOT NULL, delivery_id varchar(64) NOT NULL,
 actor_id varchar(128) NOT NULL, note varchar(500) NOT NULL,
 previous_status varchar(20) NOT NULL, previous_reason varchar(80),
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rb_review_history ON referral_bunny_review_actions(connection_id,created_at);
