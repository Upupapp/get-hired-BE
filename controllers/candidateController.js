import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";

import {
  addCandidates,
  candidateList,
  checkCandidateIfExist,
  editCandidate,
  listOfAppliedJobsById
} from "../services/candidate.service";

const createCandidate = async (req, res) => {
  const candidate = req.body;
  try {
    const add = await addCandidates(candidate);
    if (!add) {
      errorMessage.error = "Failed to Add Candidate";
      return res.status(status.error).send(errorMessage);
    }
    //to add list of emlpoyees
    successMessage.data = add;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};
const multipleCandidate = async (req, res) => {
  const { candidate } = req.body;
  let thisIsContacts = [];
  try {
    if (candidate.length > 0) {
      let multiple = new Promise((resolve, reject) => {
        candidate.forEach(async (option) => {
          const add = await addCandidates(option);
          if (!add) {
            successMessage.data = "Failed to Add Candidates " + option.email;
            return res.status(status.error).send(errorMessage);
          }
          thisIsContacts.push(add);
          if (thisIsContacts.length == candidate.length) resolve();
        });
      });
      multiple.then(() => {
        // const addMultiple = {
        //     contacts: thisIsContacts
        // };
        successMessage.data = thisIsContacts;
        return res.status(status.success).send(successMessage);
      });
    }
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};
const deleteCandidate = async (req, res) => {
  const { candidateId } = req.query;
  // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
  const deleteQuery = `DELETE FROM ${dbSchema}.candidates
                        WHERE candidate_id=$1;`;
  const checkInDb = await checkCandidateIfExist(candidateId);
  try {
    if (!candidateId || !checkInDb) {
      return res.status(status.error).send("Candidate does not Exist");
    }
    const { rows } = await dbQuery.query(deleteQuery, [candidateId]);
    const message = "Candidate Successfully Deleted";
    successMessage.data = message;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};
const updateCandidate = async (req, res) => {
  const candidate = req.body;
  try {
    const candidateUpdate = await editCandidate(candidate);
    if (!candidateUpdate) {
      errorMessage.error = "Failed to Update Candidate";
      return res.status(status.error).send(errorMessage);
    }
    // const notify = await notifyCreateEventForMember(eventUpdate.eventid, eventUpdate.learninghubid)
    //to add list of emlpoyees
    successMessage.data = candidateUpdate;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const list = async (req, res) => {
  const { companyId } = req.query;
  let candidate = [];
  try {
    candidate = await candidateList(companyId);

    if (!candidate || candidate.length == 0) {
      successMessage.data = [];
      return res.status(status.success).send(successMessage);
    }
    successMessage.data = candidate;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobAppliedList = async (req, res) => {
  // Object-level-authorization fix: this previously trusted a
  // client-supplied candidateId, letting any authenticated caller view any
  // other applicant's application history. Zero frontend consumers found
  // for this endpoint anywhere in the repo (applicant or recruiter side),
  // so this is the first real caller -- scoped to "view your own
  // applications only" since that's the only confirmed use case.
  const { uid } = req.user;
  try {
    const listOfJob = await listOfAppliedJobsById(uid);
    successMessage.data = listOfJob;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[candidateController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

export {
  createCandidate,
  multipleCandidate,
  deleteCandidate,
  updateCandidate,
  list,
  getJobAppliedList,
};
