import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";
import { addContact, addGroup, addInGroupList, removeFromGroupList, checkContactIfExist, contactList, editContact, addMultipleContact, listOfGroup, listOfContacts, checkGroupIfExist, editGroup, checkEmailIfExistInContact, groupList } from "../services/contact.service";
import { checkEmailIfExist } from "../helpers/userDetails";
import { getUserCompanyForRequest } from "./companiesController";
import { getAccessContextForRequest } from "../services/accessControl.service";
const dbSchema = env.schema;

const createContact = async (req, res) => {
    const contact = req.body;

    try {
        // QA8 FIX-7 BOLA: derive companyId from JWT, never from req.body —
        // any employer could otherwise create a contact attributed to a
        // different company by supplying a spoofed companyId.
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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

    // TALENT_BACKEND_PHASE1_BOUNDED_REPAIR_V1: malformed/missing contactId is a
    // client input error (400), not "contact does not exist" (404) or a server
    // failure (500) -- distinguish before any DB round-trip.
    if (!contactId || typeof contactId !== 'string' || contactId.trim().length === 0) {
        return res.status(400).json({ message: "A valid contactId is required." });
    }

    try {
        // TALENT_BACKEND_PHASE1_BOUNDED_REPAIR_V1: checkContactIfExist() used to be
        // called before this try block opened, so a thrown Error from its own
        // internal catch became an unhandled rejection reaching Express's default
        // error handler (a raw framework 500 instead of this controller's clean
        // JSON error shape). Moved inside the try so every failure path here is
        // caught and reported through errorResponse(), never a bare stack trace.
        const checkInDb = await checkContactIfExist(contactId);
        if (!checkInDb) {
            return res.status(404).json({ message: "Contact does not exist." });
        }

        // QA7 FIX-5 BOLA: verify caller's company owns this contact before deleting.
        // OPT-02 (QA7): ownership check folded into DELETE WHERE clause —
        // eliminates the separate ownership SELECT round-trip. Zero rowCount
        // means contact not found OR company_id mismatch; both return 403.
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        const companyId = callerCompany.companyId;

        // SECURITY FIX (zero-scope/null-context remediation): accessCtx was
        // never resolved/passed here -- contactList(companyId) with no 3rd
        // argument at all falls into its own "ctx !== undefined ? scoped :
        // unscoped" branch as "never passed" (an intentional escape hatch
        // for genuinely internal callers), not "resolved to zero access".
        // A caller scoped to one job (or zero) received every job-tied
        // applicant/candidate contact company-wide. contactList's own
        // job-scoped queries (searchQuery2/searchQuery3) already handle a
        // real ctx correctly (including a resolved null); this was purely a
        // missing pass-through at this call site.
        //
        // No permission gate is added here: this entire contactsController.js
        // feature (create/update/delete/list contact & group) predates the
        // Team & Access RBAC effort and has no dedicated permission key in
        // the current 18-key catalog (confirmed via db/20260813_team_access_rbac.sql),
        // and no sibling endpoint in this file is permission-gated either --
        // adding one to only this endpoint would be inventing new policy
        // inconsistently, not closing a confirmed gap. Documented as a
        // separate, broader architectural gap in the remediation report
        // rather than silently policed here.
        const accessCtx = await getAccessContextForRequest(req, req.user.uid);
        contact = await contactList(companyId, accessCtx);

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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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

// GETHIRED_TALENT_CANDIDATE_GROUP_MEMBER_REMOVAL_V1: removes one candidate
// from a group without deleting the group itself or the underlying
// contact/candidate/applicant record. Mirrors deleteContact's ownership
// pattern: companyId is JWT-derived (never client-supplied); the group's
// existence and company ownership are both verified with a single query
// before any group_list row is touched (404 if the group truly doesn't
// exist anywhere, 403 if it exists but belongs to a different company --
// same distinction deleteContact already makes). removeFromGroupList()
// itself is a no-op-safe DELETE (see its own comment) -- removing an
// already-removed or never-a-member email is not an error.
const removeGroupMember = async (req, res) => {
    const { groupId, email } = req.query;

    if (!groupId || typeof groupId !== 'string' || groupId.trim().length === 0) {
        return res.status(400).json({ message: "A valid groupId is required." });
    }
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return res.status(400).json({ message: "A valid member email is required." });
    }

    try {
        const { rows: groupRows } = await dbQuery.query(
            `SELECT company_id FROM ${dbSchema}."group" WHERE group_id=$1`,
            [groupId]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ message: "Group does not exist." });
        }

        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
        if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        if (groupRows[0].company_id !== callerCompany.companyId) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        await removeFromGroupList(groupId, email);

        return res.status(status.success).json(successResponse("Candidate removed from group."));

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
        const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
    list2, removeGroupMember}