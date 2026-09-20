-- Apply once to GetHired's configured schema before enabling the connector.
-- Run with the deployment's search_path; no destructive changes or billing dependencies.
CREATE TABLE IF NOT EXISTS referral_bunny_requests (
 id varchar(64) PRIMARY KEY, connection_id varchar(100) NOT NULL, program_id varchar(100) NOT NULL,
 payment_scope boolean NOT NULL DEFAULT FALSE, program_name varchar(200) NOT NULL, business_name varchar(200) NOT NULL,
 state varchar(128) NOT NULL, challenge varchar(64) NOT NULL, callback_path varchar(500) NOT NULL,
 expires_at timestamptz NOT NULL, approved_by varchar(128), code_hash varchar(64),
 exchanged_at timestamptz, denied_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS referral_bunny_platform (
 id integer PRIMARY KEY CHECK (id=1), connection_id varchar(100), program_id varchar(100),
 request_id varchar(64), secret_cipher text, generation varchar(64),
 payments_authorized boolean NOT NULL DEFAULT FALSE, connected_by varchar(128), connected_at timestamptz, disconnected_at timestamptz
);
INSERT INTO referral_bunny_platform(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS referral_bunny_attributions (
 uid varchar(128) PRIMARY KEY, connection_id varchar(100) NOT NULL, program_id varchar(100) NOT NULL,
 membership_id varchar(100) NOT NULL, referred_at timestamptz NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT NOW()
);
