import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";

import { addCandidates, candidateList, checkCandidateIfExist, editCandidate } from "../services/candidate.service";

const createCandidate = async (req, res) => {
    const candidate = req.body;
    try {
        const add = await addCandidates(candidate)
        if (!add) {
            errorMessage.error = 'Failed to Add Candidate';
            return res.status(status.error).send(errorMessage);
        }
        //to add list of emlpoyees
        successMessage.data = add
        return res.status(status.success).send(successMessage);
    }
    catch (error) {
        errorMessage.error = 'Operation was not successful' + error;
        return res.status(status.error).send(errorMessage);
    }
};
const multipleCandidate = async (req, res) => {
    const { candidate } = req.body;
    let thisIsContacts = [];
    try {
        if (candidate.length > 0) {
            let multiple = new Promise((resolve, reject) => {
                candidate.forEach(async option => {
                    const add = await addCandidates(option)
                    if (!add) {
                        successMessage.data = 'Failed to Add Candidates ' + option.email;
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
                successMessage.data = thisIsContacts
                return res.status(status.success).send(successMessage);
            });
        }
    } catch (error) {
        errorMessage.error = "Operation was not successful, " + error;
        return res.status(status.error).send(errorMessage);
    }
};
const deleteCandidate = async (req, res) => {
    const { candidateId } = req.query;
    const deleteQuery = `DELETE FROM ${dbSchema}.candidates
                        WHERE candidate_id='${candidateId}';`;
    const checkInDb = await checkCandidateIfExist(candidateId);
    try {
        if (!candidateId || !checkInDb) {
            return res.status(status.error).send("Candidate does not Exist");
        }
        const { rows } = await dbQuery.query(deleteQuery, []);
        const message = "Candidate Successfully Deleted"
        successMessage.data = message;
        return res.status(status.success).send(successMessage);
    } catch (error) {
        errorMessage.error = 'Operation was not successful ' + error;
        return res.status(status.error).send(errorMessage);
    }
};
const updateCandidate = async (req, res) => {
    const candidate = req.body;
    try {
        const candidateUpdate = await editCandidate(candidate)
        if (!candidateUpdate) {
            errorMessage.error = 'Failed to Update Candidate';
            return res.status(status.error).send(errorMessage);
        }
        // const notify = await notifyCreateEventForMember(eventUpdate.eventid, eventUpdate.learninghubid)
        //to add list of emlpoyees
        successMessage.data = candidateUpdate
        return res.status(status.success).send(successMessage);
    }
    catch (error) {
        errorMessage.error = 'Operation was not successful' + error;
        return res.status(status.error).send(errorMessage);
    }
};

const list = async (req, res) => {
    const { companyId } = req.query
    let candidate = [];
    try {
        candidate = await candidateList(companyId);

        if (!candidate || candidate.length == 0) {
            successMessage.data = [];
            return res.status(status.error).send(successMessage);
        }
        successMessage.data = candidate
        return res.status(status.success).send(successMessage);
    } catch (error) {
        errorMessage.error = "Operation was not successful" + error;
        return res.status(status.error).send(errorMessage);
    }
};

export {createCandidate, multipleCandidate, deleteCandidate, updateCandidate, list}