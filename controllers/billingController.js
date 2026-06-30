import { getUserCompanyForRequest } from "./companiesController.js";
import invoiceService from "../services/invoiceService.js";
import billingProfileService from "../services/billingProfileService.js";
import invoiceEmailService from "../services/invoiceEmailService.js";
import invoiceHtmlService from "../services/invoiceHtmlService.js";
import invoiceAuditService from "../services/invoiceAuditService.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const errorResponse = (message) => ({ success: false, error: message });
const okResponse = (data) => ({ success: true, ...data });

const resolveCompanyId = async (req) => {
  const uid = req.user && req.user.uid;
  if (!uid) return null;
  try {
    const company = await getUserCompanyForRequest(req, uid);
    return (company && company.company_id) || null;
  } catch (e) {
    return null;
  }
};

// Sanitize invoice for list response (never expose hosted_invoice_token in list)
const presentInvoiceList = (inv) => {
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    status: inv.status,
    currency: inv.currency,
    totalAmount: parseFloat(inv.total_amount) || 0,
    planName: inv.plan_name,
    billingCycle: inv.billing_cycle,
    billingPeriodStart: inv.billing_period_start,
    billingPeriodEnd: inv.billing_period_end,
    issuedAt: inv.issued_at,
    paidAt: inv.paid_at,
    createdAt: inv.created_at,
    paymentMethodLabel: inv.payment_method_label,
    hasDownload: true,
  };
};

// Sanitize invoice for detail response
const presentInvoiceDetail = (inv, events) => {
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    status: inv.status,
    currency: inv.currency,
    subtotalAmount: parseFloat(inv.subtotal_amount) || 0,
    discountAmount: parseFloat(inv.discount_amount) || 0,
    taxAmount: parseFloat(inv.tax_amount) || 0,
    totalAmount: parseFloat(inv.total_amount) || 0,
    amountPaid: parseFloat(inv.amount_paid) || 0,
    amountDue: parseFloat(inv.amount_due) || 0,
    planSlug: inv.plan_slug,
    planName: inv.plan_name,
    billingCycle: inv.billing_cycle,
    billingPeriodStart: inv.billing_period_start,
    billingPeriodEnd: inv.billing_period_end,
    issuedAt: inv.issued_at,
    dueAt: inv.due_at,
    paidAt: inv.paid_at,
    voidedAt: inv.voided_at,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
    customerName: inv.customer_name,
    customerEmail: inv.customer_email,
    lineItems: parseLineItems(inv.line_items_json),
    paymentReference: inv.payment_reference,
    paymentMethodLabel: inv.payment_method_label,
    events: events || [],
    downloadToken: inv.hosted_invoice_token,
  };
};

const parseLineItems = (raw) => {
  if (!raw) return [];
  try {
    return (typeof raw === "string") ? JSON.parse(raw) : (raw || []);
  } catch (e) {
    return [];
  }
};

// ── GET /api/billing/invoices ─────────────────────────────────────────────────

export const listInvoices = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).json(errorResponse("Authentication required."));

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const status = req.query.status || null;

    const result = await invoiceService.listForCompany(companyId, { limit, offset, status });

    return res.json(okResponse({
      invoices: result.invoices.map(presentInvoiceList),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }));
  } catch (err) {
    console.error("[billing] listInvoices error:", err && err.message);
    return res.status(500).json(errorResponse("Unable to load invoices."));
  }
};

// ── GET /api/billing/invoices/:id ─────────────────────────────────────────────

export const getInvoice = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).json(errorResponse("Authentication required."));

    const { id } = req.params;
    if (!id) return res.status(400).json(errorResponse("Invoice ID required."));

    const invoice = await invoiceService.getById(id, companyId);
    if (!invoice) return res.status(404).json(errorResponse("Invoice not found."));

    const events = await invoiceAuditService.getEvents(id);

    return res.json(okResponse({ invoice: presentInvoiceDetail(invoice, events) }));
  } catch (err) {
    console.error("[billing] getInvoice error:", err && err.message);
    return res.status(500).json(errorResponse("Unable to load invoice."));
  }
};

// ── GET /api/billing/invoices/:id/view ───────────────────────────────────────
// Serves branded HTML invoice (user can print → Save as PDF)

export const viewInvoiceHtml = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).send("Authentication required.");

    const { id } = req.params;
    const invoice = await invoiceService.getById(id, companyId);
    if (!invoice) return res.status(404).send("Invoice not found.");

    await invoiceAuditService.logEvent(id, companyId, "invoice_viewed", {
      actorUid: req.user && req.user.uid,
      eventSource: "employer_portal",
    });

    const html = invoiceHtmlService.render(invoice);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(html);
  } catch (err) {
    console.error("[billing] viewInvoiceHtml error:", err && err.message);
    return res.status(500).send("Unable to generate invoice.");
  }
};

// ── GET /api/billing/invoices/token/:token/view ───────────────────────────────
// Token-based invoice view — no auth required, token is the gate

export const viewInvoiceByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).send("Invalid token.");

    const invoice = await invoiceService.getByToken(token);
    if (!invoice) return res.status(404).send("Invoice not found or link expired.");

    const html = invoiceHtmlService.render(invoice);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(html);
  } catch (err) {
    console.error("[billing] viewInvoiceByToken error:", err && err.message);
    return res.status(500).send("Unable to generate invoice.");
  }
};

// ── POST /api/billing/invoices/:id/send ──────────────────────────────────────

export const sendInvoiceEmail = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).json(errorResponse("Authentication required."));

    const { id } = req.params;
    if (!id) return res.status(400).json(errorResponse("Invoice ID required."));

    const invoice = await invoiceService.getById(id, companyId);
    if (!invoice) return res.status(404).json(errorResponse("Invoice not found."));

    // Optional override email — validate it's a real email and within this company
    const overrideEmail = req.body && req.body.email;
    if (overrideEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(overrideEmail)) {
        return res.status(400).json(errorResponse("Invalid email address."));
      }
    }

    const result = await invoiceEmailService.sendInvoiceEmail(invoice, {
      triggeredByUid: req.user && req.user.uid,
      overrideEmail: overrideEmail || null,
    });

    if (result.sent) {
      return res.json(okResponse({ message: "Invoice sent successfully." }));
    }

    // Don't expose internal reasons to the client
    const reason = result.reason;
    if (reason === "no_template") {
      return res.status(503).json(errorResponse("Invoice email is not yet configured. Please contact support."));
    }
    if (reason === "no_recipient_email") {
      return res.status(400).json(errorResponse("No email address on record for this invoice."));
    }
    return res.status(500).json(errorResponse("We couldn't send the invoice right now. Please try again."));
  } catch (err) {
    console.error("[billing] sendInvoiceEmail error:", err && err.message);
    return res.status(500).json(errorResponse("Unable to send invoice."));
  }
};

// ── GET /api/billing/profile ─────────────────────────────────────────────────

export const getBillingProfile = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).json(errorResponse("Authentication required."));

    const profile = await billingProfileService.getByCompany(companyId);

    return res.json(okResponse({
      profile: profile || {
        companyId,
        legalName: null,
        billingEmail: null,
        financeContactName: null,
        financeContactEmail: null,
        billingAddressLine1: null,
        billingAddressLine2: null,
        city: null,
        provinceState: null,
        country: "Philippines",
        postalCode: null,
        taxIdentifier: null,
        autoSendInvoices: false,
      },
    }));
  } catch (err) {
    console.error("[billing] getBillingProfile error:", err && err.message);
    return res.status(500).json(errorResponse("Unable to load billing profile."));
  }
};

// ── PUT /api/billing/profile ─────────────────────────────────────────────────

export const updateBillingProfile = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return res.status(401).json(errorResponse("Authentication required."));

    const body = req.body || {};

    // Validate billing email if provided
    if (body.billingEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(body.billingEmail)) {
        return res.status(400).json(errorResponse("Invalid billing email address."));
      }
    }

    // Validate finance contact email if provided
    if (body.financeContactEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(body.financeContactEmail)) {
        return res.status(400).json(errorResponse("Invalid finance contact email address."));
      }
    }

    // Sanitize string fields — truncate to safe lengths
    const sanitize = (v, max) => {
      if (!v) return null;
      return String(v).trim().substring(0, max || 255);
    };

    const profile = await billingProfileService.upsert(companyId, {
      legalName: sanitize(body.legalName, 255),
      billingEmail: sanitize(body.billingEmail, 255),
      financeContactName: sanitize(body.financeContactName, 255),
      financeContactEmail: sanitize(body.financeContactEmail, 255),
      billingAddressLine1: sanitize(body.billingAddressLine1, 500),
      billingAddressLine2: sanitize(body.billingAddressLine2, 500),
      city: sanitize(body.city, 100),
      provinceState: sanitize(body.provinceState, 100),
      country: sanitize(body.country, 100) || "Philippines",
      postalCode: sanitize(body.postalCode, 20),
      taxIdentifier: sanitize(body.taxIdentifier, 100),
      autoSendInvoices: body.autoSendInvoices || false,
    });

    return res.json(okResponse({ profile, message: "Billing profile saved." }));
  } catch (err) {
    console.error("[billing] updateBillingProfile error:", err && err.message);
    return res.status(500).json(errorResponse("Unable to save billing profile."));
  }
};
