import crypto from "crypto";
import dbQuery from "../db/dbQuery.js";
import invoiceNumberingService from "./invoiceNumberingService.js";
import invoiceAuditService from "./invoiceAuditService.js";

const INVOICE_STATUSES = {
  DRAFT: "draft",
  ISSUED: "issued",
  PAID: "paid",
  VOID: "voided",
  PENDING: "pending",
  FAILED: "failed",
};

// Generate a secure random token for hosted invoice link
const generateHostedToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Build line items array from transaction data
const buildLineItems = (planName, billingCycle, amount) => {
  return [
    {
      description: planName + " Plan â€” " + (billingCycle === "annual" ? "Annual" : "Monthly") + " Subscription",
      qty: 1,
      unit_price: amount,
      total: amount,
    },
  ];
};

// Create invoice from confirmed PayMongo payment
const createFromPayment = async (opts) => {
  const {
    companyId,
    subscriptionId,
    cartId,
    transactionId,
    planName,
    planSlug,
    billingCycle,
    amount,
    currency,
    customerEmail,
    customerName,
    paidAt,
    paymentReference,
    paymentMethodLabel,
    periodStart,
    periodEnd,
  } = opts;

  // Idempotency: if an invoice already exists for this transaction, return it
  const existing = await dbQuery.query(
    "SELECT * FROM gethired.invoices WHERE transaction_id = $1 AND company_id = $2",
    [transactionId, companyId]
  );
  if (existing.rows && existing.rows.length > 0) {
    return { invoice: existing.rows[0], created: false };
  }

  const { invoiceNumber, seq } = await invoiceNumberingService.generateInvoiceNumber();
  const hostedToken = generateHostedToken();
  const hostedExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

  const lineItems = buildLineItems(planName || "GetHired", billingCycle, amount);
  const lineItemsJson = JSON.stringify(lineItems);

  const safeAmount = parseFloat(amount) || 0;
  const safeCurrency = currency || "PHP";
  const safePayAt = paidAt ? new Date(paidAt) : new Date();

  const result = await dbQuery.query(
    `INSERT INTO gethired.invoices (
       company_id, subscription_id, cart_id, transaction_id,
       invoice_number, invoice_sequence,
       status, currency,
       subtotal_amount, discount_amount, tax_amount,
       total_amount, amount_paid, amount_due,
       plan_slug, plan_name, billing_cycle,
       billing_period_start, billing_period_end,
       issued_at, paid_at,
       customer_email, customer_name,
       line_items_json, payment_reference, payment_method_label,
       hosted_invoice_token, hosted_invoice_expires_at,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6,
       $7, $8,
       $9, 0, 0,
       $9, $9, 0,
       $10, $11, $12,
       $13, $14,
       NOW(), $15,
       $16, $17,
       $18::jsonb, $19, $20,
       $21, $22,
       NOW(), NOW()
     )
     RETURNING *`,
    [
      companyId, subscriptionId, cartId, transactionId,
      invoiceNumber, seq,
      INVOICE_STATUSES.PAID, safeCurrency,
      safeAmount,
      planSlug, planName, billingCycle || "monthly",
      periodStart || null, periodEnd || null,
      safePayAt,
      customerEmail || null, customerName || null,
      lineItemsJson, paymentReference || null, paymentMethodLabel || "GCash / Card (PayMongo)",
      hostedToken, hostedExpiry,
    ]
  );

  const invoice = result.rows[0];

  await invoiceAuditService.logEvent(invoice.id, companyId, "invoice_created", {
    eventSource: "paymongo_webhook",
    metadata: { transactionId, invoiceNumber },
  });

  await invoiceAuditService.logEvent(invoice.id, companyId, "payment_confirmed", {
    eventSource: "paymongo_webhook",
    metadata: { paidAt: safePayAt, paymentReference },
  });

  return { invoice, created: true };
};

// List invoices for a company (most recent first)
const listForCompany = async (companyId, opts) => {
  const limit = (opts && parseInt(opts.limit, 10)) || 20;
  const offset = (opts && parseInt(opts.offset, 10)) || 0;
  const statusFilter = opts && opts.status;

  let whereClause = "WHERE company_id = $1";
  const params = [companyId];

  if (statusFilter) {
    params.push(statusFilter);
    whereClause += " AND status = $" + params.length;
  }

  const countResult = await dbQuery.query(
    "SELECT COUNT(*) AS total FROM gethired.invoices " + whereClause,
    params
  );
  const total = parseInt((countResult.rows[0] && countResult.rows[0].total) || 0, 10);

  const dataParams = params.concat([limit, offset]);
  const dataResult = await dbQuery.query(
    `SELECT
       id, company_id, invoice_number, status, currency,
       total_amount, amount_paid, amount_due,
       plan_name, billing_cycle,
       billing_period_start, billing_period_end,
       issued_at, paid_at, created_at,
       customer_name, customer_email,
       payment_method_label, payment_reference,
       hosted_invoice_token
     FROM gethired.invoices
     ` + whereClause + `
     ORDER BY created_at DESC
     LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2),
    dataParams
  );

  return { invoices: dataResult.rows, total, limit, offset };
};

// Get single invoice â€” enforces company ownership
const getById = async (invoiceId, companyId) => {
  const result = await dbQuery.query(
    `SELECT
       id, company_id, invoice_number, status, currency,
       subtotal_amount, discount_amount, tax_amount,
       total_amount, amount_paid, amount_due,
       plan_slug, plan_name, billing_cycle,
       billing_period_start, billing_period_end,
       issued_at, due_at, paid_at, voided_at, created_at, updated_at,
       customer_name, customer_email, customer_address,
       line_items_json, payment_reference, payment_method_label,
       subscription_id, cart_id, transaction_id,
       hosted_invoice_token, hosted_invoice_expires_at
     FROM gethired.invoices
     WHERE id = $1 AND company_id = $2`,
    [invoiceId, companyId]
  );
  return (result.rows && result.rows[0]) || null;
};

// Get invoice by hosted token (for public/download links â€” no auth required but token-gated)
const getByToken = async (token) => {
  const result = await dbQuery.query(
    `SELECT * FROM gethired.invoices
     WHERE hosted_invoice_token = $1
       AND (hosted_invoice_expires_at IS NULL OR hosted_invoice_expires_at > NOW())`,
    [token]
  );
  return (result.rows && result.rows[0]) || null;
};

// Void an invoice
const voidInvoice = async (invoiceId, companyId, actorUid) => {
  const result = await dbQuery.query(
    `UPDATE gethired.invoices
     SET status = $1, voided_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND company_id = $3 AND status NOT IN ('paid', 'voided')
     RETURNING *`,
    [INVOICE_STATUSES.VOID, invoiceId, companyId]
  );
  if (!result.rows || !result.rows[0]) return null;
  await invoiceAuditService.logEvent(invoiceId, companyId, "invoice_voided", {
    actorUid,
    eventSource: "admin_action",
  });
  return result.rows[0];
};

export default {
  INVOICE_STATUSES,
  createFromPayment,
  listForCompany,
  getById,
  getByToken,
  voidInvoice,
};
