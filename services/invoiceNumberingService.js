import dbQuery from "../db/dbQuery.js";

const INVOICE_PREFIX = "GTH";

// Returns next sequence value atomically from the DB sequence
const nextSequenceValue = async () => {
  const result = await dbQuery.query("SELECT nextval('gethired.invoice_number_seq') AS seq");
  return parseInt(result.rows[0].seq, 10);
};

// Format: GTH-2026-000001
const formatInvoiceNumber = (seq, year) => {
  const y = year || new Date().getFullYear();
  const padded = String(seq).padStart(6, "0");
  return INVOICE_PREFIX + "-" + y + "-" + padded;
};

const generateInvoiceNumber = async () => {
  const seq = await nextSequenceValue();
  const year = new Date().getFullYear();
  const invoiceNumber = formatInvoiceNumber(seq, year);
  return { invoiceNumber, seq };
};

export default { generateInvoiceNumber, formatInvoiceNumber };
