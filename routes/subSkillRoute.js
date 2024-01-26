import express from "express";
import {
  createSubSkill,
  editSubSkill,
  disableSubSkill,
  getAllSubSkillBySkillId,
  getSingleSubSkill,
  getUidSubSkill,
  deleteSubSkill,
  getAllSubSkillBySkillIdForAssign,
  uploadRubricsQuestions,
} from "../controllers/subSkillController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  subSkillCreateValidate,
  subSkillEditValidate,
} from "../middleware/validation/validationFunction.js";

import { uploaderCsvToCreateSubSkill } from "../middleware/fileUploader/uploaderCsvToCreateSubSkill.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createSubSkill",
  [tokenVerification, accessAuthentication, isAdmin, subSkillCreateValidate],
  createSubSkill
);
routes.patch(
  "/editSubSkill",
  [tokenVerification, accessAuthentication, isAdmin, subSkillEditValidate],
  editSubSkill
);
routes.patch(
  "/disableSubSkill/:subSkillId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableSubSkill
);
routes.delete(
  "/deleteSubSkill/:subSkillId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteSubSkill
);
routes.get(
  "/getUidSubSkill",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidSubSkill
);
routes.get(
  "/getAllSubSkillBySkillIdForAssign/:skillId",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllSubSkillBySkillIdForAssign
);

routes.post(
  "/uploadRubricsQuestions",
  [tokenVerification, accessAuthentication, isAdmin],
  uploaderCsvToCreateSubSkill.single("file"),
  uploadRubricsQuestions
);

//*********End Admin Routes*********

routes.get(
  "/getSingleSubSkill/:subSkillId",
  [tokenVerification, accessAuthentication],
  getSingleSubSkill
);
routes.get(
  "/getAllSubSkill/:skillId",
  [tokenVerification, accessAuthentication],
  getAllSubSkillBySkillId
);
export { routes as subSkillRoute };
