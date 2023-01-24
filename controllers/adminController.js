import { getUserProfileById } from "../helpers/userDetails";
import { successMessage, errorMessage, status } from "../helpers/status";

const getUserProfile = async (req, res) => {
    const { id } = req.query;
  
    try {
      const creds = await getUserProfileById(id);
  
      successMessage.data = creds;
      return res.status(status.success).send(successMessage);
    } catch (error) {
      errorMessage.error = "ERROR: " + error;
      return res.status(status.error).send(errorMessage);
    }
  };

  export {
    getUserProfile
  }