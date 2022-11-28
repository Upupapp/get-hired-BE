import express from "express";
import { createContact, createGroup, deleteContact, list, multipleContact, updateContact } from "../controllers/contactsController";

// import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.post("/contacts/addcontact", createContact);
router.post("/contacts/multiplecontact", multipleContact);
router.delete("/contacts/deletecontact", deleteContact);
router.put("/contacts/updatecontact", updateContact);
router.get("/contacts/list", list)

router.post("/groups/creategroup", createGroup);

export default router;