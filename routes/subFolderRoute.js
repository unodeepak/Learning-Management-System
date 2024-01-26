import express from "express";
import {
  createSubFolder,
  getAllSubFolderByFolderId,
  disableSubFolder,
  deleteSubFolder,
  renameSubFolder,
  getSingleSubFolder,
  getUidSubFolder,
  updateSubFolderTrack,
  unlockSubFolderTrack,
} from "../controllers/subFolderController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
  isAdmin_Teacher,
  isAdmin_Teacher_Learner,
} from "../middleware/authentication/authenticationFunction.js";

import {
  subFolderCreateValidate,
  subFolderTrackUpdateValidate,
} from "../middleware/validation/validationFunction.js";

const routes = express.Router();

//*********Start Admin Routes*********
routes.post(
  "/createSubFolder",
  [tokenVerification, accessAuthentication, isAdmin, subFolderCreateValidate],
  createSubFolder
);
routes.patch(
  "/renameSubFolder",
  [tokenVerification, accessAuthentication, isAdmin],
  renameSubFolder
);
routes.patch(
  "/disableSubFolder/:subFolderId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableSubFolder
);
routes.delete(
  "/deleteSubFolder/:subFolderId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteSubFolder
);
routes.post(
  "/updateSubFolderTrack",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin_Teacher_Learner,
    subFolderTrackUpdateValidate,
  ],
  updateSubFolderTrack
);
routes.post(
  "/unlockSubFolderTrack",
  [
    tokenVerification,
    accessAuthentication,
    isAdmin,
    subFolderTrackUpdateValidate,
  ],
  unlockSubFolderTrack
);

routes.get(
  "/getUidSubFolder",
  [tokenVerification, accessAuthentication, isAdmin],
  getUidSubFolder
);
//*********End Admin Routes*********

routes.get(
  "/getAllSubFolder/:folderId",
  [tokenVerification, accessAuthentication],
  getAllSubFolderByFolderId
);
routes.get(
  "/getSingleSubFolder/:subFolderId",
  [tokenVerification, accessAuthentication],
  getSingleSubFolder
);
export { routes as subFolderRoute };
