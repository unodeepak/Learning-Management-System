import express from "express";
import {
  createLearner,
  editLearner,
  disableLearner,
  deleteLearner,
  getAllLearner,
  getSingleLearner,
  getUidLearner,
  uploadLearnerImage,
  forgotPassword,
  changePassword,
  getCourseDetailByCourseId,
  getAllLearnerForAssign,
  getLearnerByTeacher,
  uploadLernerByCsv,
  removeCourseFromLearner,
  getAllSkillByAssessmentForLearner,
  changePasswordWithoutOldPassword,
  uploadLearnerFolder,
} from "../controllers/learnerController.js";

import {
  tokenVerification,
  isAdmin,
  isLearner,
  accessAuthentication,
  isAdmin_Teacher_Learner,
} from "../middleware/authentication/authenticationFunction.js";

import {
  learnerCreateValidate,
  learnerEditValidate,
  learnerForgotPasswordValidation,
  lernerChangePasswordValidation,
  uploadLernerByCsvValidation,
} from "../middleware/validation/validationFunction.js";

import { uploaderLearnerImage } from "../middleware/fileUploader/uploaderLearnerImage.js";
import { uploaderLearnerImageS3 } from "../middleware/fileUploader/uploaderLearnerImageS3.js";
import { csvForUploadLerner } from "../middleware/fileUploader/uploadCsvForUploadLerner.js";
import { uploaderLearnerFolderS3 } from "../middleware/fileUploader/uploaderLearnerFolderS3.js";

const routes = express.Router();
//*********Start Admin Routes*********
routes.post(
  "/createLearner",
  [tokenVerification, accessAuthentication, isAdmin, learnerCreateValidate],
  createLearner
);
routes.patch(
  "/editLearner",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin_Teacher_Learner,
    learnerEditValidate,
  ],
  editLearner
);
routes.patch(
  "/disableLearner/:learnerId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableLearner
);
routes.delete(
  "/deleteLearner",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteLearner
);
routes.post(
  "/uploadLearnerImage",
  [tokenVerification, accessAuthentication, isAdmin],
  // uploaderLearnerImage.single("file"),
  uploaderLearnerImageS3.single("file"),
  uploadLearnerImage
);
routes.get(
  "/getUidLearner",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidLearner
);
routes.get(
  "/getAllLearnerForAssign",
  [tokenVerification, accessAuthentication, isAdmin],
  getAllLearnerForAssign
);

//*********End Admin Routes*********
// routes.get("/getAllLearner", getAllLearner);
routes.get(
  "/getLearnerByTeacher/:teacherId",
  [tokenVerification, accessAuthentication],
  getLearnerByTeacher
);
routes.get(
  "/getAllLearner",
  [tokenVerification, accessAuthentication],
  getAllLearner
);
routes.get(
  "/getSingleLearner/:learnerId",
  [tokenVerification, accessAuthentication],
  isAdmin_Teacher_Learner,
  getSingleLearner
);

// routes.get(
//   "/getSingleLearner/:learnerId",
//   isAdmin_Teacher_Learner,
//   getSingleLearner
// );

//*********Start Admin Routes*********
routes.post(
  "/forgotPassword",
  [tokenVerification, accessAuthentication, learnerForgotPasswordValidation],
  forgotPassword
);
routes.post(
  "/changePassword",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin_Teacher_Learner,
    lernerChangePasswordValidation,
  ],
  changePassword
);

routes.get(
  "/getCourseDetailByCourseId/:courseId",
  [tokenVerification, accessAuthentication, isLearner],
  getCourseDetailByCourseId
);
routes.post(
  "/uploadLernerByCsv",
  [tokenVerification, accessAuthentication, isAdmin],
  csvForUploadLerner.single("file"),
  uploadLernerByCsv
);

routes.delete(
  "/removeCourseFromLearner",
  [tokenVerification, accessAuthentication, isAdmin],
  removeCourseFromLearner
);

routes.get(
  "/getAllSkillByAssessmentForLearner/:limit/:page",
  [tokenVerification, accessAuthentication, isLearner],
  getAllSkillByAssessmentForLearner
);

routes.patch(
  "/changePasswordWithoutOldPassword", //This api is used for change learner password without oldPassword inside app
  [tokenVerification, accessAuthentication, isLearner],
  changePasswordWithoutOldPassword
);

routes.post(
  "/uploadLearnerfolder",
  [tokenVerification, accessAuthentication, isAdmin],
  // uploaderLearnerImage.single("file"),
  uploaderLearnerFolderS3.array("files"),
  uploadLearnerFolder
);

export { routes as learnerRoute };
