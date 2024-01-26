import express from "express";
import {
  adminDashboardCountApi,
  createUser,
  editAdminProfile,
  getAdminCoursesAndAssessment,
  getAdminProfile,
  uploadAdminImage,
} from "../controllers/userController.js";
import { createJioMeeting } from "../middleware/validation/validationFunction.js";
import {
  accessAuthentication,
  isAdmin,
  isAdmin_Teacher,
  tokenVerification,
} from "../middleware/authentication/authenticationFunction.js";
import { uploaderAdminImage } from "../middleware/fileUploader/uploaderAdminImage.js";

const routes = express.Router();

routes.post("/createUser", createUser);
routes.get(
  "/adminDashboardCount",
  [tokenVerification, accessAuthentication, isAdmin],
  adminDashboardCountApi
);
routes.get(
  "/getAdminCoursesAndAssessment",
  [tokenVerification, accessAuthentication, isAdmin],
  getAdminCoursesAndAssessment
);
routes.patch(
  "/editAdminProfile",
  [tokenVerification, accessAuthentication, isAdmin],
  editAdminProfile
);
routes.get(
  "/getAdminProfile",
  [tokenVerification, accessAuthentication, isAdmin],
  getAdminProfile
);
routes.post(
  "/uploadAdminImage",
  [tokenVerification, accessAuthentication, isAdmin],
  uploaderAdminImage.single("file"),
  uploadAdminImage
);
export { routes as userRoute };
