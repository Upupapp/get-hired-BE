import { jobApply } from "../services/application.service";
import { successMessage, errorMessage, status } from "../helpers/status";

const submitApplication = async (req, res) => {
  const {
    jobId, candidateId
  } = req.body;

  const application = {
    jobId, candidateId, applicationStatusId: 2
  }
  try {
    const apply = await jobApply(application);
    successMessage.data = apply;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { submitApplication };
