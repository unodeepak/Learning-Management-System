import express from "express";
import {
  createAssessment,
  // getAllAssessment,
  getAllAssignedAssessment,
  getAllNotAssignedAssessment,
  getAllNotAssignedAssessmentForAssign,
  editAssessment,
  disableAssessment,
  getSingleAssessment,
  getUidAssessment,
  assignAssessmentToGrade,
  assignAssessmentToDivision,
  assessLearnerByAnAssessment,
  deleteAssessment,
  divisionStatusByAssessment,
  // assessmentByLearner,
  assessmentByLearnerForLearner,
  assessmentForLernerByLernerId,
  getAssessmentByLearner,
  getAssessmentByTeacher,
  getAssessmentByTeacherForTeacher,
  getAssessmentByAssessmentId,
} from "../controllers/assessmentController.js";

import {
  tokenVerification,
  isAdmin,
  isLearner,
  isAdmin_Teacher,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import {
  assessmentCreateValidate,
  assessmentEditValidate,
  assessmentAssignToGradeValidate,
  assessmentAssignToDivisionValidate,
  LearnerAssessmentValidate,
  getAssessmentByAssessmentIdForLerner,
} from "../middleware/validation/validationFunction.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createAssessment",
  [tokenVerification, accessAuthentication, isAdmin, assessmentCreateValidate],
  createAssessment
);
routes.patch(
  "/editAssessment",
  [tokenVerification, accessAuthentication, isAdmin, assessmentEditValidate],
  editAssessment
);
routes.patch(
  "/disableAssessment/:assessmentId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableAssessment
);
routes.delete(
  "/deleteAssessment/:assessmentId/:originalAssessmentId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteAssessment
);
routes.post(
  "/assignAssessmentToGrade",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    assessmentAssignToGradeValidate,
  ],
  assignAssessmentToGrade
);
routes.post(
  "/assignAssessmentToDivision",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    assessmentAssignToDivisionValidate,
  ],
  assignAssessmentToDivision
);
routes.post(
  "/assessLearnerByAnAssessment",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin_Teacher,
    LearnerAssessmentValidate,
  ],
  assessLearnerByAnAssessment
);
routes.get(
  "/getUidAssessment",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidAssessment
);
routes.get(
  "/getAllNotAssignedAssessment",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllNotAssignedAssessment
);
routes.get(
  "/getAllNotAssignedAssessmentForAssign",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllNotAssignedAssessmentForAssign
);
routes.get(
  "/getAllAssignedAssessment",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllAssignedAssessment
);
routes.get(
  "/divisionStatusByAssessment/:assessmentId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  divisionStatusByAssessment
);

routes.get(
  "/getAssessmentByTeacherForTeacher/:teacherId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  getAssessmentByTeacherForTeacher
);

//*********End Admin Routes*********

// routes.get("/assessmentByLearner/:learnerId", assessmentByLearner);
routes.get(
  "/assessmentByLearnerForLearner",
  [tokenVerification, accessAuthentication, isLearner],
  assessmentByLearnerForLearner
);
routes.post(
  "/assessmentForLernerByLernerId",
  [
    tokenVerification,
    accessAuthentication,
    isLearner,
    getAssessmentByAssessmentIdForLerner,
  ],
  assessmentForLernerByLernerId
);
routes.get(
  "/getAssessmentByLearner/:learnerId",
  [tokenVerification, accessAuthentication],
  getAssessmentByLearner
);
routes.get(
  "/getSingleAssessment/:assessmentId",
  [tokenVerification, accessAuthentication],
  getSingleAssessment
);
routes.get(
  "/getAssessmentByTeacher/:teacherId",
  [tokenVerification, accessAuthentication],
  getAssessmentByTeacher
);

routes.get(
  "/getAssessmentByAssessmentID/:AssessmentID",
  [tokenVerification, accessAuthentication],
  getAssessmentByAssessmentId
);

export { routes as assessmentRoute };
