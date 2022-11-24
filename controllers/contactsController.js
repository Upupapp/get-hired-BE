import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import { addContact, checkContactIfExist, editContact } from "../services/contact.service";
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
    const { contacts } = req.body;
    let thisIsContacts = [];
    try {

        if (contacts.length > 0) {

            let multiple = new Promise((resolve, reject) => {
                contacts.forEach(async option => {
                    const add = await addContact(option)
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
        // const notify = await notifyCreateEventForMember(eventUpdate.eventid, eventUpdate.learninghubid)
        //to add list of emlpoyees

        successMessage.data = contactUpdate
        return res.status(status.success).send(successMessage);
    }
    catch (error) {
        errorMessage.error = 'Operation was not successful' + error;
        return res.status(status.error).send(errorMessage);
    }
};

const contactListwStatus = async (req, res) => {

    const { userId } = req.query
    let contact = [];
    try {
        // const checkUserId = await checkUserIfExist2(payload.userId);

        // if (!checkUserId) {
        //     errorMessage.error = "User does not exist";
        //     return res.status(status.error).send(errorMessage);
        // }
        const role = await getUserRoleById(userId);
        if (role == '2') {
            contact = [...await getContactListOfMyTeamMembers(userId), ...await contactList(userId)];
        } else {
            contact = await contactList(userId);
        }

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


export {createContact, multipleContact, deleteContact, updateContact}