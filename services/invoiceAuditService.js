import dbQuery from "../db/dbQuery.js";

const logEvent = async (invoiceId, companyId, eventType, opts) => {
  try {
    const actorUid = (opts && opts.actorUid) || null;
    const eventSource = (opts && opts.eventSource) || "system";
    const metadata = (opts && opts.metadata) || null;
    const metaJson = metadata ? JSON.stringify(metadata) : null;

    await dbQuery.query(
      `INSERT INTO gethired.invoice_events
        (invoice_id, company_id, actor_uid, event_type, event_source, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [invoiceId, companyId, actorUid, eventType, eventSource, metaJson]
    );
  } catch (err) {
    // Audit failure must never crash the main flow
    console.error("[invoice_audit] Failed to log event:", eventType, err && err.message);
  }
};

const getEvents = async (invoiceId) => {
  const result = await dbQuery.query(
    `SELECT id, event_type, event_source, actor_uid, metadata_json, created_at
     FROM gethired.invoice_events
     WHERE invoice_id = $1
     ORDER BY created_at ASC`,
    [invoiceId]
  );
  return result.rows;
};

export default { logEvent, getEvents };
