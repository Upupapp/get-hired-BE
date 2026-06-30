import { send } from "../helpers/mailer.js";
import dbQuery from "../db/dbQuery.js";
import invoiceAuditService from "./invoiceAuditService.js";

const INVOICE_TEMPLATE_KEY = "invoice_issued";

// Record a delivery attempt result
const recordAttempt = async (invoiceId, companyId, recipientEmail, status, opts) => {
  try {
    const providerMessageId = (opts && opts.providerMessageId) || null;
    const errorMessage = (opts && opts.errorMessage) || null;
    const triggeredByUid = (opts && opts.triggeredByUid) || null;
    const sentAt = status === "sent" ? new Date() : null;
    const failedAt = status === "failed" ? new Date() : null;

    await dbQuery.query(
      `INSERT INTO gethired.invoice_delivery_attempts (
         invoice_id, company_id, recipient_email,
         channel, status,
         provider_message_id, error_message,
         triggered_by_uid, sent_at, failed_at
       ) VALUES ($1,$2,$3,'sendgrid',$4,$5,$6,$7,$8,$9)`,
      [
        invoiceId, companyId, recipientEmail,
        status,
        providerMessageId, errorMessage,
        triggeredByUid, sentAt, failedAt,
      ]
    );
  } catch (err) {
    console.error("[invoice_email] Failed to record attempt:", err && err.message);
  }
};

const sendInvoiceEmail = async (invoice, opts) => {
  const triggeredByUid = (opts && opts.triggeredByUid) || null;
  const overrideEmail = (opts && opts.overrideEmail) || null;

  const recipientEmail = overrideEmail || invoice.customer_email;
  if (!recipientEmail) {
    return { sent: false, reason: "no_recipient_email" };
  }

  // Never expose internal invoice data as raw template object — sanitize fields
  const templateData = {
    invoice_number: invoice.invoice_number,
    plan_name: invoice.plan_name || "GetHired Subscription",
    billing_cycle: invoice.billing_cycle || "monthly",
    total_amount: formatAmount(invoice.total_amount, invoice.currency),
    paid_at: invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "",
    customer_name: invoice.customer_name || "Valued Customer",
    billing_period: formatBillingPeriod(invoice.billing_period_start, invoice.billing_period_end),
    download_link: buildDownloadLink(invoice.hosted_invoice_token),
  };

  let sendResult;
  try {
    sendResult = await send(recipientEmail, INVOICE_TEMPLATE_KEY, templateData);
  } catch (err) {
    await recordAttempt(invoice.id, invoice.company_id, recipientEmail, "failed", {
      errorMessage: "send_threw_exception",
      triggeredByUid,
    });
    await invoiceAuditService.logEvent(invoice.id, invoice.company_id, "email_send_failed", {
      actorUid: triggeredByUid,
      eventSource: "sendgrid",
      metadata: { recipientEmail, error: "send_threw_exception" },
    });
    return { sent: false, reason: "send_error" };
  }

  if (sendResult && sendResult.sent) {
    await recordAttempt(invoice.id, invoice.company_id, recipientEmail, "sent", {
      providerMessageId: (sendResult.messageId) || null,
      triggeredByUid,
    });
    await invoiceAuditService.logEvent(invoice.id, invoice.company_id, "invoice_emailed", {
      actorUid: triggeredByUid,
      eventSource: "sendgrid",
      metadata: { recipientEmail },
    });
    return { sent: true };
  } else {
    const reason = (sendResult && sendResult.reason) || "unknown";
    await recordAttempt(invoice.id, invoice.company_id, recipientEmail, "failed", {
      errorMessage: reason,
      triggeredByUid,
    });
    await invoiceAuditService.logEvent(invoice.id, invoice.company_id, "email_send_failed", {
      actorUid: triggeredByUid,
      eventSource: "sendgrid",
      metadata: { recipientEmail, reason },
    });
    return { sent: false, reason };
  }
};

const formatAmount = (amount, currency) => {
  const cur = currency || "PHP";
  const num = parseFloat(amount) || 0;
  return cur + " " + num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatBillingPeriod = (start, end) => {
  if (!start || !end) return "";
  const opts = { year: "numeric", month: "long", day: "numeric" };
  return new Date(start).toLocaleDateString("en-PH", opts) + " – " + new Date(end).toLocaleDateString("en-PH", opts);
};

const buildDownloadLink = (token) => {
  if (!token) return "";
  const base = process.env.APP_URL || "https://gethired.ph";
  return base + "/invoice/" + token;
};

export default { sendInvoiceEmail };
