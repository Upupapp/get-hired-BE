import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import {
  getAllSubscription,
  getCompanySubscriptions,
} from "../controllers/subscriptionController";

const router = express.Router();

router.get("/subscription/getallsubscription", verifyAuth, getAllSubscription);
router.get(
  "/subscription/getcompanysubscriptions",
  verifyAuth,
  getCompanySubscriptions
);
export default router;
