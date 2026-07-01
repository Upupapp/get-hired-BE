// Run with: node -r esm scripts/createAuthIdentitiesTable.js
// Creates auth_identities and oauth_tickets tables for LinkedIn OIDC (and future social providers).

import dbQuery from '../db/dbQuery';
import env from '../env';

const schema = env.schema;

async function run() {
  console.log('Creating auth tables in schema:', schema);

  await dbQuery.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.auth_identities (
      id                   SERIAL PRIMARY KEY,
      user_uid             VARCHAR(255) NOT NULL REFERENCES ${schema}.user_credentials(uid) ON DELETE CASCADE,
      provider             VARCHAR(50)  NOT NULL,
      provider_subject     VARCHAR(255) NOT NULL,
      provider_email       VARCHAR(320),
      provider_email_verified BOOLEAN  DEFAULT FALSE,
      provider_name        TEXT,
      provider_picture     TEXT,
      provider_locale      VARCHAR(64),
      raw_profile          JSONB,
      linked_at            TIMESTAMPTZ  DEFAULT NOW(),
      last_login_at        TIMESTAMPTZ,
      unlinked_at          TIMESTAMPTZ,
      created_at           TIMESTAMPTZ  DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  DEFAULT NOW(),
      UNIQUE(provider, provider_subject)
    );
  `, []);
  console.log('auth_identities: OK');

  await dbQuery.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.oauth_tickets (
      jti        VARCHAR(64)  PRIMARY KEY,
      uid        VARCHAR(255) NOT NULL,
      data       JSONB        NOT NULL,
      expires_at TIMESTAMPTZ  NOT NULL,
      used_at    TIMESTAMPTZ
    );
  `, []);
  console.log('oauth_tickets: OK');

  // Clean up expired tickets every hour (if run as a long-lived process; harmless here).
  await dbQuery.query(`
    DELETE FROM ${schema}.oauth_tickets WHERE expires_at < NOW() - INTERVAL '1 hour';
  `, []);
  console.log('oauth_tickets stale rows cleared');

  console.log('Done.');
  process.exit(0);
}

run().catch(function(err) {
  console.error('Migration error:', err.message);
  process.exit(1);
});
