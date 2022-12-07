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
        groupName,
        groupId
    } = contact;
    try {

        let nameOfCompany = await getCompanyName(companyId);
        const ifExistContact = await checkEmailIfExistInContact(email, companyId);

        if (ifExistContact) {
            if (groupName == '' && groupId == '') {
                message = "Contact aleady exist"
                return { message };
            } else if (groupName == '') {
                const check = await checkIfExistInGroup(email, groupId)
                if (check) {
                    message = "Contact aleady exist in your list and in group"
                    return { message };
                }
                
                const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
                const addToGroupList = await addInGroupList(groupId, email)
                message = "Contact aleady exist, but has been added to group"
                return { message };
            } else {
                const check = await checkGroupNameIfExist(groupName)
                if (check) {
                    const selectQuery = `SELECT group_id FROM gethired."group" where group_name ='${groupName}';`;
                    const { rows } = await dbQuery.query(selectQuery, []);
                    const response = rows[0]
                    const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
                    const addToGroupList = await addInGroupList(response.group_id, email)
                    message = "Contact aleady exist, but has been added to the existing group"
                    return { message };
                }
                const addToGroup = await addGroup(groupName, companyId)
                const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
                const addToGroupList = await addInGroupList(addToGroup.group_id, email)
                message = "Contact aleady exist, but has been added to the new group"
                return { message };
            }
        }
        const insertQuery = `INSERT INTO ${dbSchema}.contact
                          (user_id, first_name, last_name, email, mobile_number, address, 
                               created_at, company_id)
                            VALUES($1, $2, $3, $4, $5, $6, current_timestamp, $7) returning *;`;

        const { rows } = await dbQuery.query(insertQuery, [
            userId,
            firstName,
            lastName,
            email,
            mobileNumber,
            address,
            companyId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Add Contact");
        }

        if (groupName == '' && groupId == '') {
            const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
            message = "Successfully add contact"
            return { ...dbResponse, message };
        } else if (groupName == '') {
            const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
            const addToGroupList = await addInGroupList(groupId, email)
            message = "Successfully add contact"
            return { ...dbResponse, message };
        } else {
            const check = await checkGroupNameIfExist(groupName)
            if (check) {
                const selectQuery = `SELECT group_id FROM gethired."group" where group_name ='${groupName}';`;
                const { rows } = await dbQuery.query(selectQuery, []);
                const response = rows[0];
                const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
                const addToGroupList = await addInGroupList(response.group_id, email)
                message = "Successfully add contact"
                return { ...dbResponse, message };
            }
            const addToGroup = await addGroup(groupName, companyId)
            const sendEmail = await sendEmailAdded(email, firstName, nameOfCompany);
            const addToGroupList = await addInGroupList(addToGroup.group_id, email)
            message = "Successfully add contact"
            return { ...dbResponse, message };
        }

    } catch (error) {
        throw Error(error);
    }
};

const addMultipleContact = async (contact, groupName, groupId) => {
    let message = "";
    const {
        companyId,
        userId,
        firstName,
        lastName,
        email,
        mobileNumber,
        address
    } = contact;
    try {

        const ifExistContact = await checkEmailIfExistInContact(email, companyId);

        if (ifExistContact) {
            if (groupName == '' && groupId == '') {
                message = "Contact aleady exist"
                return { message };
            } else if (groupName == '') {
                const check = await checkIfExistInGroup(email, groupId)
                if (check) {
                    message = "Contact aleady exist in your list and in group"
                    return { message };
                }
                const addToGroupList = await addInGroupList(groupId, email)
                message = "Contact aleady exist, but has been added to group"
                return { message };
            } else {
                const check = await checkGroupNameIfExist(groupName)
                if (check) {
                    const selectQuery = `SELECT group_id FROM gethired."group" where group_name ='${groupName}';`;
                    const { rows } = await dbQuery.query(selectQuery, []);
                    const response = rows[0]
                    const addToGroupList = await addInGroupList(response.group_id, email)
                    message = "Contact aleady exist, but has been added to the existing group"
                    return { message };
                }
                const addToGroup = await addGroup(groupName, companyId)
                const addToGroupList = await addInGroupList(addToGroup.group_id, email)
                message = "Contact aleady exist, but has been added to the new group"
                return { message };
            }
        }
        const insertQuery = `INSERT INTO ${dbSchema}.contact
                          (user_id, first_name, last_name, email, mobile_number, address, 
                               created_at, company_id)
                            VALUES($1, $2, $3, $4, $5, $6, current_timestamp, $7) returning *;`;

        const { rows } = await dbQuery.query(insertQuery, [
            userId,
            firstName,
            lastName,
            email,
            mobileNumber,
            address,
            companyId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Add Contact");
        }

        if (groupName == '' && groupId == '') {
            message = "Successfully add contact"
            return { ...dbResponse, message };
        } else if (groupName == '') {
            const addToGroupList = await addInGroupList(groupId, email)
            message = "Successfully add contact"
            return { ...dbResponse, message };
        } else {
            const check = await checkGroupNameIfExist(groupName)
            if (check) {
                const selectQuery = `SELECT group_id FROM gethired."group" where group_name ='${groupName}';`;
                const { rows } = await dbQuery.query(selectQuery, []);
                const response = rows[0]
                const addToGroupList = await addInGroupList(response.group_id, email)
                message = "Successfully add contact"
                return { ...dbResponse, message };
            }
            const addToGroup = await addGroup(groupName, companyId)
            const addToGroupList = await addInGroupList(addToGroup.group_id, email)
            message = "Successfully add contact"
            return { ...dbResponse, message };
        }

    } catch (error) {
        throw Error(error);
    }
};

const checkEmailIfExistInContact = async (email, companyId) => {

    // TODO (Filter by agency)
    try {

        const searchQuery = `SELECT email
            FROM ${dbSchema}.contact
            where contact.email = $1 and contact.company_id = $2;`;
        const { rows } = await dbQuery.query(searchQuery, [
            email,
            companyId
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
let message = "";
    const {
        firstName,
        lastName,
        email,
        mobileNumber,
        address,
        groupName,
        groupId,
        contactId
    } = contact;

    try {
        const updateQuery = `UPDATE ${dbSchema}.contact
                            SET  first_name=$1, last_name=$2, email=$3, mobile_number=$4, address=$5
                            WHERE contact_id=$6 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [firstName,
            lastName,
            email,
            mobileNumber,
            address,
            contactId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Update Contact");
        }
        if (groupName == '' && groupId == '') {
            message = "Successfully update contact"
            return { ...dbResponse, message };
        } else if (groupName == '') {
            const addToGroupList = await addInGroupList(groupId, email)
            message = "Successfully update contact"
            return { ...dbResponse, message };
        } else {
            const check = await checkGroupNameIfExist(groupName)
            if (check) {
                const selectQuery = `SELECT group_id FROM gethired."group" where group_name ='${groupName}';`;
                const { rows } = await dbQuery.query(selectQuery, []);
                const response = rows[0]
                const addToGroupList = await addInGroupList(response.group_id, email)
                message = "Successfully update contact"
                return { ...dbResponse, message };
            }
            const addToGroup = await addGroup(groupName, companyId)
            const addToGroupList = await addInGroupList(addToGroup.group_id, email)
            message = "Successfully update contact"
            return { ...dbResponse, message };
        }
    } catch (error) {
        throw Error(error);
    }
};

const contactList = async (companyId) => {
    try {
        const searchQuery = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.first_name, c.last_name, c.email, c.mobile_number, c.address, c.contact_id,
                                c.created_at, c.company_id 
                            FROM gethired.contact c
                            where c.company_id = '${companyId}'
                            order by created_at DESC;`;
        const searchQuery2 = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.first_name, c.last_name, c.email, c.mobile_number, c.address, 
                            c.created_at, c.job_id, j.job_title, c.status, c.candidate_id
                        FROM gethired.candidates c
                        right join gethired.jobs j on j.job_id = c.job_id
                        where c.company_id = '${companyId}'
                        order by created_at DESC;`;

        const searchQuery3 =  `SELECT concat(u.firstname, ' ', u.lastname) as full_name, u.firstname, u.lastname, u.email, u.cell_number as mobile_number, u.address, 
                        j.date_applied as created_at,  jo.job_id , jo.job_title, s.job_applicant_status_name as status , u.uid as candidate_id
                       FROM gethired.job_applicants j
                       left join gethired.jobs jo on jo.job_id = j.job_id
                       left join gethired.applicants_profile ap on ap.user_id = j.candidate_id
                       left join gethired.users u on u.uid = ap.user_id
                       left join gethired.job_applicant_status s on j.application_status_id = s.job_applicant_status_id
                       where jo.company_id = '${companyId}'`;

        const { rows } = await dbQuery.query(searchQuery, []);
        const candidates = await dbQuery.query(searchQuery2, []);
        const applicants = await dbQuery.query(searchQuery3, []);
        const dbResponse = rows;
        candidates.rows.forEach(row => dbResponse.push(row))
        applicants.rows.forEach(row => dbResponse.push(row))
        if (!dbResponse) {
            throw Error(error);
        }

        const output = await Promise.all(dbResponse.map(async (complete) => {
            return await checkGroups(complete);
        }));

        return output;

    } catch (error) {
        throw Error(error);
    }
};

const checkGroups = async (complete) => {
    
    const searchQuery = `SELECT l.group_id, g.group_name
                        FROM gethired.group_list l
                        right join gethired."group" g on g.group_id = l.group_id 
                        where l.email = '${complete.email}' and g.company_id = '${complete.company_id}';`;
    let value = "";
    try {
        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

        if (!dbResponse) {
            throw Error(errorMessage);
        };

        const usersList = {
            ...complete,
            groups: dbResponse
        };

        return usersList;
    } catch (error) {
        throw Error(error);
    }
};

const addGroup = async (groupName, companyId) => {
    let message = "";

    try {
        const insertQuery = `INSERT INTO ${dbSchema}."group" (group_name, created_date, company_id)
        VALUES($1, current_timestamp, $2) returning *;`;

        const { rows } = await dbQuery.query(insertQuery, [
            groupName,
            companyId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Add in Group");
        }

        message = "Successfully add to group"
        return { ...dbResponse, message };

    } catch (error) {
        throw Error(error);
    }
};

const editGroup = async (groupId, groupName) => {

    try {
        const updateQuery = `UPDATE ${dbSchema}.group
                            SET  group_name=$1
                            WHERE group_id=$2 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [
            groupName,
            groupId
        ]);

        if (!rows[0]) {
            throw Error("Failed to Update Group List");
        }

        const dbResponse = rows[0];

        return dbResponse;
    } catch (error) {
        throw Error(error);
    }
};

const addInGroupList = async (groupId, email) => {
    let message = "";
    try {
        const updateQuery = `INSERT INTO ${dbSchema}.group_list
                            (email, group_id) VALUES ($1, $2) on conflict on constraint group_list_un do nothing returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [
            email,
            groupId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            message = "Contact aleady exist in your list and in group"
            return { message };
        }

        return dbResponse;
    } catch (error) {
        throw Error(error);
    }
};

const checkIfExistInGroup = async (email, groupId) => {
    const searchQuery = `SELECT email FROM ${dbSchema}.group_list WHERE email = '${email}' and group_id='${groupId}';`;

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

const checkGroupIfExist = async (groupId) => {
    const searchQuery = `SELECT * FROM ${dbSchema}.group WHERE group_id='${groupId}';`;

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

const checkGroupNameIfExist = async (groupName) => {
    const searchQuery = `SELECT * FROM ${dbSchema}.group WHERE group_name='${groupName}';`;

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

const getGroupId= async (companyId) => {
    const searchQuery = `SELECT group_id
    FROM ${dbSchema}.group where company_id = $1`;

    try {
        const { rows } = await dbQuery.query(searchQuery, [companyId]);
        return rows[0].groupid;
    } catch (error) {
        throw Error(error);
    }
};

const listOfGroup = async (companyId) => {
    try {
        const searchQuery = `SELECT group_id, group_name
                            FROM gethired."group"
                            where company_id = '${companyId}';`;

        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

        if (!dbResponse) {
            throw Error(error);
        }

        return dbResponse;

    } catch (error) {
        throw Error(error);
    }
};

const getCompanyName= async (companyId) => {
    const searchQuery = `SELECT company_name
    FROM ${dbSchema}.companies where company_id = $1`;

    try {
        const { rows } = await dbQuery.query(searchQuery, [companyId]);
        return rows[0].company_name;
    } catch (error) {
        throw Error(error);
    }
};

const listOfContacts = async (companyId, groupName) => {
    try {
        const searchQuery = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.email, c.contact_id 
                            FROM gethired.contact c
                            where not exists(select email from gethired.group_list
                            right join gethired."group" g on g.group_id = group_list.group_id
                            where group_list.email = c.email 
                            and g.group_name = '${groupName}') 
                            and c.company_id = '${companyId}'
                            order by created_at DESC;`;

        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

        if (!dbResponse) {
            throw Error(error);
        }

        return dbResponse;

    } catch (error) {
        throw Error(error);
    }
};

const checkContacts = async (complete) => {
    const searchQuery = ` SELECT l.email, u.firstname, u.lastname, u.email, u.cell_number, u.address
                        FROM gethired.group_list l
                        right join gethired.users u on u.email = l.email
                        where l.group_id = '${complete.group_id}'
                        union
                        SELECT l.email, c.first_name, c.last_name, c.email, c.mobile_number, c.address
                        FROM gethired.group_list l
                        right join gethired.contact c on c.email = l.email 
                        where l.group_id = '${complete.group_id}';`;
    let value = "";
    try {
        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

        if (!dbResponse) {
            throw Error(errorMessage);
        };

        const usersList = {
            ...complete,
            details: dbResponse
        };

        return usersList;
    } catch (error) {
        throw Error(error);
    }
};

const groupList = async (companyId) => {
    try {
        const searchQuery = `SELECT group_id, group_name, created_date
                            FROM gethired."group"
                            where company_id = '${companyId}'
                            order by created_date DESC;`;

        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

        if (!dbResponse) {
            throw Error(error);
        }

        const output = await Promise.all(dbResponse.map(async (complete) => {
            return await checkContacts(complete);
        }));

        return output;

    } catch (error) {
        throw Error(error);
    }
};

const sendEmailAdded = async (email, firstName, company) => {
    const userData = {
        name: firstName,
        company: company,
        app_url: `${env.app_url}/signup`
    };
    send(email, "contact", userData);
    return { msg: "Email has been sent", link: `${env.app_url}/signup` };
};

export { addContact, checkContactIfExist, editContact, contactList, checkGroupIfExist, addGroup, addInGroupList, getGroupId, checkIfExistInGroup,
    addMultipleContact, listOfGroup, listOfContacts, editGroup, checkEmailIfExistInContact, groupList, sendEmailAdded}