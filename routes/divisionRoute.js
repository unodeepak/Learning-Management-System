import express from "express";
import {
  createDivision,
  getAllDivisionByGradeId,
  editDivision,
  disableDivision,
  deleteDivision,
  getSingleDivision,
  getUidDivision,
  getAllDivisionByGradeIdForDropDown,
  getDivisionByTeacher,
  removeDivisionFromAssessment,
} from "../controllers/divisionController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  divisionCreateValidate,
  divisionEditValidate,
} from "../middleware/validation/validationFunction.js";

const routes = express.Router();
//*********Start Admin Routes*********

routes.post(
  "/createDivision",
  [tokenVerification, accessAuthentication, isAdmin, divisionCreateValidate],
  createDivision
);
routes.patch(
  "/editDivision",
  [tokenVerification, accessAuthentication, isAdmin, divisionEditValidate],
  editDivision
);
routes.patch(
  "/disableDivision/:divisionId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableDivision
);
routes.delete(
  "/deleteDivision/:divisionId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteDivision
);
routes.get("/getUidDivision", [tokenVerification, accessAuthentication, isAdmin], getUidDivision);
routes.get(
  "/getAllDivisionByGradeIdForDropDown/:gradeId",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllDivisionByGradeIdForDropDown
);

routes.post(
  "/removeDivisionFromAssessment",
  [tokenVerification, accessAuthentication, isAdmin],
  removeDivisionFromAssessment
);

//*********End Admin Routes*********

routes.get("/getSingleDivision/:divisionId", [tokenVerification, accessAuthentication], getSingleDivision);
routes.get("/getDivisionByTeacher/:teacherId", [tokenVerification, accessAuthentication], getDivisionByTeacher);

routes.get("/getAllDivisionByGradeId/:gradeId", [tokenVerification, accessAuthentication], getAllDivisionByGradeId);

export { routes as divisionRoute };
