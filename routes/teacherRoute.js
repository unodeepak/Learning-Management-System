import express from "express";
import {
  createTeacher,
  editTeacher,
  disableTeacher,
  getAllTeacher,
  assignDivisionToTeacher,
  getSingleTeacher,
  getUidTeacher,
  uploadTeacherImage,
  removeDivisionFromTeacher,
  getAllTeacherForAssign,
  removeCourseFromTeacher,
  removeAssessmentFromTeacher,
  getAllGradeByTeacher,
  getAllDivisionByTeacherAndGrade,
  getTeacherDashboardCount,
  getLatestCoursesForDashbord,
  getLatestAssessmentForDashboard,
  getLatestLibraryForDashboard,
  deleteTeacher,
} from "../controllers/teacherController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
  isAdmin_Teacher,
  isTeacher,
  isAdmin_Teacher_Learner,
} from "../middleware/authentication/authenticationFunction.js";

import {
  teacherCreateValidate,
  teacherEditValidate,
  assignDivisionToTeacherValidate,
} from "../middleware/validation/validationFunction.js";

import { uploaderTeacherImage } from "../middleware/fileUploader/uploaderTeacherImage.js";

const routes = express.Router();

//*********Start Admin Routes*********
routes.post(
  "/createTeacher",
  [tokenVerification, accessAuthentication, isAdmin, teacherCreateValidate],
  createTeacher
);
routes.patch(
  "/editTeacher",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin_Teacher,
    teacherEditValidate,
  ],
  editTeacher
);
routes.patch(
  "/disableTeacher/:teacherId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableTeacher
);
routes.get(
  "/getUidTeacher",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidTeacher
);
routes.delete(
  "/deleteTeacher",
  [tokenVerification, accessAuthentication],
  deleteTeacher
);
routes.post(
  "/assignDivisionToTeacher",
  [tokenVerification, accessAuthentication],
  assignDivisionToTeacherValidate,
  assignDivisionToTeacher
);
routes.patch(
  "/removeDivisionFromTeacher",
  [tokenVerification, accessAuthentication],
  removeDivisionFromTeacher
);

routes.post(
  "/uploadTeacherImage",
  [tokenVerification, accessAuthentication, isAdmin_Teacher_Learner],
  uploaderTeacherImage.single("file"),
  uploadTeacherImage
);

routes.get(
  "/getAllTeacherForAssign",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllTeacherForAssign
);

routes.post(
  "/removeCourseFromTeacher",
  [tokenVerification, accessAuthentication, isAdmin],
  removeCourseFromTeacher
);
routes.post(
  "/removeAssessmentFromTeacher",
  [tokenVerification, accessAuthentication, isAdmin],
  removeAssessmentFromTeacher
);

//*********End Admin Routes*********

// routes.get("/getAllTeacher", getAllTeacher);
routes.get(
  "/getAllGradeByTeacher/:teacherId",
  [tokenVerification, accessAuthentication],
  getAllGradeByTeacher
);
routes.get(
  "/getAllDivisionByTeacherAndGrade/:teacherId/:gradeId",
  [tokenVerification, accessAuthentication],
  getAllDivisionByTeacherAndGrade
);

// routes.get("/getSingleTeacher/:teacherId", getSingleTeacher);
routes.get(
  "/getAllTeacher",
  [tokenVerification, accessAuthentication],
  getAllTeacher
);
routes.get(
  "/getSingleTeacher/:teacherId",
  [tokenVerification, accessAuthentication],
  getSingleTeacher
);
routes.get(
  "/getTeacherDashboardCount",
  [tokenVerification, accessAuthentication, isTeacher],
  getTeacherDashboardCount
);
routes.get(
  "/getLatestCoursesForDashBord",
  [tokenVerification, accessAuthentication, isTeacher],
  getLatestCoursesForDashbord
);
routes.get(
  "/getLatestAssecmentForDashbord",
  [tokenVerification, accessAuthentication, isTeacher],
  getLatestAssessmentForDashboard
);
routes.get(
  "/getLatestLibraryForDashboard",
  [tokenVerification, accessAuthentication, isTeacher],
  getLatestLibraryForDashboard
);
export { routes as teacherRoute };
