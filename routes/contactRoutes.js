import express from "express";
import { groupsmigration } from "googleapis/build/src/apis/groupsmigration";
import { contactslist, createContact, createGroup, deleteContact, deleteGroup, grouplist, list, list2, multipleContact, removeGroupMember, updateContact, updateGroup } from "../controllers/contactsController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

// STITCH/security fix (GH-ACT-011): this entire route file had no auth
// middleware -- any contact/group could be read, created, edited, or
// deleted by anyone.
router.post("/contacts/addcontact", verifyAuth, createContact);
router.post("/contacts/multiplecontact", verifyAuth, multipleContact);
router.delete("/contacts/deletecontact", verifyAuth, deleteContact);
router.put("/contacts/updatecontact", verifyAuth, updateContact);
router.get("/contacts/list", verifyAuth, list)
router.get("/contacts/grouplist", verifyAuth, grouplist)

router.post("/groups/creategroup", verifyAuth, createGroup);
router.get("/groups/contactlist", verifyAuth, contactslist)
router.put("/groups/updategroup", verifyAuth, updateGroup);
router.delete("/groups/deletegroup", verifyAuth, deleteGroup);
router.delete("/groups/removemember", verifyAuth, removeGroupMember);
router.get("/groups/list", verifyAuth, list2)

export default router;