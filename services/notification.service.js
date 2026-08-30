import dbQuery from "../db/dbQuery";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";

const dbSchema = env.schema;

/**
 * In-app notification bell/center backend.
 *
 * Authorization model mirrors message.service.js's listApplicantThreads():
 * every read/write is scoped to `recipient_uid = callerUid`, derived
 * server-side from req.user.uid -- never from a client-supplied id. A
 * caller trying to touch another user's notification by id gets an empty
 * result / 0 rows affected, never a leak, never a 500.
 */

const DEFAULT_LIST_LIMIT = 50;

const listNotifications = async (callerUid, limit = DEFAULT_LIST_LIMIT) => {
  const { rows } = await dbQuery.query(
    `SELECT id, type, title, body, link_route, link_query,
            related_application_id, related_job_id, is_read, created_at
     FROM ${dbSchema}.notifications
     WHERE recipient_uid = $1
     ORDER BY created_at DESC
     LIMIT $2;`,
    [callerUid, limit]
  );

  const { rows: countRows } = await dbQuery.query(
    `SELECT COUNT(*)::int AS unread_count
     FROM ${dbSchema}.notifications
     WHERE recipient_uid = $1 AND is_read = false;`,
    [callerUid]
  );

  return {
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      linkRoute: row.link_route,
      linkQuery: row.link_query || null,
      relatedApplicationId: row.related_application_id,
      relatedJobId: row.related_job_id,
      isRead: row.is_read,
      createdAt: row.created_at,
    })),
    unreadCount: countRows[0] ? countRows[0].unread_count : 0,
  };
};

const markNotificationRead = async (notificationId, callerUid) => {
  const { rows } = await dbQuery.query(
    `UPDATE ${dbSchema}.notifications
     SET is_read = true
     WHERE id = $1 AND recipient_uid = $2
     RETURNING id;`,
    [notificationId, callerUid]
  );
  // Not found / not owned by caller -- treated identically (no leak of
  // whether the id exists for someone else).
  return rows.length > 0;
};

const markAllNotificationsRead = async (callerUid) => {
  const { rowCount } = await dbQuery.query(
    `UPDATE ${dbSchema}.notifications
     SET is_read = true
     WHERE recipient_uid = $1 AND is_read = false;`,
    [callerUid]
  );
  return rowCount;
};

/**
 * Creates a notification for recipientUid. Non-blocking by contract of
 * its callers (they .catch() this) -- never throws upward into a request
 * flow that must otherwise succeed.
 *
 * eventKey, when supplied, is a unique idempotency key (mirrors the
 * `application:{id}:email:status_change:{old}->{new}` precedent in
 * application_notification_events) so a status-change handler firing
 * twice can't create a duplicate row. A unique partial index on
 * event_key enforces this at the DB level; a conflict here is treated as
 * "already notified", not an error.
 */
const createNotification = async ({
  recipientUid,
  type,
  title,
  body,
  linkRoute = null,
  linkQuery = null,
  relatedApplicationId = null,
  relatedJobId = null,
  eventKey = null,
}) => {
  const notificationId = idGenerator(8, "NOTIF");
  try {
    const { rows } = await dbQuery.query(
      `INSERT INTO ${dbSchema}.notifications
        (id, recipient_uid, type, title, body, link_route, link_query,
         related_application_id, related_job_id, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
       RETURNING *;`,
      [
        notificationId,
        recipientUid,
        type,
        title,
        body,
        linkRoute,
        linkQuery ? JSON.stringify(linkQuery) : null,
        relatedApplicationId,
        relatedJobId,
        eventKey,
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("[notification] createNotification failed (non-blocking):",
      err && err.message ? err.message.substring(0, 200) : "unknown");
    return null;
  }
};

export {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
};
