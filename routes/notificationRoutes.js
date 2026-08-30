import express from "express";
import { getNotifications, postMarkRead, postMarkAllRead } from "../controllers/notificationController";
import verifyAuth from "../middleware/verifyAuth";

// Notification bell/center routes. Every route verifyAuth-protected;
// scoping to the caller's own notifications is enforced server-side in
// notification.service.js (recipient_uid = req.user.uid), never trusted
// from the request. Mirrors messageRoutes.js's structure.
const router = express.Router();

router.get("/notifications", verifyAuth, getNotifications);
router.post("/notifications/:id/read", verifyAuth, postMarkRead);
router.post("/notifications/read-all", verifyAuth, postMarkAllRead);

export default router;
