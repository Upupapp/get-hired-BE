import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import { addContact, addGroup, addInGroupList, checkContactIfExist, contactList, editContact, addMultipleContact, listOfGroup, listOfContacts, checkGroupIfExist, editGroup, checkEmailIfExistInContact, groupList } from "../services/contact.service";
import { checkEmailIfExist } from "../helpers/userDetails";
import { getUserCompany } from "./companiesController";
const dbSchema = env.schema;

const createContact = async (req, res) => {
    const contact = req.body;

    try {
        // QA8 FIX-7 BOLA: derive companyId from JWT, never from req.body —
        // any employer could otherwise create a contact attributed to a
        // different company by supplying a spoofed companyId.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        const add = await addContact({ ...contact, companyId })

        if (!add) {
            errorMessage.error = 'Failed to Add Contact';
            return res.status(status.error).send(errorMessage);
        }
        //to add list of emlpoyees

        successMessage.data = add
        return res.status(status.success).send(successMessage);

    }
    catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const multipleContact = async (req, res) => {
    const { groupName, groupId, contacts } = req.body;
    let thisIsContacts = [];
    try {
        // QA8 FIX-7 BOLA: derive companyId from JWT; override any companyId
        // in individual contact objects so callers can't spoof company ownership.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        if (contacts.length > 0) {

            let multiple = new Promise((resolve, reject) => {
                contacts.forEach(async option => {
                    const add = await addMultipleContact({ ...option, companyId }, groupName, groupId)
                    if (!add) {
                        successMessage.data = 'Failed to Add Contact ' + option.email;
                        return res.status(status.error).send(errorMessage);
                    }
                    thisIsContacts.push(add);
                    if (thisIsContacts.length == contacts.length) resolve();
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
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }

};

const deleteContact = async (req, res) => {
    const { contactId } = req.query;

    const checkInDb = await checkContactIfExist(contactId);
    try {
        if (!contactId || !checkInDb) {
            return res.status(status.error).send("Contact does not Exist");
        }

        // QA7 FIX-5 BOLA: verify caller's company owns this contact before deleting.
        // OPT-02 (QA7): ownership check folded into DELETE WHERE clause —
        // eliminates the separate ownership SELECT round-trip. Zero rowCount
        // means contact not found OR company_id mismatch; both return 403.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
        // company_id=$2 folds ownership into the DELETE WHERE.
        const { rowCount } = await dbQuery.query(
            `DELETE FROM ${dbSchema}.contact WHERE contact_id=$1 AND company_id=$2`,
            [contactId, callerCompany.companyId]
        );
        if (rowCount === 0) {
            return res.status(403).json({ message: "You don't have permission to delete this contact." });
        }

        const message = "Contact Successfully Deleted"
        successMessage.data = message;
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const updateContact = async (req, res) => {
    const contact = req.body;
    try {
        // QA7 FIX-5 BOLA: verify caller's company owns this contact before updating.
        // OPT-02 (QA7): ownership check folded into editContact via companyId param —
        // the service's UPDATE WHERE now includes company_id, eliminating the separate
        // SELECT pre-check. Total: getUserCompany + editContact UPDATE = 2 calls (was 3).
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        const contactUpdate = await editContact({ ...contact, companyId: callerCompany.companyId })

        if (!contactUpdate) {
            errorMessage.error = 'Failed to Update Contact';
            return res.status(status.error).send(errorMessage);
        }

        successMessage.data = contactUpdate
        return res.status(status.success).send(successMessage);
    }
    catch (error) {
        if (error && error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: "You don't have permission to update this contact." });
        }
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const list = async (req, res) => {
    let contact = [];
    try {
        // QA9 FIX-12 BOLA: derive companyId from JWT, never from query param —
        // any authenticated employer could read another company's contact list
        // by supplying a different companyId.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        contact = await contactList(companyId);

        if (!contact || contact.length == 0) {
            successMessage.data = [];
            return res.status(status.success).send(successMessage);
        }

        successMessage.data = contact
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const grouplist = async (req, res) => {
    let groups = [];
    try {
        // QA9 FIX-12 BOLA: derive companyId from JWT, never from query param —
        // any authenticated employer could read another company's group list.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        groups = await listOfGroup(companyId);

        if (!groups || groups.length == 0) {
            successMessage.data = [];
            return res.status(status.success).send(successMessage);
        }

        successMessage.data = groups
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const createGroup = async (req, res) => {
    const {groupName, emails} = req.body;
    let thisIsContacts = [];
    try {
        // QA8 FIX-7 BOLA: derive companyId from JWT, never from req.body —
        // any employer could otherwise create a group attributed to a
        // different company by supplying a spoofed companyId.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        const add = await addGroup(groupName, companyId)

        if (!add) {
            errorMessage.error = 'Failed to Create Group';
            return res.status(status.error).send(errorMessage);
        }
        if (emails.length > 0) {

            let multiple = new Promise((resolve, reject) => {
                emails.forEach(async option => {
                    const create = await addInGroupList(add.group_id, option.email)
                    if (!create) {
                        successMessage.data = 'Failed to Add In Group ' + option.email;
                        return res.status(status.error).send(errorMessage);
                    }

                    thisIsContacts.push(create);
                    if (thisIsContacts.length == emails.length) resolve();
                });
            });
            multiple.then(() => {
                const addMultiple = {
                    ...add,
                    contacts: thisIsContacts
                };

                successMessage.data = addMultiple
                return res.status(status.success).send(successMessage);
            });

        }

    }
    catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const updateGroup = async (req, res) => {
    let thisIsContacts = [];
    const {groupId, groupName, emails} = req.body;
    try {
        // QA7 FIX-5 BOLA: verify caller's company owns this group before updating.
        // OPT-02 (QA7): ownership check folded into editGroup via companyId param —
        // editGroup's UPDATE WHERE now includes company_id, eliminating the separate
        // SELECT pre-check. Total: getUserCompany + editGroup UPDATE = 2 calls (was 3).
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        const groupUpdate = await editGroup(groupId, groupName, callerCompany.companyId)

        if (!groupUpdate) {
            errorMessage.error = 'Failed to Update Group';
            return res.status(status.error).send(errorMessage);
        }

        if (emails.length > 0) {

            let multiple = new Promise((resolve, reject) => {
                emails.forEach(async option => {
                    const create = await addInGroupList(groupId, option.email)
                    if (!create) {
                        successMessage.data = 'Failed to Add In Group ' + option.email;
                        return res.status(status.error).send(errorMessage);
                    }
                  
                    thisIsContacts.push(create);
                    if (thisIsContacts.length == emails.length) resolve();
                });
            });
            multiple.then(() => {
                const addMultiple = {
                    ...groupUpdate,
                    contacts: thisIsContacts
                };

                successMessage.data = addMultiple
                return res.status(status.success).send(successMessage);
            });

        } else {
            console.log('Empty email object');
        }
    }
    catch (error) {
        if (error && error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: "You don't have permission to update this group." });
        }
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const contactslist = async (req, res) => {

    const { groupName } = req.query
    let contacts = [];
    try {
        // QA10 FIX-2 BOLA: derive companyId from JWT, never from query param —
        // any authenticated employer could read another company's contact list
        // by supplying a different companyId.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        contacts = await listOfContacts(companyId, groupName);
    
        if (!contacts || contacts.length == 0) {
            successMessage.data = [];
            return res.status(status.success).send(successMessage);
        }

        successMessage.data = contacts
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const deleteGroup = async (req, res) => {
    const { groupId } = req.query;

    const checkInDb = await checkGroupIfExist(groupId);
    try {
        if (!checkInDb) {
            return res.status(status.error).send("Group does not Exist");
        }

        // QA7 FIX-5 BOLA: verify caller's company owns this group before deleting.
        // OPT-02 (QA7): ownership check folded into DELETE WHERE clause —
        // eliminates the separate ownership SELECT. Zero rowCount = group not
        // found OR company_id mismatch; both return 403 with no information leak.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
        // company_id=$2 folds ownership into the DELETE WHERE.
        const { rowCount } = await dbQuery.query(
            `DELETE FROM ${dbSchema}."group" WHERE group_id=$1 AND company_id=$2`,
            [groupId, callerCompany.companyId]
        );
        if (rowCount === 0) {
            return res.status(403).json({ message: "You don't have permission to delete this group." });
        }

        const message = "Group Successfully Deleted"
        successMessage.data = message;
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

const list2 = async (req, res) => {

    let contact = [];
    try {
        // QA10 FIX-2 BOLA: derive companyId from JWT, never from query param —
        // any authenticated employer could read another company's group list
        // by supplying a different companyId.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        contact = await groupList(companyId);
    
        if (!contact || contact.length == 0) {
            successMessage.data = [];
            return res.status(status.success).send(successMessage);
        }

        successMessage.data = contact
        return res.status(status.success).send(successMessage);

    } catch (error) {
        console.error('[contactsController] error:', error);
        errorMessage.error = "Operation not successful. Please try again.";
        return res.status(status.error).send(errorMessage);
    }
};

export {createContact, multipleContact, deleteContact, updateContact, list, createGroup, grouplist, contactslist, deleteGroup, updateGroup,
    list2}