import express from "express";
import { uploadPdf } from "../middleware/fileUploader/uploadPdf.js";
import { uploadPdfHeyzine } from "../controllers/uploadFileController.js";
// import { pdfUploadValidate } from "../middleware/validation/validationFunction.js";

import {
  tokenVerification,
  isAdmin,
  accessAuthentication,
} from "../middleware/authentication/authenticationFunction.js";

const routes = express.Router();

//*********Start Admin Routes*********
routes.post(
  "/uploadPdf",
  [tokenVerification, accessAuthentication, isAdmin],
  //   pdfUploadValidate,
  uploadPdf.single("file"),
  uploadPdfHeyzine
);
//*********End Admin Routes*********
export { routes as uploadFileRoute };
