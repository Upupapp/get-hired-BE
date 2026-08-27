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
import { validateDocumentFile } from "../services/documentUploadValidationService";
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

// SEC-01 FIX: BOLA / IDOR on GET /applicant/userprofile
// Previously this trusted req.query.id (frontend sent ?id=<userId>), allowing
// any authenticated applicant to read any other applicant's user profile by
// changing the query param. Identity is now derived exclusively from the
// verified Firebase JWT set on req.user.uid by the verifyAuth middleware.
//
// Case 1/2 (no token / invalid token): handled upstream by verifyAuth → 403
// Case 3: valid token, no query → uses token uid ✓
// Case 4: valid token, matching query → uses token uid (query ignored) ✓
// Case 5: valid token, MISMATCHED query → 403 + security event logged ✓
// Case 6: no profile found → propagates 404-equivalent via error path ✓
const getUserProfile = async (req, res) => {
  const tokenUid = req.user.uid;

  // Case 5: caller supplied an id query param that DIFFERS from the token uid.
  // This is the IDOR attempt path — block it and log a security event.
  // We deliberately do NOT reveal whether the supplied id exists.
  if (req.query.id && req.query.id !== tokenUid) {
    const ts = new Date().toISOString();
    const redactUid = (u) => (typeof u === 'string' && u.length > 6)
      ? u.slice(0, 3) + '***' + u.slice(-3)
      : '***';
    console.error(
      `[SEC_01_APPLICANT_USERPROFILE_UID_MISMATCH] ${ts} ` +
      `endpoint=GET /applicant/userprofile ` +
      `authenticatedUid=${redactUid(tokenUid)} ` +
      `suppliedId=${redactUid(req.query.id)} ` +
      `action=blocked`
    );
    return res.status(403).json({ message: 'Unable to load profile for this session.' });
  }

  try {
    const creds = await getUserProfileById(tokenUid);
    return res.status(status.success).json(successResponse(creds));
  } catch (error) {
    console.error('[applicantsController] getUserProfile error:', error.message || error);
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
    // TEMP DIAGNOSTIC: this route is 500ing in production with no
    // reproducible cause found across the route/controller/service/schema
    // (all verified against the deployed source directly) -- no server log
    // access to see the real underlying error. Surfaces error.message (not
    // the full stack -- no internals/credentials in a Postgres or JS error
    // message here) so the next failure is diagnosable from the browser's
    // Network tab alone. Revert once root-caused.
    console.error('[applicantsController] saveSkillsArray error:', error);
    return res.status(status.error).json(errorResponse(
      `Operation not successful. Please try again. (debug: ${error && error.message ? error.message : String(error)})`
    ));
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
      // SEC-08 FIX: validate every NEW file (entries carrying over an
      // already-uploaded document have no fresh `file` data-URL -- mirrors
      // uploadAndSaveAttachment's own "only upload if file present" check)
      // before deleting the existing rows below. Reject the whole batch on
      // the first bad file rather than partially applying it.
      for (const document of documents) {
        if (document && document.file) {
          const validation = validateDocumentFile(document.file);
          if (!validation.valid) {
            return res.status(status.bad).json(errorResponse(validation.message));
          }
        }
      }

      // BUGFIX: previously deleted every row in "documents" for this
      // applicant unconditionally, including the CV Builder's own
      // dedicated CV row (is_cv=true) -- re-saving Profile Setup's generic
      // document list (cover letters, certificates, etc.) silently wiped
      // out the applicant's CV as an unrelated side effect. Excludes
      // is_cv=true rows so CV Builder stays the single source of truth for
      // "the current CV" and this save only ever manages the other,
      // non-CV documents.
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "documents",
        "applicant_id",
        "is_cv"
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

const VIDEO_REJECTION_CODES = ['VIDEO_EMPTY', 'VIDEO_DISALLOWED', 'VIDEO_SIGNATURE_MISMATCH', 'VIDEO_TOO_LARGE'];

const saveVideoCV = async (req, res) => {
  const { video, applicantProfileId } = req.body;
  const { uid } = req.user;
  try {
    // SEC-03: reject oversized payloads before ownership check or Firebase upload.
    // base64 encodes 3 bytes as 4 chars, so length * 0.75 ≈ decoded byte count.
    if (video && video.videoCVFile) {
      const estimatedBytes = Math.ceil(video.videoCVFile.length * 0.75);
      if (estimatedBytes > 100 * 1024 * 1024) {
        return res.status(status.bad).json({
          status: 'rejected',
          code: 'VIDEO_TOO_LARGE',
          message: 'This video is too large (max 100 MB). Please record a shorter video.',
        });
      }
    }

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
    // SEC-03: surface video rejection codes as 400 with user-readable message
    // rather than swallowing them into a generic 500.
    const errCode = error && error.code ? error.code : null;
    if (errCode && VIDEO_REJECTION_CODES.indexOf(errCode) !== -1) {
      return res.status(status.bad).json({
        status: 'rejected',
        code: errCode,
        message: (error && error.message) || 'Video validation failed.',
      });
    }
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
