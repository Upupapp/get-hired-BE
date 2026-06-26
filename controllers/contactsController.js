import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
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
            return res.status(status.error).json(errorResponse('Failed to Add Contact'));
        }
        //to add list of emlpoyees

        return res.status(status.success).json(successResponse(add));

    }
    catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
    }
};

const multipleContact = async (req, res) => {
    const { groupName, groupId, contacts } = req.body;
    try {
        // QA8 FIX-7 BOLA: derive companyId from JWT; override any companyId
        // in individual contact objects so callers can't spoof company ownership.
        const callerCompany = await getUserCompany(req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        if (!contacts || contacts.length === 0) {
            return res.status(status.error).json(errorResponse('No contacts provided.'));
        }

        // NOTIFY-P2: replaced broken forEach(async) pattern with Promise.allSettled
        // so that one failure does not silently skip remaining contacts or cause
        // double-response "headers already sent" errors in Express.
        const settled = await Promise.allSettled(
            contacts.map(option => addMultipleContact({ ...option, companyId }, groupName, groupId))
        );

        const addedItems = settled
            .filter(r => r.status === 'fulfilled' && r.value && r.value.status === 'ADDED')
            .map(r => r.value);
        const duplicateCount = settled.filter(r => r.status === 'fulfilled' && r.value && r.value.status === 'DUPLICATE_CONTACT').length;
        const failureCount = settled.filter(r => r.status === 'rejected').length;
        const successCount = addedItems.length;
        const totalRequested = contacts.length;

        const outcome = successCount > 0
            ? (failureCount > 0 ? 'partial_success' : 'all_success')
            : (duplicateCount > 0 ? 'duplicate_only' : 'all_failed');

        const summary = { totalRequested, successCount, failureCount, duplicateCount, outcome };
        console.info('[NOTIFY_P2_CONTACT_INVITE_MULTIPLE]', { endpoint: 'POST /contacts/multiplecontact', ...summary });

        return res.status(status.success).json(successResponse({ contacts: addedItems, summary }));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
        return res.status(status.success).json(successResponse(message));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.error).json(errorResponse('Failed to Update Contact'));
        }

        return res.status(status.success).json(successResponse(contactUpdate));
    }
    catch (error) {
        if (error && error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: "You don't have permission to update this contact." });
        }
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.success).json(successResponse([]));
        }

        return res.status(status.success).json(successResponse(contact));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.success).json(successResponse([]));
        }

        return res.status(status.success).json(successResponse(groups));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.error).json(errorResponse('Failed to Create Group'));
        }
        if (emails.length > 0) {
            const settled = await Promise.allSettled(
                emails.map(option => addInGroupList(add.group_id, option.email))
            );
            thisIsContacts = settled
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
        }

        return res.status(status.success).json(successResponse({ ...add, contacts: thisIsContacts }));

    }
    catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.error).json(errorResponse('Failed to Update Group'));
        }

        if (emails.length > 0) {
            const settled = await Promise.allSettled(
                emails.map(option => addInGroupList(groupId, option.email))
            );
            thisIsContacts = settled
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
        }

        return res.status(status.success).json(successResponse({ ...groupUpdate, contacts: thisIsContacts }));
    }
    catch (error) {
        if (error && error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: "You don't have permission to update this group." });
        }
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.success).json(successResponse([]));
        }

        return res.status(status.success).json(successResponse(contacts));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
        return res.status(status.success).json(successResponse(message));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
            return res.status(status.success).json(successResponse([]));
        }

        return res.status(status.success).json(successResponse(contact));

    } catch (error) {
        console.error('[contactsController] error:', error);
        return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
    }
};

export {createContact, multipleContact, deleteContact, updateContact, list, createGroup, grouplist, contactslist, deleteGroup, updateGroup,
    list2}