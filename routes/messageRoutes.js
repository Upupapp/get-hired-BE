import express from "express";
import { openThread, getThreadMessages, postMessage } from "../controllers/messageController";
import verifyAuth from "../middleware/verifyAuth";

// GH-EMP-B04 -- new messaging foundation. Every route verifyAuth-protected
// from creation; ownership/role is resolved server-side inside
// message.service.js, never trusted from the request body.
const router = express.Router();

router.post("/messages/thread", verifyAuth, openThread);
router.get("/messages/thread/messages", verifyAuth, getThreadMessages);
router.post("/messages/thread/send", verifyAuth, postMessage);

export default router;
