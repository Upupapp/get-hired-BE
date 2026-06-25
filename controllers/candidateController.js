import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";
import { getUserCompany } from "./companiesController";

import {
  addCandidates,
  candidateList,
  checkCandidateIfExist,
  editCandidate,
  listOfAppliedJobsById
} from "../services/candidate.service";

const dbSchema = env.schema;

const createCandidate = async (req, res) => {
  const candidate = req.body;
  try {
    // QA10 FIX-5 BOLA: derive companyId from JWT, never from req.body —
    // any employer could otherwise create a candidate attributed to a
    // different company by supplying a spoofed companyId.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    const add = await addCandidates({ ...candidate, companyId });
    if (!add) {
      return res.status(status.error).json(errorResponse("Failed to Add Candidate"));
    }
    //to add list of emlpoyees
    return res.status(status.success).json(successResponse(add));
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};
const multipleCandidate = async (req, res) => {
  const { candidate } = req.body;
  let thisIsContacts = [];
  try {
    // QA10 FIX-5 BOLA: derive companyId from JWT; override any companyId
    // in individual candidate objects so callers can't spoof company ownership.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    if (candidate.length > 0) {
      let multiple = new Promise((resolve, reject) => {
        candidate.forEach(async (option) => {
          const add = await addCandidates({ ...option, companyId });
          if (!add) {
            return res.status(status.error).json(errorResponse("Failed to Add Candidates " + option.email));
          }
          thisIsContacts.push(add);
          if (thisIsContacts.length == candidate.length) resolve();
        });
      });
      multiple.then(() => {
        // const addMultiple = {
        //     contacts: thisIsContacts
        // };
        return res.status(status.success).json(successResponse(thisIsContacts));
      });
    }
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};
const deleteCandidate = async (req, res) => {
  const { candidateId } = req.query;
  // QA9 FIX-7: employer-facing endpoint (candidates table has company_id set
  // at import time). Fold ownership check into DELETE WHERE company_id=$2 so
  // an employer can only delete candidates belonging to their own company.
  const checkInDb = await checkCandidateIfExist(candidateId);
  try {
    if (!candidateId || !checkInDb) {
      return res.status(status.error).send("Candidate does not Exist");
    }

    // Derive company from JWT — never trust caller-supplied companyId.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    // Parameterized, not string-interpolated. company_id=$2 folds ownership
    // into the DELETE WHERE (zero rowCount = not found or company mismatch).
    const { rowCount } = await dbQuery.query(
      `DELETE FROM ${dbSchema}.candidates WHERE candidate_id=$1 AND company_id=$2`,
      [candidateId, callerCompany.companyId]
    );
    if (rowCount === 0) {
      return res.status(403).json({ message: "You don't have permission to delete this candidate." });
    }

    const message = "Candidate Successfully Deleted";
    return res.status(status.success).json(successResponse(message));
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};
const updateCandidate = async (req, res) => {
  const candidate = req.body;
  try {
    // QA10 FIX-6 BOLA: derive companyId from JWT and fold into the UPDATE WHERE
    // so an employer can only update candidates belonging to their own company.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const candidateUpdate = await editCandidate({ ...candidate, companyId: callerCompany.companyId });
    if (!candidateUpdate) {
      return res.status(status.error).json(errorResponse("Failed to Update Candidate"));
    }
    // const notify = await notifyCreateEventForMember(eventUpdate.eventid, eventUpdate.learninghubid)
    //to add list of emlpoyees
    return res.status(status.success).json(successResponse(candidateUpdate));
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const list = async (req, res) => {
  let candidate = [];
  try {
    // QA10 FIX-4 BOLA: derive companyId from JWT, never from query param —
    // any authenticated employer could read another company's candidate list
    // by supplying a different companyId.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    candidate = await candidateList(companyId);

    if (!candidate || candidate.length == 0) {
      return res.status(status.success).json(successResponse([]));
    }
    return res.status(status.success).json(successResponse(candidate));
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse(listOfJob));
  } catch (error) {
    console.error('[candidateController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
