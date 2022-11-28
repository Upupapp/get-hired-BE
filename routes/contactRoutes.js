import express from "express";
import { groupsmigration } from "googleapis/build/src/apis/groupsmigration";
import { contactslist, createContact, createGroup, deleteContact, deleteGroup, grouplist, list, list2, multipleContact, updateContact, updateGroup } from "../controllers/contactsController";

// import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.post("/contacts/addcontact", createContact);
router.post("/contacts/multiplecontact", multipleContact);
router.delete("/contacts/deletecontact", deleteContact);
router.put("/contacts/updatecontact", updateContact);
router.get("/contacts/list", list)
router.get("/contacts/grouplist", grouplist)

router.post("/groups/creategroup", createGroup);
router.get("/groups/contactlist", contactslist)
router.put("/groups/updategroup", updateGroup);
router.delete("/groups/deletegroup", deleteGroup);
router.get("/groups/list", list2)

export default router;