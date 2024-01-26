import express from "express";
import {
  getResultOfAssessmentByDivision,
  getSingleResultByLearner,
  getAllResultByLearner,
} from "../controllers/resultController.js";
// import { getResultOfAssessmentByDivision } from "../controllers/resultController.js";
import {
  accessAuthentication,
  tokenVerification,
} from "../middleware/authentication/authenticationFunction.js";

const routes = express.Router();

routes.post(
  "/getResultOfAssessmentByDivision",
  [tokenVerification, accessAuthentication],
  getResultOfAssessmentByDivision
);

routes.get(
  "/getSingleResultByLearner/:learnerId/:assessmentId",
  [tokenVerification, accessAuthentication],
  getSingleResultByLearner
);

routes.get("/getAllResultByLearner/:learnerId", getAllResultByLearner);

export { routes as resultRoute };
