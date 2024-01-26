import express from "express";
import {
  addNotificationTiming,
  deleteAllNotification,
  deleteNotificationTiming,
  editNotificationTiming,
  getAllNotification,
  getAllNotificationTimings,
  updateNotificationStatus,
} from "../controllers/notificationController.js";
// import { getResultOfAssessmentByDivision } from "../controllers/resultController.js";
import {
  accessAuthentication,
  isAdmin,
  tokenVerification,
} from "../middleware/authentication/authenticationFunction.js";
import { addNotificationTimingVali } from "../middleware/validation/validationFunction.js";

const routes = express.Router();

routes.get(
  "/getAllNotification",
  [tokenVerification, accessAuthentication],
  getAllNotification
);
routes.patch(
  "/updateNotificationStatus/:id",
  [tokenVerification, accessAuthentication],
  updateNotificationStatus
);

routes.delete(
  "/deleteNotification",
  [tokenVerification, accessAuthentication],
  deleteAllNotification
);

routes.post(
  "/addNotificationTiming",
  // [tokenVerification, accessAuthentication, isAdmin,
  addNotificationTimingVali,
  // ]
  addNotificationTiming
);

routes.patch(
  "/editNotificationTiming/:id",
  // [tokenVerification, accessAuthentication, isAdmin ],
  editNotificationTiming
);

routes.delete(
  "/deleteNotificationTiming/:id",
  // [tokenVerification, accessAuthentication, isAdmin ],
  deleteNotificationTiming
);

routes.get(
  "/getAllNotificationTimings",
  // [tokenVerification, accessAuthentication, isAdmin],
  getAllNotificationTimings
);

export { routes as notificationRoute };
