import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import {
    getLevelList,
    getSetupList,
    getTypeList
} from "../controllers/optionsController";

const router = express.Router();

router.get("/options/setuplist", verifyAuth, getSetupList);
router.get("/options/type", verifyAuth, getTypeList);
router.get("/options/levels", verifyAuth, getLevelList);

export default router;
