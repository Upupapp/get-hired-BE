import { getUserProfileById, getUserRoleById } from "../helpers/userDetails";
import { successResponse, errorResponse, status } from "../helpers/status";

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

      return res.status(status.success).json(successResponse(creds));
    } catch (error) {
      console.error('[adminController] error:', error);
      return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
    }
  };

  export {
    getUserProfile
  }