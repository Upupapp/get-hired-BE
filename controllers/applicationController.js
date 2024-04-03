import { jobApply } from "../services/application.service";
import { successMessage, errorMessage, status } from "../helpers/status";

const submitApplication = async (req, res) => {
  const { uid } = req.user;
  const { jobId, candidateId, applicantId, coverLetter, resume, governmentFiles, interviewAnswers } = req.body;

  const application = {
    jobId,
    candidateId,
    applicantId,
    coverLetter,
    resume,
    governmentFiles,
    interviewAnswers,
    applicationStatusId: interviewAnswers.length > 0 ? 3:2
  };
  
  try {
    const apply = await jobApply(application, uid);
    successMessage.data = apply;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { submitApplication };
