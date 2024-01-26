import express from "express";
import {
  createGrade,
  getAllGradeBySchoolId,
  editGrade,
  disableGrade,
  deleteGrade,
  getSingleGrade,
  getUidGrade,
  getAllGradeBySchoolIdForDropDown,
} from "../controllers/gradeController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  gradeCreateValidate,
  gradeEditValidate,
} from "../middleware/validation/validationFunction.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createGrade",
  [tokenVerification, accessAuthentication,isAdmin, gradeCreateValidate],
  createGrade
);
routes.patch(
  "/editGrade",
  [tokenVerification,accessAuthentication, isAdmin, gradeEditValidate],
  editGrade
);
routes.patch(
  "/disableGrade/:gradeId",
  [tokenVerification,accessAuthentication, isAdmin],
  disableGrade
);
routes.delete(
  "/deleteGrade/:gradeId",
  [tokenVerification,accessAuthentication, isAdmin],
  deleteGrade
);
routes.get("/getUidGrade", [tokenVerification,accessAuthentication, isAdmin], getUidGrade);
routes.get(
  "/getAllGradeBySchoolIdForDropDown/:schoolId",
  [tokenVerification, accessAuthentication,isAdmin],
  getAllGradeBySchoolIdForDropDown
);
//*********End Admin Routes*********
routes.get("/getAllGradeBySchoolId/:schoolId",[tokenVerification,accessAuthentication], getAllGradeBySchoolId);
routes.get("/getSingleGrade/:gradeId",[tokenVerification,accessAuthentication], getSingleGrade);
export { routes as gradeRoute };
