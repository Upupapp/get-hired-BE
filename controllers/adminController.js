import { getUserProfileById, getUserRoleById } from "../helpers/userDetails";
import { successMessage, errorMessage, status } from "../helpers/status";

// Role 1 = admin (see signin.component.ts's role switch / admin.guard.ts on the FE).
const ADMIN_ROLE = 1;

const getUserProfile = async (req, res) => {
    const { id } = req.query;

    try {
      // Server-side role check (STITCH/security fix, GH-ACT-007) -- this
      // endpoint previously had no authorization check beyond "is logged
      // in," letting any authenticated user fetch any other user's
      // profile by id.
      const callerRole = await getUserRoleById(req.user.uid);
      if (callerRole !== ADMIN_ROLE) {
        return res.status(403).send("Forbidden");
      }

      const creds = await getUserProfileById(id);

      successMessage.data = creds;
      return res.status(status.success).send(successMessage);
    } catch (error) {
      console.error('[adminController] error:', error);
      errorMessage.error = "Operation not successful. Please try again.";
      return res.status(status.error).send(errorMessage);
    }
  };

  export {
    getUserProfile
  }