import { validateCvFile } from "../services/cvValidationService";
import { appplicantProfile, uploadAndSaveAttachment } from "../services/applicant.service";

// CVCOACH (re-run after Applicant Data Foundation v2).
//
// The `documents` table this controller used to call "not available yet"
// now exists (restored by the Applicant Data Foundation v2 migration).
// What's genuinely real now: validate -> upload to Firebase Storage ->
// save a documents row, reusing applicant.service.js's existing
// uploadAndSaveAttachment() rather than writing a second upload path.
//
// What's still honestly not real: CV text extraction, CV Health Score,
// Surgical Review, Match Explorer -- none of those have a schema or a
// parser, and this controller does not pretend otherwise. Storing the
// file is a real, complete step on its own; analysis is a separate,
// still-unbuilt step.
const uploadCv = async (req, res) => {
  const { file, filename } = req.body;
  const { uid } = req.user;

  const validation = validateCvFile(file);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      code: validation.code,
      fieldErrors: [],
    });
  }

  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      // Real, honest blocker -- distinct from the old, broader
      // "feature unavailable" response. A CV must attach to a profile
      // (documents.applicant_id FKs to applicants_profile), and creating
      // one on the applicant's behalf here would be a silent side effect
      // outside this endpoint's job.
      return res.status(409).json({
        success: false,
        message: "Create your profile before uploading a CV.",
        code: "CV_PROFILE_REQUIRED",
        fieldErrors: [],
      });
    }

    const safeFilename = filename && typeof filename === "string" && filename.trim()
      ? filename.trim()
      : (validation.mimeType === "application/pdf" ? "resume.pdf" : "resume.docx");

    const saved = await uploadAndSaveAttachment(
      { file, filename: safeFilename, size: validation.approxSizeBytes, type: validation.mimeType },
      profile.applicantProfileId,
      "documents",
      "applicant_id"
    );

    return res.status(200).json({
      success: true,
      data: saved,
      message: "CV uploaded.",
    });
  } catch (error) {
    // Never leak the raw storage/SQL error -- same rule this controller
    // already followed for the old "unavailable" response.
    return res.status(500).json({
      success: false,
      message: "We couldn't upload your CV right now. Please try again.",
      code: "CV_UPLOAD_FAILED",
      fieldErrors: [],
    });
  }
};

export { uploadCv };
