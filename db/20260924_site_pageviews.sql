-- Site pageviews for the admin dashboard visits KPI.
-- Apply on Linode only after Paul authorises the admin screens release.
-- Runtime reads use env.schema (production: gethired). This file targets gethired.
--
-- Not stored: IP, user agent, uid, email, or query strings.
-- session_id is an opaque client UUID for a later uniques upgrade. v1 counts rows.
--
-- Retention follow-up (not applied here): delete rows with occurred_at older
-- than 90 days via cron or pg_cron.

BEGIN;

CREATE TABLE IF NOT EXISTS gethired.site_pageviews (
  id               BIGSERIAL PRIMARY KEY,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path             TEXT NOT NULL,
  referrer_host    TEXT,
  session_id       UUID,
  is_authenticated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS site_pageviews_occurred_at_idx
  ON gethired.site_pageviews (occurred_at);

CREATE INDEX IF NOT EXISTS site_pageviews_occurred_path_idx
  ON gethired.site_pageviews (occurred_at, path);

COMMIT;
