import express from "express";
import { createContact, createGroup, deleteContact, grouplist, list, multipleContact, updateContact } from "../controllers/contactsController";

// import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.post("/contacts/addcontact", createContact);
router.post("/contacts/multiplecontact", multipleContact);
router.delete("/contacts/deletecontact", deleteContact);
router.put("/contacts/updatecontact", updateContact);
router.get("/contacts/list", list)
router.get("/contacts/grouplist", grouplist)

router.post("/groups/creategroup", createGroup);

export default router;