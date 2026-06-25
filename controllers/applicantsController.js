import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import idGenerator from "../helpers/randomNumberForId";
import env from "../env";
import {
  appplicantProfile,
  createApplicationProfile,
  updateApplicationProfile,
  deleteArrayApplicantEntry,
  saveApplicantWorkExperience,
  saveApplicantEducationalBackground,
  saveCertifications,
  saveApplicantDetailsList,
  updateProfileBasicInfo,
  uploadAndSaveAttachment,
  updateProfileSaveVideoCV,
} from "../services/applicant.service";
import { getUserProfileById } from "../helpers/userDetails";
import {
  charts,
  graph,
  statistic,
  totalJobs,
} from "../services/application.service";
import { insertLogs } from "../services/user.service";
import { evaluateProfileCompleteness } from "../services/applicantProfileQualityService";

const dbSchema = env.schema;

const createApplication = async (req, res) => {
  const { jobId, status } = req.body;
  // QA9 FIX-1 BOLA: derive candidateId from JWT, never from req.body —
  // any applicant could otherwise create an application attributed to another user.
  const candidateId = req.user.uid;

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.application
      (job_id, candidate_id, applicationdate, status)
      values ($1, $2, now(), $3) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      jobId,
      candidateId,
      status,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      return res.status(status.error).json(errorResponse("Failed to Create Application"));
    }

    const applicationList = await getApplicationListCandidate(candidateId);

    return res.status(status.success).json(successResponse(applicationList));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const deleteApplication = async (req, res) => {
  const { applicationId } = req.body;
  // QA9 FIX-1 BOLA: derive candidateId from JWT (was undefined — runtime crash).
  // Never use body-supplied candidateId as the ownership anchor.
  const candidateId = req.user.uid;
  // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
  const deleteQuery = `DELETE FROM ${dbSchema}.application
      WHERE application_id=$1 AND candidate_id=$2`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, [applicationId, candidateId]);
    const applications = await getApplicationListCandidate(candidateId);
    return res.status(status.success).json(successResponse(applications));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateApplication = async (req, res) => {
  const { jobId, status, applicationId } = req.body;
  // QA10 FIX-3a BOLA: derive candidateId from JWT, never from req.body —
  // any applicant could otherwise update another applicant's application
  // by supplying a spoofed candidateId.
  const candidateId = req.user.uid;

  try {
    const updateQuery = `UPDATE ${dbSchema}.application
            SET job_id=$1, candidate_id=$2, applicationdate=now(), status=$3
            WHERE application_id=$4 AND candidate_id=$2 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      jobId,
      candidateId,
      status,
      applicationId,
    ]);

    const dbResponse = await getApplicationWithJobDetails(applicationId);

    if (!dbResponse) {
      return res.status(status.error).json(errorResponse("Failed to Update Appplication"));
    }

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getApplicationListCandidate = async (candidateId) => {
  const selectQuery = `
      SELECT 
        a.application_id, j.job_id, j.jobtitle, a.applicationdate, a.status
      FROM ${dbSchema}.jobs j
      inner join ${dbSchema}.application a
      on j.job_id = a.job_id 
      inner join ${dbSchema}.candidate c 
      on c.candidate_id = a.candidate_id where c.candidate_id = $1`;

  try {
    const { rows } = await dbQuery.query(selectQuery, [candidateId]);
    const dbResponse = rows.map((row) => mapApplications(row));

    return dbResponse;
  } catch (error) {
    throw Error("Failed to retrieve Companies");
  }
};

const getApplicationWithJobDetails = async (applicationId) => {
  // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
  // QA10 FIX-3b: fixed malformed join condition "c a.candidate_id" —
  // was missing alias separator; correct form is "c.candidate_id".
  const searchQuery = `
      select * from ${dbSchema}.jobs j
      inner join ${dbSchema}.application a
      on j.job_id = a.job_id
      inner join ${dbSchema}.candidate c
      on a.candidate_id = c.candidate_id
      where a.application_id = $1
    `;

  try {
    const { rows } = await dbQuery.query(searchQuery, [applicationId]);
    const dbResponse = mapApplications(rows[0]);
    return dbResponse;
  } catch (error) {
    throw Error("Error getting Job Details");
  }
};
const mapApplications = (application) => {
  return {
    applicationId: application.application_id,
    jobId: application.job_id,
    jobTitle: application.jobtitle,
    applicationDate: application.applicationdate,
    applicationStatus: application.status,
  };
};

const createProfile = async (req, res) => {
  try {
    // QA8 FIX-6 BOLA: replace body-supplied userId with JWT-derived uid so a caller
    // cannot create a profile attributed to another user by supplying a different userId.
    const profile = await createApplicationProfile({ ...req.body, userId: req.user.uid });
    return res.status(status.success).json(successResponse(profile));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateBasicProfileInfo = async (req, res) => {
  try {
    // QA7 FIX-4 BOLA: lock userId to the JWT-derived identity so callers
    // cannot overwrite another applicant's profile by supplying a different
    // userId in the request body. The service uses userId in its WHERE clause.
    const profile = await updateProfileBasicInfo({ ...req.body, userId: req.user.uid });
    return res.status(status.success).json(successResponse(profile));
  } catch (error) {
    console.error('[updateBasicProfileInfo] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateProfile = async (req, res) => {
  try {
    // QA7 FIX-4 BOLA: lock userId to the JWT-derived identity so callers
    // cannot overwrite another applicant's profile by supplying a different
    // userId in the request body. The service uses userId in its WHERE clause.
    const profile = await updateApplicationProfile({ ...req.body, userId: req.user.uid });
    return res.status(status.success).json(successResponse(profile));
  } catch (error) {
    console.error('[updateProfile] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// PROFILE (re-run after Applicant Data Foundation v2) -- backend
// completeness scoring, ported from the existing frontend-only
// ProfileQualityService. Always the caller's own profile, same identity
// derivation as getApplicantProfileById above.
const getApplicantProfileCompleteness = async (req, res) => {
  const { uid } = req.user;

  try {
    const profile = await appplicantProfile(uid);
    const result = evaluateProfileCompleteness(profile);
    return res.status(status.success).json(successResponse(result));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getApplicantProfileById = async (req, res) => {
  // SECURE fix (BOLA), found during the PROFILE re-run: this previously
  // trusted a frontend-supplied query `id` with no ownership check --
  // any authenticated caller could read any other applicant's full
  // profile by passing a different id. Every current frontend caller
  // (ApplicantService.getApplicant) already only ever requests its own
  // logged-in user's id, so deriving from the verified token instead
  // breaks no existing legitimate use.
  const { uid } = req.user;

  try {
    const profile = await appplicantProfile(uid);
    const click = await insertLogs("Profile View", "", uid);
    return res.status(status.success).json(successResponse(profile));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getUserProfile = async (req, res) => {
  const { id } = req.query;

  try {
    const creds = await getUserProfileById(id);

    return res.status(status.success).json(successResponse(creds));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getDashboard = async (req, res) => {
  const { uid } = req.user;

  try {
    const userDetails = await getUserProfileById(uid);
    const chart = await charts(uid);
    const graphList = await graph(uid);
    const statistics = await statistic(uid);
    const totalJob = await totalJobs(uid);
    const dbResponse = {
      user: {
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        photoUrl: userDetails.photoUrl,
        ...chart,
      },
      charts: {
        ...graphList,
        ...statistics,
        ...totalJob,
      },
    };

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveWorkExp = async (req, res) => {
  const { workExperience, applicantProfileId } = req.body;
  // QA8 FIX-5 BOLA: verify the caller's JWT-derived uid owns this applicant profile
  // before mutating any sub-arrays. Never trust caller-supplied applicantProfileId alone.
  const { uid } = req.user;
  try {
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    if (workExperience) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_work_experience",
        "applicant_id"
      );

      if (workExperience.length != 0) {
        // QA9 FIX-11: was bare .map(async) — insert failures were silently
        // swallowed. await Promise.all ensures errors propagate to the catch.
        await Promise.all(
          workExperience.map(async (exp) =>
            await saveApplicantWorkExperience(exp, applicantProfileId)
          )
        );
      }
    }

    return res.status(status.success).json(successResponse(workExperience));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveEducBg = async (req, res) => {
  const { educationalBackground, applicantProfileId } = req.body;
  // QA8 FIX-5 BOLA: verify caller owns this applicant profile via JWT uid.
  const { uid } = req.user;
  try {
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    if (educationalBackground) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_educational_background",
        "applicant_id"
      );

      if (educationalBackground.length != 0) {
        // QA9 FIX-11: was bare .map(async) — await Promise.all to propagate errors.
        await Promise.all(
          educationalBackground.map(async (educ) =>
            await saveApplicantEducationalBackground(educ, applicantProfileId)
          )
        );
      }
    }

    return res.status(status.success).json(successResponse(educationalBackground));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveCert = async (req, res) => {
  const { certifications, applicantProfileId } = req.body;
  // QA8 FIX-5 BOLA: verify caller owns this applicant profile via JWT uid.
  const { uid } = req.user;
  try {
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    if (certifications) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_certificates",
        "applicant_id"
      );

      if (certifications.length != 0) {
        // QA9 FIX-11: was bare .map(async) — await Promise.all to propagate errors.
        await Promise.all(
          certifications.map(async (cert) =>
            await saveCertifications(cert, applicantProfileId)
          )
        );
      }
    }

    return res.status(status.success).json(successResponse(certifications));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveSkillsArray = async (req, res) => {
  const { skills, applicantProfileId } = req.body;
  // QA8 FIX-5 BOLA: verify caller owns this applicant profile via JWT uid.
  const { uid } = req.user;
  try {
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    if (skills) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_skills",
        "applicant_id"
      );
      if (skills.length != 0) {
        const skillArr = await saveApplicantDetailsList(
          skills,
          "applicant_skills",
          "skills",
          applicantProfileId
        );
      }
    }

    return res.status(status.success).json(successResponse(skills));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveDocuments = async (req, res) => {
  const { documents, applicantProfileId } = req.body;
  // QA8 FIX-5 BOLA: verify caller owns this applicant profile via JWT uid.
  const { uid } = req.user;
  try {
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    if (documents) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "documents",
        "applicant_id"
      );

      if (documents.length != 0) {
        const output = await Promise.all(
          documents.map(async (document, index) => {
            return await uploadAndSaveAttachment(
              document,
              applicantProfileId,
              "documents",
              "applicant_id",
              index
            );
          })
        );
      }
    }
    return res.status(status.success).json(successResponse(documents));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const saveVideoCV = async (req, res) => {
  const { video, applicantProfileId } = req.body;
  const { uid } = req.user;
  try {
    // QA9 FIX-2 BOLA: verify the caller's JWT-derived uid owns this applicant
    // profile before allowing a storage write keyed to applicantProfileId.
    // The service enforces WHERE user_id=$3, but the storage bucket path uses
    // applicantProfileId — verify ownership before the upload to prevent
    // writing to another applicant's storage path.
    const ownerCheck = await dbQuery.query(
      `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
      [applicantProfileId, uid]
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const dbResponse = await updateProfileSaveVideoCV(
      video,
      applicantProfileId,
      uid
    );
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[applicantsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

export {
  createApplication,
  deleteApplication,
  updateApplication,
  createProfile,
  getApplicantProfileById,
  getApplicantProfileCompleteness,
  updateProfile,
  getUserProfile,
  getDashboard,
  saveWorkExp,
  saveEducBg,
  saveCert,
  saveSkillsArray,
  saveDocuments,
  updateBasicProfileInfo,
  saveVideoCV,
};
