import { findOrCreateThread, listMessages, sendMessage, listRecruiterThreads } from "../services/message.service";
import { successResponse, errorResponse, status } from "../helpers/status";

const ERROR_STATUS_BY_CODE = {
  FORBIDDEN: 403,
  THREAD_NOT_FOUND: 404,
  MESSAGE_BODY_REQUIRED: 400,
  MESSAGE_BODY_TOO_LONG: 400,
};

const ERROR_MESSAGE_BY_CODE = {
  FORBIDDEN: "You don't have access to this conversation.",
  THREAD_NOT_FOUND: "Conversation not found.",
  MESSAGE_BODY_REQUIRED: "Message cannot be empty.",
  MESSAGE_BODY_TOO_LONG: "Message is too long. Please keep it under 4000 characters.",
};

const handleKnownError = (error, res) => {
  const knownStatus = ERROR_STATUS_BY_CODE[error.code];
  if (!knownStatus) {
    return false;
  }
  res.status(knownStatus).send({
    success: false,
    message: ERROR_MESSAGE_BY_CODE[error.code],
    code: error.code,
  });
  return true;
};

// Finds or creates the thread for this job+applicant. Role is never
// trusted from the request -- message.service.js derives it from the
// authenticated uid via getUserCompany().
const openThread = async (req, res) => {
  const { uid } = req.user;
  const { jobId, applicantUid } = req.body;

  try {
    const thread = await findOrCreateThread(jobId, applicantUid, uid);
    return res.status(status.success).json(successResponse(thread));
  } catch (error) {
    if (handleKnownError(error, res)) return;
    console.error('[messageController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getThreadMessages = async (req, res) => {
  const { uid } = req.user;
  const { threadId } = req.query;

  try {
    const messages = await listMessages(threadId, uid);
    return res.status(status.success).json(successResponse(messages));
  } catch (error) {
    if (handleKnownError(error, res)) return;
    console.error('[messageController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const postMessage = async (req, res) => {
  const { uid } = req.user;
  const { threadId, body } = req.body;

  try {
    const message = await sendMessage(threadId, uid, body);
    return res.status(status.success).json(successResponse(message));
  } catch (error) {
    if (handleKnownError(error, res)) return;
    console.error('[messageController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// B01 — Global recruiter inbox. Returns all threads for the caller's company.
// Company scoping is enforced server-side via listRecruiterThreads; a caller
// without a recognised company gets 403, not an empty list.
const getRecruiterThreads = async (req, res) => {
  const { uid } = req.user;

  try {
    const threads = await listRecruiterThreads(uid);
    return res.status(status.success).json(successResponse(threads));
  } catch (error) {
    if (handleKnownError(error, res)) return;
    console.error('[messageController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

export { openThread, getThreadMessages, postMessage, getRecruiterThreads };
