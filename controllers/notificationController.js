import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service";
import { successResponse, errorResponse, status } from "../helpers/status";

// Every handler derives the caller's identity from req.user.uid (set by
// verifyAuth) -- never from a client-supplied id -- matching the pattern
// used throughout message.service.js/messageController.js.

const getNotifications = async (req, res) => {
  const { uid } = req.user;
  try {
    const result = await listNotifications(uid);
    return res.status(status.success).json(successResponse(result));
  } catch (error) {
    console.error("[notificationController] error:", error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const postMarkRead = async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const found = await markNotificationRead(id, uid);
    // Not found / not owned -- respond success with found:false rather
    // than a 404/500 that could leak whether the id exists for someone
    // else. Nothing sensitive is exposed either way.
    return res.status(status.success).json(successResponse({ found }));
  } catch (error) {
    console.error("[notificationController] error:", error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const postMarkAllRead = async (req, res) => {
  const { uid } = req.user;
  try {
    const updatedCount = await markAllNotificationsRead(uid);
    return res.status(status.success).json(successResponse({ updatedCount }));
  } catch (error) {
    console.error("[notificationController] error:", error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

export { getNotifications, postMarkRead, postMarkAllRead };
