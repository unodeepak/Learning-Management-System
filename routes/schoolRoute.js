import express from "express";
import {
  createSchool,
  getAllSchool,
  editSchool,
  disableSchool,
  deleteSchool,
  getSingleSchool,
  getUidSchool,
  uploadSchoolLogo,
  getAllSchoolForDropDown,
} from "../controllers/schoolController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  schoolCreateValidate,
  schoolEditValidate,
} from "../middleware/validation/validationFunction.js";

import { uploaderSchoolLogo } from "../middleware/fileUploader/uploaderSchoolLogo.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createSchool",
  [tokenVerification, accessAuthentication, isAdmin, schoolCreateValidate],
  createSchool
);
routes.patch(
  "/editSchool",
  [tokenVerification, accessAuthentication, isAdmin, schoolEditValidate],
  editSchool
);
routes.patch(
  "/disableSchool/:schoolId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableSchool
);
routes.delete(
  "/deleteSchool",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteSchool
);
routes.post(
  "/uploadSchoolLogo",
  [tokenVerification, accessAuthentication, isAdmin],
  uploaderSchoolLogo.single("file"),
  uploadSchoolLogo
);
routes.get(
  "/getUidSchool",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidSchool
);
routes.get(
  "/getAllSchoolForDropDown",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllSchoolForDropDown
);
//*********End Admin Routes*********
routes.get(
  "/getAllSchool",
  [tokenVerification, accessAuthentication],
  getAllSchool
);

routes.get(
  "/getSingleSchool/:schoolId",
  [tokenVerification, accessAuthentication],
  getSingleSchool
);
export { routes as schoolRoute };
