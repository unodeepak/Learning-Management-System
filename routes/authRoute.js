import express from "express";
import { loginValidate } from "../middleware/validation/validationFunction.js";
import { logOut, login } from "../controllers/authController.js";
import {
  accessAuthentication,
  isAdmin_Teacher_Learner,
  tokenVerification,
} from "../middleware/authentication/authenticationFunction.js";

const routes = express.Router();

routes.post("/login", login);
routes.post(
  "/logOut",
  [tokenVerification, accessAuthentication, isAdmin_Teacher_Learner],
  logOut
);

export { routes as authRoute };
