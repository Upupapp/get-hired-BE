import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";

const dbSchema = env.schema;

const createCV = async (req, res) => {
  const {
    name,
    title,
    contactNumber,
    location,
    category,
    description,
    skills,
    cvStatus,
    experience,
    education,
  } = req.body;
  // QA10 FIX-7 BOLA: derive userId from JWT, never from req.body —
  // any applicant could otherwise create a CV attributed to another user
  // by supplying a spoofed userId.
  const userId = req.user.uid;

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.cv
      (user_id ,name ,title,contactnumber,location,category, description, skills, cvstatus,experience,education,createddate)
      values ($1, $2, $3, $4, $5, $6, $7, $8,$9,$10,$11,current_timestamp) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      userId,
      name,
      title,
      contactNumber,
      location,
      category,
      description,
      skills,
      cvStatus,
      experience,
      education,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Create CV";
      return res.status(status.error).send(errorMessage);
    }

    const cv = {
      cvId: dbResponse.cv_id,
      userId: dbResponse.user_id,
      name: dbResponse.name,
      title: dbResponse.title,
      contactNumber: dbResponse.contactnumber,
      location: dbResponse.location,
      category: dbResponse.category,
      description: dbResponse.description,
      skills: dbResponse.skills,
      cvStatus: dbResponse.cvstatus,
      experience: dbResponse.experience,
      education: dbResponse.education,
    };
    successMessage.data = cv;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[cvController] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const updateCV = async (req, res) => {
  const {
    name,
    title,
    contactNumber,
    location,
    category,
    description,
    skills,
    cvStatus,
    experience,
    education,
    cvId,
  } = req.body;

  // QA7 FIX-6 BOLA: lock to JWT-derived identity — never trust caller-supplied userId.
  // OPT-03 (QA7): ownership check folded into UPDATE WHERE — user_id=$12 in
  // the WHERE clause eliminates the separate SELECT pre-check. Zero rows =
  // cv not found OR user_id mismatch; both treated as 403.
  const userId = req.user.uid;

  try {
    const updateQuery = `UPDATE ${dbSchema}.cv
        SET user_id=$1, name=$2, title=$3, contactnumber=$4, location=$5, category=$6, description=$7, skills=$8, cvstatus=$9, experience=$10, education=$11
        WHERE cv_id=$12 AND user_id=$13 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      userId,
      name,
      title,
      contactNumber,
      location,
      category,
      description,
      skills,
      cvStatus,
      experience,
      education,
      cvId,
      userId,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      // Zero rows: either cv_id not found or user_id mismatch — 403 either way.
      return res.status(403).json({ message: "You don't have permission to update this CV." });
    }

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[cvController] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const deleteCV = async (req, res) => {
  const { cvId } = req.body;
  try {
    // QA7 FIX-6 BOLA: verify this CV belongs to the authenticated caller before deleting.
    // OPT-03 (QA7): ownership check folded into DELETE WHERE — user_id=$2 in
    // the WHERE clause eliminates the separate SELECT pre-check. Zero rowCount =
    // cv not found OR user_id mismatch; both treated as 403.
    // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
    const { rowCount } = await dbQuery.query(
      `DELETE FROM ${dbSchema}.cv WHERE cv_id=$1 AND user_id=$2`,
      [cvId, req.user.uid]
    );
    if (rowCount === 0) {
      return res.status(403).json({ message: "You don't have permission to delete this CV." });
    }

    successMessage.data = "CV has been Deleted";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[cvController] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getUserCVlist = async (req, res) => {
  // QA8 FIX-3 BOLA: this endpoint is purely applicant-facing — applicants list
  // their own CVs. Lock to the JWT-derived identity; ignore any caller-supplied
  // `userid` query param.
  // NOTE: if an employer ever needs to view an applicant's CV in the context of
  // a job application, that must go through a separate scoped endpoint that
  // verifies the employer's company owns the application, not through this route.
  const userId = req.user.uid;
  const searchQuery = `SELECT * from ${dbSchema}.cv where user_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [userId]);

    successMessage.data = rows;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[cvController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getCvById = async (req, res) => {
  const { id } = req.query;
  // QA8 FIX-4 BOLA: add user_id=$2 ownership check so a caller cannot read
  // another applicant's CV by guessing a cv_id.
  // NOTE: if an employer ever needs to view an applicant's CV in a job-application
  // context, that must go through a separate scoped endpoint that verifies the
  // employer's company owns the application — not through this applicant-facing route.
  const searchQuery = `SELECT * from ${dbSchema}.cv where cv_id = $1 AND user_id = $2;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [id, req.user.uid]);
    const dbResponse = rows[0];
    if (!dbResponse) {
      return res.status(403).json({ message: "You don't have permission to view this CV." });
    }
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[cvController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

export { createCV, updateCV, deleteCV, getUserCVlist, getCvById };
