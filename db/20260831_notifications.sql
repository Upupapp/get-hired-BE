-- In-app notification bell/center -- schema piece.
--
-- Backs a small notification system for the jobseeker (and, where the
-- same header component makes it free, employer) portal: a bell icon +
-- dropdown center. First real trigger is the applicant-shortlisted event
-- fired from services/application.service.js's updateApplicationStatus()
-- when newStatusId reaches the Shortlisted status (id 4).
--
-- recipient_uid is always the authenticated owner (never a client-supplied
-- id) -- every read/write route scopes on it server-side, same pattern as
-- message_threads.applicant_uid.
--
-- link_route/link_query carry a structured Angular Router deep link
-- (routerLink commands + query params) rather than a raw URL string, so
-- the frontend can navigate with the Router instead of window.location.
--
-- Additive, idempotent, safe on a live system.

CREATE TABLE IF NOT EXISTS gethired.notifications (
  id                     VARCHAR PRIMARY KEY,
  recipient_uid          VARCHAR NOT NULL,
  type                   VARCHAR NOT NULL,
  title                  VARCHAR NOT NULL,
  body                   VARCHAR NOT NULL,
  link_route             VARCHAR,
  link_query             JSONB,
  related_application_id VARCHAR,
  related_job_id         VARCHAR,
  is_read                BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON gethired.notifications(recipient_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON gethired.notifications(recipient_uid) WHERE is_read = false;

-- Idempotency guard: mirrors the event_key precedent in
-- application_notification_events, so a status-change handler that fires
-- twice for the same application+status transition cannot double-notify
-- the applicant. Nullable so other notification types (not yet defined)
-- aren't forced to supply one.
ALTER TABLE gethired.notifications
  ADD COLUMN IF NOT EXISTS event_key VARCHAR;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_key
  ON gethired.notifications(event_key) WHERE event_key IS NOT NULL;
