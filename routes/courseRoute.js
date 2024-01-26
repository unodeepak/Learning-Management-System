import express from "express";
import {
  createCourse,
  getAllNotAssignedCourse,
  getAllNotAssignedCourseForAssign,
  getAllAssignedCourse,
  disableCourse,
  deleteCourse,
  editCourse,
  getSingleCourse,
  getUidCourse,
  assignCourseToGrade,
  assignCourseToDivision,
  assignCourseToLearner,
  assignCourseToTeacher,
  removeDivisionFromCourse,
  getAllCourseWithTrackRecordOfLearner,
  getAllCourseWithTrackRecordOfTeacherForTeach,
  getAllCourseWithTrackRecordOfTeacherForLearn,
  getSingleCourseOfTeacherWithTrackRecord,
  getSingleCourseOfLearnerWithTrackRecord,
  uploadCourseImage,
  getAllAssignedCourseForLearner,
  getAllAssignedCourseForTeacherForLearn,
  getAllAssignedCourseForTeacherForTeach,
  disableCourseForLearnerTeacher,
  deletePersonalCourseFromLearnerAndTeacher,
  getAllCourseForLearner,
} from "../controllers/courseController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  courseCreateValidate,
  courseAssignToGradeValidate,
  courseAssignToDivisionValidate,
  courseAssignToLearnerValidate,
  courseAssignToTeacherValidate,
  divisionRemoveFromCourseValidate,
  disableCourseForTeacherAndLearner,
  PersonalCourseFromTeacherAndLearner,
} from "../middleware/validation/validationFunction.js";

import { uploaderCourseImage } from "../middleware/fileUploader/uploaderCourseImage.js";

const routes = express.Router();

//*********Start Admin Routes*********
routes.post(
  "/createCourse",
  [tokenVerification, accessAuthentication, isAdmin, courseCreateValidate],
  createCourse
);
routes.patch(
  "/editCourse",
  [tokenVerification, accessAuthentication, isAdmin],
  editCourse
);
routes.patch(
  "/disableCourse/:courseId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableCourse
);
routes.delete(
  "/deleteCourse/:courseId/:originalCourseId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteCourse
);
routes.post(
  "/assignCourseToGrade",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    courseAssignToGradeValidate,
  ],
  assignCourseToGrade
);
routes.post(
  "/assignCourseToDivision",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    courseAssignToDivisionValidate,
  ],
  assignCourseToDivision
);
routes.post(
  "/assignCourseToLearner",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    courseAssignToLearnerValidate,
  ],
  assignCourseToLearner
);
routes.post(
  "/assignCourseToTeacher",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    courseAssignToTeacherValidate,
  ],
  assignCourseToTeacher
);
routes.patch(
  "/removeDivisionFromCourse",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    divisionRemoveFromCourseValidate,
  ],
  removeDivisionFromCourse
);
routes.get(
  "/getUidCourse",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidCourse
);
routes.post(
  "/uploadCourseImage",
  [tokenVerification, accessAuthentication, isAdmin],
  uploaderCourseImage.single("file"),
  uploadCourseImage
);

//*********End Admin Routes*********
routes.get(
  "/getAllAssignedCourseForLearner/:learnerId",
  [tokenVerification, accessAuthentication],
  getAllAssignedCourseForLearner
);
routes.get(
  "/getAllAssignedCourseForTeacherForLearn/:teacherId",
  [tokenVerification, accessAuthentication],
  getAllAssignedCourseForTeacherForLearn
);
routes.get(
  "/getAllAssignedCourseForTeacherForTeach/:teacherId",
  [tokenVerification, accessAuthentication],
  getAllAssignedCourseForTeacherForTeach
);
// routes.get("/getAllNotAssignedCourse", getAllNotAssignedCourse);
routes.get(
  "/getAllNotAssignedCourse",
  [tokenVerification, accessAuthentication],
  getAllNotAssignedCourse
);
routes.get(
  "/getAllNotAssignedCourseForAssign",
  [tokenVerification, accessAuthentication],
  getAllNotAssignedCourseForAssign
);
routes.get(
  "/getAllAssignedCourse",
  [tokenVerification, accessAuthentication],
  getAllAssignedCourse
);
routes.get(
  "/getSingleCourse/:courseId",
  [tokenVerification, accessAuthentication],
  getSingleCourse
);
routes.get(
  "/getAllCourseWithTrackRecordOfLearner",
  [tokenVerification, accessAuthentication],
  getAllCourseWithTrackRecordOfLearner
);

routes.get(
  "/getAllCourseWithTrackRecordOfTeacherForLearn/:teacherId",
  [tokenVerification, accessAuthentication],
  getAllCourseWithTrackRecordOfTeacherForLearn
);

routes.get(
  "/getAllCourseWithTrackRecordOfTeacherForTeach/:teacherId",
  [tokenVerification, accessAuthentication],
  getAllCourseWithTrackRecordOfTeacherForTeach
);

routes.get(
  "/getSingleCourseOfTeacherWithTrackRecord/:teacherId/:courseId/",
  [tokenVerification, accessAuthentication],
  getSingleCourseOfTeacherWithTrackRecord
);

routes.get(
  "/getSingleCourseOfLearnerWithTrackRecord/:learnerId/:courseId",
  [tokenVerification, accessAuthentication],
  getSingleCourseOfLearnerWithTrackRecord
);

routes.patch(
  "/disableCourseForLearnerTeacher",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    disableCourseForTeacherAndLearner,
  ],
  disableCourseForLearnerTeacher
);

routes.delete(
  "/deletePersonalCourseFromLearnerAndTeacher",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    PersonalCourseFromTeacherAndLearner,
  ],
  deletePersonalCourseFromLearnerAndTeacher
);

routes.get(
  "/getAllCourseForLearner/:learnerId",
  [tokenVerification, accessAuthentication],
  getAllCourseForLearner
);
export { routes as courseRoute };
