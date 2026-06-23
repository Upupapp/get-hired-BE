import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import {
  createPaymentIntent,
  getAllSubscription,
  getCompanySubscriptions,
} from "../controllers/subscriptionController";

const router = express.Router();

// STITCH/security fix (GH-ACT-003/GH-ACT-009): this route had no auth
// middleware and trusted a client-supplied email to pick which company's
// card/subscription got charged. Zero frontend consumers found in this
// repo, so adding auth here breaks no existing caller.
router.post("/subscription/paymentintent", verifyAuth, createPaymentIntent);

router.get("/subscription/getallsubscription", verifyAuth, getAllSubscription);
router.get(
  "/subscription/getcompanysubscriptions",
  verifyAuth,
  getCompanySubscriptions
);
export default router;
