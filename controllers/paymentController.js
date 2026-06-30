import crypto from "crypto";
import { successResponse, errorResponse, status } from "../helpers/status";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

import { createCompanySubscription } from "./subscriptionController";
import { activateSubscriptionLifecycle } from "../services/subscriptionLifecycleServiceV4";
import { notifyPaymentSuccess, notifyPaymentFailed } from "../services/subscriptionNotificationServiceV4";
import { getPlanByDbId } from "../services/planCatalogServiceV4";
import invoiceService from "../services/invoiceService.js";

const axios = require("axios").default;
const token = `${env.paymongo_sk}:''`;
const encodedToken = Buffer.from(token).toString("base64");

const createPaymongoLink = async (cartId, itemDesc, amount) => {
  const reqAmount = amount * 100;

  try {
    const options = {
      method: "POST",
      url: "https://api.paymongo.com/v1/links",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedToken}`,
      },
      data: {
        data: {
          attributes: {
            amount: reqAmount,
            description: itemDesc,
            remarks: "GetHired-" + cartId,
          },
        },
      },
    };

    const paymentLink = await axios.request(options);
    const { data } = paymentLink.data;
    return data;
  } catch (error) {
    throw error;
  }
};

const paymongoPaymentLink = async (req, res) => {
  const { cartId, itemDesc, amount } = req.body;

  try {
    const link = await createPaymongoLink(cartId, itemDesc, amount);
    return res.status(status.success).json(successResponse(link));
  } catch (error) {
    console.error('[paymentController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const verifyPaymongoSignature = (req) => {
  const secret = env.paymongo_webhook_secret;
  if (!secret) return false;

  const sigHeader = req.headers["paymongo-signature"];
  if (!sigHeader) return false;

  const parts = {};
  sigHeader.split(",").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq > -1) parts[part.slice(0, eq)] = part.slice(eq + 1);
  });

  const timestamp = parts.t;
  if (!timestamp) return false;

  // Reject replayed requests older than 5 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 300) return false;

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const sig = parts.li || parts.te; // live sig preferred; fall back to test
  if (!sig) return false;

  try {
    const a = Buffer.from(sig.padEnd(expected.length, "0"), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// NOTIFY-P1: Webhook event ledger — idempotency gate
// These functions use the payment_webhook_events table to deduplicate by
// PayMongo event ID. They degrade gracefully if the table hasn't been migrated
// yet (PostgreSQL error 42P01 = undefined_table) — in that case the
// insertTransactionTable ON CONFLICT fix below is the safety net.
// Apply db/payment_webhook_events_ddl.sql to enable full event-ID deduplication.
// ---------------------------------------------------------------------------

const claimWebhookEvent = async (eventId, eventType, providerObjectId) => {
  const query = `
    INSERT INTO ${dbSchema}.payment_webhook_events
      (provider, event_id, event_type, provider_object_id, status,
       received_at, created_at, updated_at)
    VALUES ('paymongo', $1, $2, $3, 'processing', NOW(), NOW(), NOW())
    ON CONFLICT (provider, event_id) DO NOTHING
    RETURNING id`;
  const { rows } = await dbQuery.query(query, [
    eventId,
    eventType || null,
    providerObjectId || null,
  ]);
  return { claimed: rows && rows.length > 0 };
};

const markWebhookEventProcessed = async (eventId, localTransactionId) => {
  const query = `
    UPDATE ${dbSchema}.payment_webhook_events
    SET status = 'processed',
        processed_at = NOW(),
        local_transaction_id = $2,
        updated_at = NOW()
    WHERE provider = 'paymongo' AND event_id = $1`;
  await dbQuery.query(query, [eventId, localTransactionId || null]);
};

const markWebhookEventFailed = async (eventId, errorMsg) => {
  const redacted = errorMsg ? String(errorMsg).substring(0, 300) : null;
  const query = `
    UPDATE ${dbSchema}.payment_webhook_events
    SET status = 'failed',
        last_error_message = $2,
        updated_at = NOW(),
        internal_attempt_count = COALESCE(internal_attempt_count, 0) + 1
    WHERE provider = 'paymongo' AND event_id = $1`;
  await dbQuery.query(query, [eventId, redacted]);
};

// Try to claim an event in the ledger. Returns:
//   { claimed: true }  — first delivery, safe to process
//   { claimed: false } — already in ledger, duplicate
//   null               — ledger table not yet present, proceed without it
const tryClaimEvent = async (eventId, eventType, providerObjectId) => {
  if (!eventId) return null;
  try {
    return await claimWebhookEvent(eventId, eventType, providerObjectId);
  } catch (err) {
    if (err.code === '42P01') {
      // payment_webhook_events table not yet migrated — non-blocking
      console.warn('[paymentController] payment_webhook_events table not migrated — run db/payment_webhook_events_ddl.sql for full event-ID idempotency. ON CONFLICT safety net is active.');
    } else {
      console.warn('[paymentController] Webhook event ledger error (non-blocking):', err.code, err.message && err.message.substring(0, 80));
    }
    return null;
  }
};

const tryMarkProcessed = async (eventId, localTransactionId) => {
  if (!eventId) return;
  try {
    await markWebhookEventProcessed(eventId, localTransactionId);
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[paymentController] Could not mark event processed:', err.code);
    }
  }
};

const tryMarkFailed = async (eventId, errorMsg) => {
  if (!eventId) return;
  try {
    await markWebhookEventFailed(eventId, errorMsg);
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[paymentController] Could not mark event failed:', err.code);
    }
  }
};

// ---------------------------------------------------------------------------
// NOTIFY-P1: insertTransactionTable — now idempotent
// ON CONFLICT (id) DO NOTHING: if the same payment link ID is inserted again
// (PayMongo webhook retry), the existing row is returned with duplicate:true
// instead of throwing PostgreSQL error 23505 (duplicate key violation).
// ---------------------------------------------------------------------------

const insertTransactionTable = async (id, checkout_url, reference_number) => {
  const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    RETURNING *`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      id,
      checkout_url,
      reference_number,
    ]);

    if (rows && rows.length > 0) {
      return { transaction: rows[0], inserted: true, duplicate: false };
    }

    // ON CONFLICT DO NOTHING returned no rows — this id already exists.
    // Fetch and return the existing row so callers can inspect it.
    const sel = await dbQuery.query(
      `SELECT * FROM ${dbSchema}.transaction_table WHERE id = $1`,
      [id]
    );
    return {
      transaction: sel.rows && sel.rows.length > 0 ? sel.rows[0] : null,
      inserted: false,
      duplicate: true,
    };
  } catch (error) {
    throw error;
  }
};

// ---------------------------------------------------------------------------
// NOTIFY-P1: paymongoWebhook — idempotent webhook handler
// ---------------------------------------------------------------------------

const paymongoWebhook = async (req, res) => {
  // Step 1: Verify signature before any DB mutation or payload trust.
  if (!verifyPaymongoSignature(req)) {
    console.warn("[paymentController] PAYMONGO_WEBHOOK_SIGNATURE_INVALID — rejected");
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const { data } = req.body;

  // Validate minimal payload shape before proceeding.
  if (!data || !data.attributes) {
    console.warn('[paymentController] PAYMONGO_WEBHOOK_MALFORMED — missing data.attributes');
    return res.status(400).json({ message: "Malformed webhook payload" });
  }

  // PayMongo event ID is at req.body.data.id (the event envelope, not the payment object).
  // This is the primary dedupe key for the event ledger.
  const eventId = data.id;
  const webhookEvent = data.attributes.type;

  // Provider object ID (payment link / payment) for the ledger.
  const providerObjectId = data.attributes.data && data.attributes.data.id;

  if (!webhookEvent) {
    console.warn('[paymentController] PAYMONGO_WEBHOOK_MALFORMED — missing event type');
    return res.status(400).json({ message: "Malformed webhook payload" });
  }

  console.log('[paymentController] PAYMONGO_WEBHOOK_RECEIVED type=' + webhookEvent
    + ' objectId=' + (providerObjectId ? providerObjectId.substring(0, 14) + '...' : 'none'));

  // Step 2: Claim event in ledger (idempotency gate).
  // If the exact event ID was already processed, return 2xx duplicate immediately.
  const ledgerClaim = await tryClaimEvent(eventId, webhookEvent, providerObjectId);
  if (ledgerClaim && !ledgerClaim.claimed) {
    console.log('[paymentController] PAYMONGO_WEBHOOK_DUPLICATE_IGNORED eventId=[REDACTED]');
    return res.status(200).json({
      received: true,
      provider: 'paymongo',
      status: 'duplicate_ignored',
    });
  }

  try {
    // -----------------------------------------------------------------------
    // Case: link.payment.paid — PayMongo payment link paid
    // -----------------------------------------------------------------------
    if (webhookEvent == "link.payment.paid") {
      const webHookUrl = data.attributes.data;
      const { id, attributes } = webHookUrl;
      // Renamed 'status' to 'paymentStatus' to avoid shadowing the imported helper
      const { checkout_url, reference_number, remarks, status: paymentStatus } = attributes;

      // NOTIFY-P1 CORE FIX: insertTransactionTable is now idempotent.
      // Duplicate webhook delivery returns existing row with { duplicate: true }.
      const insertResult = await insertTransactionTable(id, checkout_url, reference_number);

      if (insertResult.duplicate) {
        // Transaction row already exists from a prior successful delivery.
        // Cart and subscription were already activated — skip all side effects.
        console.log('[paymentController] PAYMONGO_TRANSACTION_UPSERT_DUPLICATE id=[REDACTED]');
        await tryMarkProcessed(eventId, id);
        return res.status(200).json({
          received: true,
          provider: 'paymongo',
          status: 'duplicate_ignored',
        });
      }

      console.log('[paymentController] PAYMONGO_TRANSACTION_UPSERT_INSERTED');

      const cartId = remarks.slice(9);
      await updateCart(paymentStatus, id, cartId);

      if (paymentStatus == "paid") {
        const { payments } = data.attributes.data.attributes;
        const {
          amount,
          billing,
          currency,
          description,
          external_reference_number,
          fee,
          net_amount,
          source,
        } = payments[0].data.attributes;

        const { email, name, phone } = billing;
        const { type } = source;

        const updateQuery = `UPDATE ${dbSchema}.transaction_table
        SET gross_amount=$1, transaction_fee=$2, currency=$3, description=$4, status=$5, payment_id=$6, net_amount=$7, email=$8, name=$9, phone=$10, payment_type=$11, paid_at=$12
        WHERE reference_number=$13 returning *;`;

        await dbQuery.query(updateQuery, [
          amount / 100,
          fee / 100,
          currency,
          description,
          paymentStatus,
          id,
          net_amount / 100,
          email,
          name,
          phone,
          type,
          new Date(),
          external_reference_number,
        ]);

        const companyId = remarks.slice(0, 13);
        const subscriptionId = remarks.slice(14);

        // createCompanySubscription is now idempotent (see subscriptionController.js)
        await createCompanySubscription(companyId, subscriptionId);
        console.log('[paymentController] PAYMONGO_SUBSCRIPTION_STATE_TRANSITIONED companyId=[REDACTED]');

        // V4 Lifecycle: look up billing_cycle from cart_table, then activate period dates
        var cartBillingCycle = 'monthly';
        try {
          var cartRow = await dbQuery.query(
            'SELECT billing_cycle FROM ' + dbSchema + '.cart_table WHERE cart_id = $1 LIMIT 1',
            [cartId]
          );
          if (cartRow.rows && cartRow.rows.length > 0 && cartRow.rows[0].billing_cycle) {
            cartBillingCycle = cartRow.rows[0].billing_cycle;
          }
        } catch (cartLookupErr) {
          console.warn('[paymentController] cart billing_cycle lookup non-blocking error:', cartLookupErr && cartLookupErr.code);
        }

        var subDbId = parseInt(subscriptionId, 10);
        var planInfo = getPlanByDbId ? getPlanByDbId(subDbId) : null;
        var planSlug = planInfo ? planInfo.slug : null;
        var amountPaidPhp = amount ? amount / 100 : null;

        // Non-blocking lifecycle activation — never throws
        activateSubscriptionLifecycle({
          companyId: companyId,
          subscriptionId: subDbId,
          billingCycle: cartBillingCycle,
          amountPaid: amountPaidPhp,
          providerReference: id,
          planSlug: planSlug,
        }).catch(function(lifecycleErr) {
          console.warn('[paymentController] activateSubscriptionLifecycle non-blocking error:', lifecycleErr && lifecycleErr.code);
        });

        // Non-blocking payment success notification
        notifyPaymentSuccess({
          companyId: companyId,
          subscriptionId: subDbId,
          billingCycle: cartBillingCycle,
          planSlug: planSlug,
          planName: planInfo ? planInfo.name : '',
          amountPaid: amountPaidPhp,
        }).catch(function(notifErr) {
          console.warn('[paymentController] notifyPaymentSuccess non-blocking error:', notifErr && notifErr.code);
        });

        // Non-blocking invoice creation — idempotent on transactionId
        var paymentMethodLabel = type === 'gcash' ? 'GCash (PayMongo)' : type === 'card' ? 'Credit/Debit Card (PayMongo)' : 'PayMongo';
        invoiceService.createFromPayment({
          companyId: companyId,
          subscriptionId: subDbId,
          cartId: cartId,
          transactionId: id,
          planName: planInfo ? planInfo.name : 'GetHired Subscription',
          planSlug: planSlug,
          billingCycle: cartBillingCycle,
          amount: amountPaidPhp,
          currency: currency || 'PHP',
          customerEmail: email || null,
          customerName: name || null,
          paidAt: new Date(),
          paymentReference: external_reference_number || null,
          paymentMethodLabel: paymentMethodLabel,
          periodStart: null,
          periodEnd: null,
        }).then(function(invoiceResult) {
          if (invoiceResult && invoiceResult.created) {
            console.log('[paymentController] INVOICE_CREATED invoice=[REDACTED]');
          }
        }).catch(function(invoiceErr) {
          console.warn('[paymentController] invoice creation non-blocking error:', invoiceErr && invoiceErr.message);
        });
      }

      await tryMarkProcessed(eventId, id);
      return res.status(200).json({ received: true, provider: 'paymongo', status: 'processed' });

    // -----------------------------------------------------------------------
    // Case: payment.paid — PayMongo direct payment paid
    // The UPDATE on transaction_table is idempotent — safe on duplicate delivery.
    // -----------------------------------------------------------------------
    } else if (webhookEvent == "payment.paid") {
      // QA11 FIX-03 LOGGING: log only redacted id, not full payload or billing PII.
      const webHookPaid = data.attributes.data;
      const { id, attributes } = webHookPaid;
      const {
        amount,
        currency,
        description,
        status: paymentStatus,
        fee,
        external_reference_number,
        billing,
        net_amount,
        source,
      } = attributes;
      const { type } = source;
      const { email, name, phone } = billing;

      // UPDATE is idempotent — safe to re-run on duplicate delivery.
      const updateQuery = `UPDATE ${dbSchema}.transaction_table
    SET gross_amount=$1, transaction_fee=$2, currency=$3, description=$4, status=$5, payment_id=$6, net_amount=$7, email=$8, name=$9, phone=$10, payment_type=$11,
    paid_at=$12
    WHERE reference_number=$13 returning *;`;

      await dbQuery.query(updateQuery, [
        amount / 100,
        fee / 100,
        currency,
        description,
        paymentStatus,
        id,
        net_amount / 100,
        email,
        name,
        phone,
        type,
        new Date(),
        external_reference_number,
      ]);

      await tryMarkProcessed(eventId, id);
      console.log('[paymentController] PAYMONGO_WEBHOOK_PROCESSED payment.paid');
      return res.status(200).json({ received: true, provider: 'paymongo', status: 'processed' });

    // -----------------------------------------------------------------------
    // Case: payment.failed — idempotent, no mutation needed
    // -----------------------------------------------------------------------
    } else if (webhookEvent == "payment.failed") {
      // NOTIFY-FIX-01 LOGGING: log only event type, not PII from the payload.
      console.log('[paymentController] PAYMONGO_WEBHOOK_PROCESSED payment.failed');

      // V4 Lifecycle: non-blocking failure notification
      var failedObjectId = data.attributes.data && data.attributes.data.id;
      if (failedObjectId) {
        notifyPaymentFailed({
          companyId: null, // Cannot derive companyId from payment.failed without remarks lookup
          billingCycle: 'monthly', // Default — will be dedupe-skipped if companyId is null
        }).catch(function() {});
      }

      await tryMarkProcessed(eventId, null);
      return res.status(200).json({ received: true, provider: 'paymongo', status: 'processed' });

    // -----------------------------------------------------------------------
    // Case: unknown/unsupported event type
    // Signature is verified — acknowledge with 2xx so PayMongo does not retry.
    // -----------------------------------------------------------------------
    } else {
      console.log('[paymentController] PAYMONGO_WEBHOOK_IGNORED_UNSUPPORTED_TYPE: ' + webhookEvent);
      await tryMarkProcessed(eventId, null);
      return res.status(200).json({ received: true, provider: 'paymongo', status: 'ignored' });
    }

  } catch (error) {
    // Safe error log — no raw payload, no secrets, no stack trace to response.
    const errCode = error && error.code;
    const errMsg = error && error.message && error.message.substring(0, 100);
    console.error('[paymentController] PAYMONGO_WEBHOOK_PROCESSING_FAILED:', errCode, errMsg);
    await tryMarkFailed(eventId, error && error.message);
    // Return 500 for retryable failures (DB down, etc.).
    // Known duplicates never reach here — they are returned as 200 above.
    return res.status(500).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateCart = async (stat, transaction_id, cartId) => {
  try {
    const updateQuery = `UPDATE ${dbSchema}.cart_table
          SET status=$1, transaction_id=$2
          WHERE cart_id=$3 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      stat,
      transaction_id,
      cartId,
    ]);

    const dbResponse = rows[0];
    if (!dbResponse) {
      throw Error("Failed to Update Cart");
    }

    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

export { paymongoPaymentLink, paymongoWebhook, createPaymongoLink };
