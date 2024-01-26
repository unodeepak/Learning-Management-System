import express from "express";
import {
  createSkill,
  getAllSkill,
  editSkill,
  disableSkill,
  getSingleSkill,
  getUidSkill,
  deleteSkill,
  getAllSkillForAssign,
  getSkillReportByLearner,
} from "../controllers/skillController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  skillCreateValidate,
  skillEditValidate,
} from "../middleware/validation/validationFunction.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createSkill",
  [tokenVerification, accessAuthentication, isAdmin, skillCreateValidate],
  createSkill
);
routes.patch(
  "/editSkill",
  [tokenVerification, accessAuthentication, isAdmin, skillEditValidate],
  editSkill
);
routes.patch(
  "/disableSkill/:skillId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableSkill
);
routes.delete(
  "/deleteSkill/:skillId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteSkill
);
routes.get("/getUidSkill", [tokenVerification, accessAuthentication, isAdmin], getUidSkill);
routes.get(
  "/getAllSkillForAssign",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllSkillForAssign
);

//*********End Admin Routes*********

routes.get("/getAllSkill", [tokenVerification, accessAuthentication], getAllSkill);
routes.get("/getSkillReportByLearner/:learnerId", [tokenVerification, accessAuthentication], getSkillReportByLearner);

routes.get("/getSingleSkill/:skillId", [tokenVerification, accessAuthentication], getSingleSkill);
export { routes as skillRoute };
