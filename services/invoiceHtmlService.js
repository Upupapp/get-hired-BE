// Renders a print-ready branded HTML invoice. No external dependencies.
// The HTML includes @media print CSS so the browser can save it as PDF.
// Returns a complete HTML string ready to serve as text/html.

const BRAND = {
  primary: "#1E2E4A",    // Deep Navy
  accent: "#2563EB",     // Azure Blue
  success: "#10B981",    // Emerald
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
};

const esc = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const formatAmount = (amount, currency) => {
  const cur = currency || "PHP";
  const num = parseFloat(amount) || 0;
  const formatted = num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cur + " " + formatted;
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const statusLabel = (status) => {
  const map = {
    paid: "PAID",
    issued: "ISSUED",
    pending: "PENDING",
    draft: "DRAFT",
    voided: "VOID",
    failed: "FAILED",
  };
  return (map[status] || (status || "").toUpperCase());
};

const statusColor = (status) => {
  if (status === "paid") return "#10B981";
  if (status === "voided") return "#64748B";
  if (status === "failed") return "#EF4444";
  return "#2563EB";
};

const renderLineItems = (lineItemsJson, currency) => {
  let items = [];
  try {
    items = (typeof lineItemsJson === "string") ? JSON.parse(lineItemsJson) : (lineItemsJson || []);
  } catch (e) {
    items = [];
  }

  if (!items || !items.length) {
    return "<tr><td colspan='4' style='padding:12px 16px;color:#64748B;'>No line items</td></tr>";
  }

  return items.map((item) => {
    return "<tr>" +
      "<td style='padding:12px 16px;border-bottom:1px solid #F1F5F9;'>" + esc(item.description || "") + "</td>" +
      "<td style='padding:12px 16px;border-bottom:1px solid #F1F5F9;text-align:center;'>" + esc(String(item.qty || 1)) + "</td>" +
      "<td style='padding:12px 16px;border-bottom:1px solid #F1F5F9;text-align:right;'>" + esc(formatAmount(item.unit_price, currency)) + "</td>" +
      "<td style='padding:12px 16px;border-bottom:1px solid #F1F5F9;text-align:right;font-weight:600;'>" + esc(formatAmount(item.total, currency)) + "</td>" +
      "</tr>";
  }).join("");
};

const render = (invoice) => {
  const sColor = statusColor(invoice.status);
  const sLabel = statusLabel(invoice.status);

  const billingPeriod = (invoice.billing_period_start && invoice.billing_period_end)
    ? formatDate(invoice.billing_period_start) + " – " + formatDate(invoice.billing_period_end)
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${esc(invoice.invoice_number)} — GetHired</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: ${BRAND.text};
      background: #fff;
    }
    .page { max-width: 794px; margin: 0 auto; padding: 48px 40px; }

    /* Header */
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 32px;
      border-bottom: 3px solid ${BRAND.primary};
      margin-bottom: 36px;
    }
    .inv-brand { display: flex; align-items: center; gap: 12px; }
    .inv-logo-mark {
      width: 44px; height: 44px;
      background: ${BRAND.primary};
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -1px;
    }
    .inv-brand-name { font-size: 22px; font-weight: 800; color: ${BRAND.primary}; letter-spacing: -0.5px; }
    .inv-brand-tag  { font-size: 11px; color: ${BRAND.muted}; margin-top: 2px; }

    .inv-meta { text-align: right; }
    .inv-number { font-size: 20px; font-weight: 700; color: ${BRAND.primary}; }
    .inv-status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 6px;
      color: #fff;
      background: ${sColor};
    }
    .inv-date { font-size: 12px; color: ${BRAND.muted}; margin-top: 6px; }

    /* Parties */
    .inv-parties {
      display: flex;
      gap: 48px;
      margin-bottom: 36px;
    }
    .inv-party { flex: 1; }
    .inv-party-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: ${BRAND.muted}; text-transform: uppercase; margin-bottom: 8px; }
    .inv-party-name { font-size: 16px; font-weight: 700; color: ${BRAND.primary}; margin-bottom: 4px; }
    .inv-party-detail { font-size: 13px; color: ${BRAND.muted}; line-height: 1.5; }

    /* Summary row */
    .inv-summary {
      background: ${BRAND.bg};
      border-radius: 10px;
      padding: 20px 24px;
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .inv-summary-item { flex: 1; min-width: 120px; }
    .inv-summary-item-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${BRAND.muted}; margin-bottom: 4px; }
    .inv-summary-item-value { font-size: 14px; font-weight: 600; color: ${BRAND.text}; }

    /* Line items */
    .inv-table-wrap { margin-bottom: 32px; border-radius: 10px; overflow: hidden; border: 1px solid ${BRAND.border}; }
    .inv-table { width: 100%; border-collapse: collapse; }
    .inv-table thead tr { background: ${BRAND.primary}; }
    .inv-table thead th {
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: rgba(255,255,255,0.85);
    }
    .inv-table thead th:last-child,
    .inv-table thead th:nth-child(3) { text-align: right; }
    .inv-table thead th:nth-child(2) { text-align: center; }

    /* Totals */
    .inv-totals { display: flex; justify-content: flex-end; margin-bottom: 36px; }
    .inv-totals-inner { width: 280px; }
    .inv-total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid ${BRAND.border}; }
    .inv-total-row:last-child { border-bottom: none; }
    .inv-total-row--grand { font-size: 17px; font-weight: 800; color: ${BRAND.primary}; padding-top: 14px; }
    .inv-total-row--grand span:last-child { color: ${BRAND.accent}; }

    /* Footer */
    .inv-footer {
      border-top: 1px solid ${BRAND.border};
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .inv-footer-left { font-size: 12px; color: ${BRAND.muted}; line-height: 1.7; }
    .inv-footer-right { text-align: right; font-size: 12px; color: ${BRAND.muted}; }
    .inv-print-btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 24px;
      background: ${BRAND.accent};
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      text-decoration: none;
    }

    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { padding: 20px; max-width: 100%; }
      .inv-header { padding-bottom: 20px; margin-bottom: 24px; }
    }
    @media (max-width: 600px) {
      .page { padding: 24px 16px; }
      .inv-header { flex-direction: column; gap: 16px; }
      .inv-parties { flex-direction: column; gap: 24px; }
      .inv-meta { text-align: left; }
      .inv-totals { justify-content: flex-start; }
      .inv-totals-inner { width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div class="inv-brand">
      <div class="inv-logo-mark">GH</div>
      <div>
        <div class="inv-brand-name">GetHired</div>
        <div class="inv-brand-tag">gethired.ph · jobs@gethired.ph</div>
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-number">INVOICE ${esc(invoice.invoice_number)}</div>
      <div><span class="inv-status-badge">${esc(sLabel)}</span></div>
      <div class="inv-date">Issued: ${esc(formatDate(invoice.issued_at || invoice.created_at))}</div>
      ${invoice.paid_at ? '<div class="inv-date">Paid: ' + esc(formatDate(invoice.paid_at)) + '</div>' : ''}
    </div>
  </div>

  <!-- Billed to / From -->
  <div class="inv-parties">
    <div class="inv-party">
      <div class="inv-party-label">Billed To</div>
      <div class="inv-party-name">${esc(invoice.customer_name || "Your Company")}</div>
      <div class="inv-party-detail">
        ${esc(invoice.customer_email || "")}
        ${invoice.customer_address ? "<br>" + esc(invoice.customer_address) : ""}
      </div>
    </div>
    <div class="inv-party">
      <div class="inv-party-label">From</div>
      <div class="inv-party-name">GetHired Inc.</div>
      <div class="inv-party-detail">
        jobs@gethired.ph<br>
        gethired.ph
      </div>
    </div>
  </div>

  <!-- Summary row -->
  <div class="inv-summary">
    <div class="inv-summary-item">
      <div class="inv-summary-item-label">Plan</div>
      <div class="inv-summary-item-value">${esc(invoice.plan_name || "Subscription")}</div>
    </div>
    <div class="inv-summary-item">
      <div class="inv-summary-item-label">Billing Cycle</div>
      <div class="inv-summary-item-value">${esc(invoice.billing_cycle === "annual" ? "Annual" : "Monthly")}</div>
    </div>
    <div class="inv-summary-item">
      <div class="inv-summary-item-label">Billing Period</div>
      <div class="inv-summary-item-value">${esc(billingPeriod)}</div>
    </div>
    <div class="inv-summary-item">
      <div class="inv-summary-item-label">Payment Method</div>
      <div class="inv-summary-item-value">${esc(invoice.payment_method_label || "GCash / Card")}</div>
    </div>
    ${invoice.payment_reference ? '<div class="inv-summary-item"><div class="inv-summary-item-label">Reference</div><div class="inv-summary-item-value" style="font-size:12px;">' + esc(invoice.payment_reference) + "</div></div>" : ""}
  </div>

  <!-- Line items -->
  <div class="inv-table-wrap">
    <table class="inv-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${renderLineItems(invoice.line_items_json, invoice.currency)}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="inv-totals">
    <div class="inv-totals-inner">
      <div class="inv-total-row">
        <span>Subtotal</span>
        <span>${esc(formatAmount(invoice.subtotal_amount, invoice.currency))}</span>
      </div>
      ${parseFloat(invoice.discount_amount) > 0 ? '<div class="inv-total-row"><span>Discount</span><span>-' + esc(formatAmount(invoice.discount_amount, invoice.currency)) + '</span></div>' : ''}
      ${parseFloat(invoice.tax_amount) > 0 ? '<div class="inv-total-row"><span>Tax</span><span>' + esc(formatAmount(invoice.tax_amount, invoice.currency)) + '</span></div>' : ''}
      <div class="inv-total-row inv-total-row--grand">
        <span>Total</span>
        <span>${esc(formatAmount(invoice.total_amount, invoice.currency))}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      <strong>GetHired</strong> · gethired.ph<br>
      For billing questions, contact us at jobs@gethired.ph<br>
      This is a system-generated invoice. No signature required.
    </div>
    <div class="inv-footer-right">
      Invoice ${esc(invoice.invoice_number)}<br>
      Generated ${esc(new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }))}
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:32px;">
    <button class="inv-print-btn" onclick="window.print()">Save as PDF / Print</button>
  </div>

</div>
<script>
  // Auto-trigger print if ?print=1 is in the URL
  if (window.location.search.indexOf('print=1') !== -1) {
    window.addEventListener('load', function() { window.print(); });
  }
</script>
</body>
</html>`;
};

export default { render };
