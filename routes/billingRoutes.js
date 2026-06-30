import express from "express";
import validateFirebaseIdToken from "../middleware/verifyAuth.js";
import {
  listInvoices,
  getInvoice,
  viewInvoiceHtml,
  viewInvoiceByToken,
  sendInvoiceEmail,
  getBillingProfile,
  updateBillingProfile,
} from "../controllers/billingController.js";

const router = express.Router();

// Public token-based invoice view (no auth — token is the gate)
router.get("/billing/invoices/token/:token/view", viewInvoiceByToken);

// All other billing routes require authentication
router.use(validateFirebaseIdToken);

router.get("/billing/invoices",           listInvoices);
router.get("/billing/invoices/:id",       getInvoice);
router.get("/billing/invoices/:id/view",  viewInvoiceHtml);
router.post("/billing/invoices/:id/send", sendInvoiceEmail);

router.get("/billing/profile",  getBillingProfile);
router.put("/billing/profile",  updateBillingProfile);

export default router;
