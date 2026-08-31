import express from "express";
import { openThread, getThreadMessages, postMessage, getRecruiterThreads, getApplicantThreads, markThreadReadHandler, getUnreadCount } from "../controllers/messageController";
import verifyAuth from "../middleware/verifyAuth";

// GH-EMP-B04 -- messaging foundation. Every route verifyAuth-protected
// from creation; ownership/role is resolved server-side inside
// message.service.js, never trusted from the request body.
//
// B01 -- Global recruiter inbox route added: GET /messages/recruiter/threads
// Company scoping enforced in message.service.listRecruiterThreads().
const router = express.Router();

router.post("/messages/thread", verifyAuth, openThread);
router.get("/messages/thread/messages", verifyAuth, getThreadMessages);
router.post("/messages/thread/send", verifyAuth, postMessage);

// B01: Returns all threads scoped to the authenticated recruiter's company.
// 403 if caller has no company; 200+[] if company has no threads yet.
router.get("/messages/recruiter/threads", verifyAuth, getRecruiterThreads);

// Jobseeker Messages tab: returns all threads scoped to the authenticated
// applicant's own uid (message.service.listApplicantThreads). No
// company/role check needed here -- any authenticated caller only ever
// gets back threads where THEY are the applicant.
router.get("/messages/applicant/threads", verifyAuth, getApplicantThreads);

// Marks the caller's own side of a thread as read. Called by the frontend
// when the applicant/employer actually opens that thread's messages.
router.post("/messages/thread/:threadId/read", verifyAuth, markThreadReadHandler);

// Sidebar badge: total unread messages across all of the caller's threads.
router.get("/messages/unread-count", verifyAuth, getUnreadCount);

export default router;