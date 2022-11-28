import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import { addContact, addGroup, addInGroupList, checkContactIfExist, contactList, editContact, addMultipleContact, listOfGroup } from "../services/contact.service";
const dbSchema = env.schema;

const createContact = async (req, res) => {
    const contact = req.body;

    try {

        const add = await addContact(contact)

        if (!add) {
            errorMessage.error = 'Failed to Add Contact';
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

const multipleContact = async (req, res) => {
    const { groupName, groupId, contacts } = req.body;
    let thisIsContacts = [];
    try {
        if (contacts.length > 0) {

            let multiple = new Promise((resolve, reject) => {
                contacts.forEach(async option => {
                    const add = await addMultipleContact(option, groupName, groupId)
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
        errorMessage.error = "Operation was not successful, " + error;
        return res.status(status.error).send(errorMessage);
    }

};

const deleteContact = async (req, res) => {
    const { contactId } = req.query;

    const deleteQuery = `DELETE FROM ${dbSchema}.contact
                        WHERE contact_id='${contactId}';`;

    const checkInDb = await checkContactIfExist(contactId);
    try {
        if (!contactId || !checkInDb) {
            return res.status(status.error).send("Contact does not Exist");
        }

        const { rows } = await dbQuery.query(deleteQuery, []);

        const message = "Contact Successfully Deleted"
        successMessage.data = message;
        return res.status(status.success).send(successMessage);

    } catch (error) {
        errorMessage.error = 'Operation was not successful ' + error;
        return res.status(status.error).send(errorMessage);
    }
};

const updateContact = async (req, res) => {
    const contact = req.body;
    try {
        const contactUpdate = await editContact(contact)

        if (!contactUpdate) {
            errorMessage.error = 'Failed to Update Contact';
            return res.status(status.error).send(errorMessage);
        }

        successMessage.data = contactUpdate
        return res.status(status.success).send(successMessage);
    }
    catch (error) {
        errorMessage.error = 'Operation was not successful' + error;
        return res.status(status.error).send(errorMessage);
    }
};

const list = async (req, res) => {

    const { companyId } = req.query
    let contact = [];
    try {
   
        contact = await contactList(companyId);
    
        if (!contact || contact.length == 0) {
            successMessage.data = [];
            return res.status(status.error).send(successMessage);
        }

        successMessage.data = contact
        return res.status(status.success).send(successMessage);

    } catch (error) {
        errorMessage.error = "Operation was not successful" + error;
        return res.status(status.error).send(errorMessage);
    }
};

const grouplist = async (req, res) => {

    const { companyId } = req.query
    let groups = [];
    try {
   
        groups = await listOfGroup(companyId);
    
        if (!groups || groups.length == 0) {
            successMessage.data = [];
            return res.status(status.error).send(successMessage);
        }

        successMessage.data = groups
        return res.status(status.success).send(successMessage);

    } catch (error) {
        errorMessage.error = "Operation was not successful" + error;
        return res.status(status.error).send(errorMessage);
    }
};


const createGroup = async (req, res) => {
    const {groupName, companyId, emails} = req.body;
    let thisIsContacts = [];
    try {

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
        errorMessage.error = 'Operation was not successful' + error;
        return res.status(status.error).send(errorMessage);
    }
};

export {createContact, multipleContact, deleteContact, updateContact, list, createGroup, grouplist}