import dbQuery from "../db/dbQuery";
import { send } from "../helpers/mailer";
import env from "../env";
const dbSchema = env.schema;

const addContact = async (contact) => {
    let message = "";
    const {
        companyId,
        userId,
        firstName,
        lastName,
        email,
        mobileNumber,
        address,
        jobId,
        group
    } = contact;
    try {
        
        const ifExistContact = await checkEmailIfExistInContact(email);
        console.log(ifExistContact)
        //const ifRegistered = await checkEmailIfExistInContactAndRegistered(email, userId)

        if (ifExistContact) {
            message = "Successfully add contact"
            return { message };
        }
        const insertQuery = `INSERT INTO ${dbSchema}.contact
                          (user_id, first_name, last_name, email, mobile_number, address, 
                               created_at, job_id, "group", company_id)
                            VALUES($1, $2, $3, $4, $5, $6, current_timestamp, $7, $8, $9) returning *;`;

        const { rows } = await dbQuery.query(insertQuery, [
            userId,
            firstName,
            lastName,
            email,
            mobileNumber,
            address,
            jobId,
            group,
            companyId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Add Contact");
        }

        message = "Successfully add contact"
        return { ...dbResponse, message };



    } catch (error) {
        throw Error(error);
    }
};

const checkEmailIfExistInContact = async (email) => {

    // TODO (Filter by agency)
    try {

        const searchQuery = `SELECT email
            FROM ${dbSchema}.contact
            where contact.email = $1;`;
        const { rows } = await dbQuery.query(searchQuery, [
            email
        ]);

        if (!rows || rows.length === 0) {
            return false;
        }

        return true;

    } catch {
        throw Error("Operation Failed");
    }
};

const checkContactIfExist = async (contactId) => {
    const searchQuery = `SELECT * FROM ${dbSchema}.contact WHERE contact_id='${contactId}';`;

    try {
        const { rows } = await dbQuery.query(searchQuery, []);

        if (!rows || rows.length === 0) {
            return false;
        }

        return true;
    } catch {
        throw Error("Operation Failed");
    }
};

const editContact = async (contact) => {
  
    const { 
        firstName,
        lastName,
        email,
        mobileNumber,
        address,
        jobId,
        group,
        contactId
    } = contact;

    try {
        const updateQuery = `UPDATE ${dbSchema}.contact
                            SET  first_name=$1, last_name=$2, email=$3, mobile_number=$4, address=$5, job_id=$6, "group"=$7
                            WHERE contact_id=$8 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [firstName,
            lastName,
            email,
            mobileNumber,
            address,
            jobId,
            group,
            contactId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Update Contact");
        }

        return dbResponse;
    } catch (error) {
        throw Error(error);
    }
};

export {addContact, checkContactIfExist, editContact}