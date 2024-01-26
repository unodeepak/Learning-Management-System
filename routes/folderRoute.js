import express from "express";
import {
  createFolder,
  getAllFolder,
  disableFolder,
  deleteFolder,
  editFolder,
  getSingleFolder,
  getUidFolder,
} from "../controllers/folderController.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

import { folderCreateValidate } from "../middleware/validation/validationFunction.js";

const routes = express.Router();

//*********Start Admin Routes*********
routes.post(
  "/createFolder",
  [tokenVerification, accessAuthentication, isAdmin, folderCreateValidate],
  createFolder
);
routes.patch("/editFolder", [tokenVerification, accessAuthentication, isAdmin], editFolder);
routes.patch(
  "/disableFolder/:folderId",
  [tokenVerification, accessAuthentication, isAdmin],
  disableFolder
);
routes.delete(
  "/deleteFolder/:folderId",
  [tokenVerification, accessAuthentication, isAdmin],
  deleteFolder
);
routes.get("/getUidFolder", [tokenVerification, accessAuthentication, isAdmin], getUidFolder);
//*********End Admin Routes*********
routes.get("/getSingleFolder/:folderId", [tokenVerification, accessAuthentication], getSingleFolder);
routes.get("/getAllFolder", [tokenVerification, accessAuthentication], getAllFolder);
export { routes as folderRoute };
