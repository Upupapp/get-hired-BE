import { findOrCreateThread, listMessages, sendMessage } from "../services/message.service";
import { successMessage, errorMessage, status } from "../helpers/status";

const ERROR_STATUS_BY_CODE = {
  FORBIDDEN: 403,
  THREAD_NOT_FOUND: 404,
  MESSAGE_BODY_REQUIRED: 400,
};

const ERROR_MESSAGE_BY_CODE = {
  FORBIDDEN: "You don't have access to this conversation.",
  THREAD_NOT_FOUND: "Conversation not found.",
  MESSAGE_BODY_REQUIRED: "Message cannot be empty.",
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
    successMessage.data = thread;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    if (handleKnownError(error, res)) return;
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getThreadMessages = async (req, res) => {
  const { uid } = req.user;
  const { threadId } = req.query;

  try {
    const messages = await listMessages(threadId, uid);
    successMessage.data = messages;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    if (handleKnownError(error, res)) return;
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const postMessage = async (req, res) => {
  const { uid } = req.user;
  const { threadId, body } = req.body;

  try {
    const message = await sendMessage(threadId, uid, body);
    successMessage.data = message;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    if (handleKnownError(error, res)) return;
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { openThread, getThreadMessages, postMessage };
