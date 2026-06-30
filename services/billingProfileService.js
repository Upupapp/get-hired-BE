import dbQuery from "../db/dbQuery.js";

const getByCompany = async (companyId) => {
  const result = await dbQuery.query(
    `SELECT
       id, company_id, legal_name, billing_email,
       finance_contact_name, finance_contact_email,
       billing_address_line1, billing_address_line2,
       city, province_state, country, postal_code,
       tax_identifier, auto_send_invoices,
       created_at, updated_at
     FROM gethired.billing_profiles
     WHERE company_id = $1`,
    [companyId]
  );
  return (result.rows && result.rows[0]) || null;
};

const upsert = async (companyId, data) => {
  const {
    legalName,
    billingEmail,
    financeContactName,
    financeContactEmail,
    billingAddressLine1,
    billingAddressLine2,
    city,
    provinceState,
    country,
    postalCode,
    taxIdentifier,
    autoSendInvoices,
  } = data;

  const safeBool = (v) => (v === true || v === "true" || v === 1 ? true : false);

  const result = await dbQuery.query(
    `INSERT INTO gethired.billing_profiles (
       company_id, legal_name, billing_email,
       finance_contact_name, finance_contact_email,
       billing_address_line1, billing_address_line2,
       city, province_state, country, postal_code,
       tax_identifier, auto_send_invoices,
       created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
     ON CONFLICT (company_id) DO UPDATE SET
       legal_name             = EXCLUDED.legal_name,
       billing_email          = EXCLUDED.billing_email,
       finance_contact_name   = EXCLUDED.finance_contact_name,
       finance_contact_email  = EXCLUDED.finance_contact_email,
       billing_address_line1  = EXCLUDED.billing_address_line1,
       billing_address_line2  = EXCLUDED.billing_address_line2,
       city                   = EXCLUDED.city,
       province_state         = EXCLUDED.province_state,
       country                = EXCLUDED.country,
       postal_code            = EXCLUDED.postal_code,
       tax_identifier         = EXCLUDED.tax_identifier,
       auto_send_invoices     = EXCLUDED.auto_send_invoices,
       updated_at             = NOW()
     RETURNING *`,
    [
      companyId,
      legalName || null,
      billingEmail || null,
      financeContactName || null,
      financeContactEmail || null,
      billingAddressLine1 || null,
      billingAddressLine2 || null,
      city || null,
      provinceState || null,
      country || "Philippines",
      postalCode || null,
      taxIdentifier || null,
      safeBool(autoSendInvoices),
    ]
  );
  return result.rows && result.rows[0];
};

export default { getByCompany, upsert };
