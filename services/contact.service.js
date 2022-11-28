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

        const ifExistContact = await checkEmailIfExistInContact(email);

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
        const searchQuery = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.email, c.mobile_number, c.address, 
                                c.created_at
                            FROM gethired.contact c
                            where c.company_id = '${companyId}'
                            order by created_at ASC;`;

        const { rows } = await dbQuery.query(searchQuery, []);

        const dbResponse = rows;

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
                        where l.email = '${complete.email}';`;
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

const editGroup = async (groupId, groupName, userId) => {

    try {
        const updateQuery = `UPDATE ${dbSchema}.group
                            SET  group_name=$1, user_id=$2
                            WHERE group_id=$3 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [firstName,
            groupName,
            userId,
            groupId
        ]);

        const dbResponse = rows[0];
        if (!dbResponse) {
            throw Error("Failed to Update Group List");
        }

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

export { addContact, checkContactIfExist, editContact, contactList, checkGroupIfExist, addGroup, addInGroupList, getGroupId, checkIfExistInGroup}