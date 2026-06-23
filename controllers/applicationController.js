import { jobApply } from "../services/application.service";
import { successMessage, errorMessage, status } from "../helpers/status";

const submitApplication = async (req, res) => {
  const { uid } = req.user;
  // SECURE fix: candidateId is no longer read from the request body --
  // jobApply() derives it from the authenticated uid directly. Kept out
  // of the `application` object entirely so there's no path left where a
  // body-supplied value could be mistaken for the real one.
  const { jobId, applicantId, coverLetter, resume, governmentFiles, interviewAnswers } = req.body;

  const application = {
    jobId,
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
    // GH-FOUND-B01: duplicate application is a normal, expected user
    // state, not a server error -- give it its own safe response instead
    // of falling into the generic 500/raw-error path.
    if (error && error.code === "JOB_APPLICATION_ALREADY_EXISTS") {
      return res.status(409).send({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { submitApplication };
