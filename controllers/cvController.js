import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";

const dbSchema = env.schema;

const createCV = async (req, res) => {
  const {
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
  } = req.body;

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
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateCV = async (req, res) => {
  const {
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
  } = req.body;

  try {
    const updateQuery = `UPDATE ${dbSchema}.cv
        SET user_id=$1, name=$2, title=$3, contactnumber=$4, location=$5, category=$6, description=$7, skills=$8, cvstatus=$9, experience=$10, education=$11
        WHERE cv_id =$12 returning *;`;

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
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Update CV";
      return res.status(status.error).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const deleteCV = async (req, res) => {
  const { cvId } = req.body;
  const deleteQuery = `DELETE FROM ${dbSchema}.cv
  WHERE cv_id='${cvId}'`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, []);

    successMessage.data = "CV has been Deleted";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getUserCVlist = async (req, res) => {
  const { userid } = req.query;
  const searchQuery = `SELECT * from ${dbSchema}.cv where user_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [userid]);

    successMessage.data = rows;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getCvById = async (req, res) => {
  const { id } = req.query;
  const searchQuery = `SELECT * from ${dbSchema}.cv where cv_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [id]);
    const dbResponse = rows[0];
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { createCV, updateCV, deleteCV, getUserCVlist, getCvById };
