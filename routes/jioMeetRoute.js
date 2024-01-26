import express from "express";
import {
  accessAuthentication,
  isAdmin_Teacher,
  tokenVerification,
  isAdmin_Teacher_Learner,
  Teacher_Learner,
} from "../middleware/authentication/authenticationFunction.js";
import {
  createMeeting,
  deleteMeeting,
  generateSignature,
  getAllMeeting,
  getAllRecording,
  getMeetingByVirtualMeetId,
  getMeetingStatusById,
  getUidJioMeet,
  removeParticipantFromMeeting,
  seeAllParticipantsDetailByMeetingId,
  updateMeetingWhoJoinedOrNot,
} from "../controllers/jioMeetController.js";
import { createJioMeeting } from "../middleware/validation/validationFunction.js";

const routes = express.Router();

//*********Start Admin And teacher routes*********
routes.post(
  "/createMeeting",
  [tokenVerification, accessAuthentication, isAdmin_Teacher, createJioMeeting],
  createMeeting
);

routes.get(
  "/getUidJioMeet",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  getUidJioMeet
);
routes.post(
  "/getAllMeeting",
  [tokenVerification, accessAuthentication, isAdmin_Teacher_Learner],
  getAllMeeting
);
routes.post(
  "/seeAllParticipantsDetailByMeetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  seeAllParticipantsDetailByMeetingId
);

routes.patch(
  "/updateMeeting/:meetingId",
  [tokenVerification, accessAuthentication, Teacher_Learner],
  updateMeetingWhoJoinedOrNot
);
routes.delete(
  "/deleteMeeting/:meetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  deleteMeeting
);
routes.get(
  "/meetingStatusById/:meetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  getMeetingStatusById
);
routes.delete(
  "/removeParticipantFromMeeting/:meetingId/:userId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  removeParticipantFromMeeting
);
routes.get(
  "/getRecording/:meetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  getAllRecording
);
routes.get(
  "/generateSignature/:meetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  generateSignature
);
routes.get(
  "/meetingByZoomMeetingId/:meetingId",
  [tokenVerification, accessAuthentication, isAdmin_Teacher],
  getMeetingByVirtualMeetId
);
export { routes as jioMeetRoutes };
