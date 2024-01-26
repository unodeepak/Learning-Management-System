import events from "events";
const event = new events.EventEmitter();
import admin from "firebase-admin";
import serviceAccount from "../teacher.json" assert { type: "json" };
import notificationModel from "../modals/notificationModal.js";
import mongoose from "mongoose";
import notificationTimingModel from "../modals/notificationTiming.js";
import { logger } from "../app.js";
import { log } from "console";
import { EOF } from "dns";
import redisHelper from "../helpers/redis.js";

let adminNotification = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
/**
 * This event is used for adding notification and sending notification 
 */
export const addNotification = event.on("addNotification", async (payload) => {
  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24,
  };
  if (
    !!payload === true &&
    !!payload?.deviceToken === true &&
    "deviceToken" in payload &&
    "deviceType" in payload &&
    payload?.deviceToken.length > 0 &&
    (payload?.deviceType === "android" || payload?.deviceType === "ios")
  ) {
    let addingData = {
      ...payload.message.data,
      assessmentId:
        payload?.message?.data?.assessmentId + "".substring(0).toString() || "",
      courseId:
        payload?.message?.data?.courseId + "".substring(0).toString() || "",
      isAssessment: payload.isAssessment + "",
      isCourse: payload.isCourse + "",
    };
    const notificationsSent = {
      notification: {
        ...payload?.message?.notification,
        date: payload?.message?.notification.date + "",
      },
      data: { ...addingData },
    };
    let { error } = adminNotification
      .messaging()
      .sendToDevice(payload?.deviceToken, notificationsSent, options);
    if (!!error === true) {
      return res.status(400).json({ status: false, message: error.message });
    }
  }
  await notificationModel.create({
    message: payload.message.notification,
    data: payload.message.data,
    userId: payload.userId,
    isLerner: "isLerner" in payload && payload.isLerner === true ? true : false,
    isTeacher:
      "isTeacher" in payload && payload.isTeacher === true ? true : false,
    isAdmin: "isAdmin" in payload && payload.isAdmin === true ? true : false,
    createdOn: new Date().getTime(),
    isCourse: payload.isCourse === true ? true : false,
    isAssessment: payload.isAssessment === true ? true : false,
    isLibrary: payload.isLibrary === true ? true : false,
    isMeeting: payload.isMeeting === true ? true : false,
  });
});

/**
 * This function is used for get All user notification
 * @returns N/A
 * @payload {body}
 * @method get
 */

export const getAllNotification = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    let { seaAll, limit, page } = req.query;
    const seaAllvalue = {
      true: true,
      false: false,
    };
    Object.freeze(seaAllvalue);
    if (Object.keys(seaAllvalue).includes(seaAll) === false) {
      throw new Error(
        `Sea all value should be ${Object.values(seaAllvalue).join(", ")}`
      );
    }
    let pageValue = (page ||= parseInt(1));
    let limitValue = (limit ||= parseInt(10));
    let skip = (pageValue - 1) * limitValue;
    if (!!seaAll === true && seaAll === "false") {
      const getNotification = await notificationModel
        .find(
          { userId: userId },
          {
            _id: 1,
            userId: 1,
            message: 1,
            data: 1,
            createdOn: 1,
            status: 1,
            isAssessment: 1,
            isCourse: 1,
            isLibrary: 1,
          }
        )
        .skip(skip)
        .limit(limitValue)
        .sort({ createdOn: -1 });
      const countDocument = await notificationModel.countDocuments({
        userId: userId,
      });
      !!countDocument === true && countDocument > 0
        ? (returnObj.count = countDocument)
        : (returnObj.count = 0);
      !!getNotification === true &&
      Array.isArray(getNotification) &&
      getNotification.length > 0
        ? (returnObj.data = getNotification)
        : (returnObj.data = []);
      returnObj.message = "Notification retrieve successfully";
      returnObj.status = 200;
      returnObj.error = false;
      return res.status(returnObj.status).json(returnObj);
    }
    if (!!seaAll === true && seaAll === "true") {
      const getNotification = await notificationModel
        .find(
          { userId: userId },
          {
            _id: 1,
            userId: 1,
            message: 1,
            isAssessment: 1,
            isCourse: 1,
            data: 1,
            createdOn: 1,
            status: 1,
            isLibrary: 1,
          }
        )
        .skip(skip)
        .limit(limitValue)
        .sort({ createdOn: -1 });
      const countDocument = await notificationModel.countDocuments({
        userId: userId,
      });
      !!countDocument === true && countDocument > 0
        ? (returnObj.count = countDocument)
        : (returnObj.count = 0);
      !!getNotification === true &&
      Array.isArray(getNotification) &&
      getNotification.length > 0
        ? (returnObj.data = getNotification)
        : (returnObj.data = []);
      returnObj.message = "Notification retrieve successfully";
      returnObj.status = 200;
      returnObj.error = false;
      return res.status(returnObj.status).json(returnObj);
    }
  } catch (error) {
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for update notification status
 * @returns N/A
 * @payload {parms}
 * @method Patch
 */

export const updateNotificationStatus = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    const { id } = req.params;
    if (!!id === true && mongoose.Types.ObjectId.isValid(id) === false)
      throw new Error("This id is invalid");
    const getNotification = await notificationModel.findById(id);
    if (!!getNotification === false)
      throw new Error("Please provide the correct notification id");
    await notificationModel.updateOne(
      { _id: id, userId: userId },
      { status: true }
    );
    returnObj.message = "Notification status updated successfully";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for delete all notification
 * @returns N/A
 * @payload {parms}
 * @method Patch
 */

export const deleteAllNotification = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    await notificationModel.deleteMany({ userId: userId });
    returnObj.message = "Notification deleted successfully";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for add notification timing
 * @returns N/A
 * @payload {parms}
 * @method Post
 */

export const addNotificationTiming = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    let { duration, dayHourMonth } = req.body;
    let findDetail = await notificationTimingModel
      .findOne({ duration: duration, dayHourMonth: dayHourMonth })
      .lean();
    if (!!findDetail === true) {
      throw new Error(
        "Notification timing detail already added please enter the different one"
      );
    }
    if (
      !!dayHourMonth === true &&
      !!duration === true &&
      dayHourMonth.toUpperCase() == "DAYS" &&
      duration > 31
    )
      throw new Error(`Days duration should be less then and equal to 31`);
    if (
      !!dayHourMonth === true &&
      !!duration === true &&
      dayHourMonth.toUpperCase() === "HOURS" &&
      duration > 24
    )
      throw new Error(`Hours duration should be less then and equal to 24`);
    if (
      !!dayHourMonth === true &&
      !!duration === true &&
      dayHourMonth.toUpperCase() === "MONTHS" &&
      duration > 12
    )
      throw new Error(`Months duration should be less then and equal to 12`);
    dayHourMonth = dayHourMonth.toUpperCase();
    const { error } = await notificationTimingModel.create({
      duration,
      dayHourMonth,
    });
    if (!!error === true) {
      logger.error(`Error from function addNotificationTiming`, {
        stack: error.stack,
      });
      throw new Error(error);
    }
    returnObj.message = "Notification timing added successfully";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function addNotificationTiming`, {
      stack: error.stack,
    });
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for edit notification timing
 * @returns N/A
 * @payload {parms}
 * @method Patch
 */

export const editNotificationTiming = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const { duration } = req.body;
    const { id } = req.params;
    if (!!id === true && mongoose.Types.ObjectId.isValid(id) === false)
      throw new Error(`Mongoose id not valid`);
    const timingExist = await notificationTimingModel.findById(id).lean();
    if (!!timingExist === false) throw new Error(`Please enter the valid id`);
    if (!!timingExist === true) {
      if (
        !!duration === true &&
        timingExist?.dayHourMonth.toUpperCase() == "DAYS" &&
        duration > 31
      )
        throw new Error(`Days duration should be less then and equal to 31`);
      if (
        !!duration === true &&
        timingExist?.dayHourMonth.toUpperCase() === "HOURS" &&
        duration > 24
      )
        throw new Error(`Hours duration should be less then and equal to 24`);
      if (
        !!duration === true &&
        timingExist?.dayHourMonth.toUpperCase() === "MONTHS" &&
        duration > 12
      )
        throw new Error(`Months duration should be less then and equal to 12`);
    }
    const { error } = await notificationTimingModel.updateOne(
      { _id: id },
      { $set: { duration: duration } }
    );
    if (!!error === true) {
      logger.error(`Error from function editNotificationTiming`, {
        stack: error.stack,
      });
      throw new Error(error);
    }
    returnObj.message = "Notification timing updated successfully";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function editNotificationTiming`, {
      stack: error.stack,
    });
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for delete notification timing
 * @returns N/A
 * @payload {parms}
 * @method Delete
 */

export const deleteNotificationTiming = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const { id } = req.params;
    if (!!id === true && mongoose.Types.ObjectId.isValid(id) === false)
      throw new Error(`Mongoose id not valid`);
    const timingExist = await notificationTimingModel.findById(id).lean();
    if (!!timingExist === false) throw new Error(`Please enter the valid id`);
    const { error } = await notificationTimingModel.deleteOne({ _id: id });
    if (!!error === true) {
      logger.error(`Error from function deleteNotification`, {
        stack: error.stack,
      });
      throw new Error(error);
    }
    returnObj.message = "Notification timing deleted successfully";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function deleteNotification`, {
      stack: error.stack,
    });
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for get notification timing
 * @returns N/A
 * @payload {parms}
 * @method Get
 */

export const getAllNotificationTimings = async (req, res) => {
  let returnObj = {
    status: 400,
    error: true,
    message: "",
    data: { count: 0, rows: [] },
  };
  try {
    let { limit = 10, skip = 1 } = req.query;
    skip = (skip - 1) * limit;
    let alldata = await notificationTimingModel
      .find({}, { duration: 1, dayHourMonth: 1, createdOn: 1 })
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 });
    let countData = await notificationTimingModel.count();
    !!countData === true && countData > 0
      ? (returnObj.data.count = countData)
      : 0;
    !!alldata === true && alldata.length > 0
      ? (returnObj.data.rows = alldata)
      : [];
    returnObj.message = "All notification timings";
    returnObj.status = 200;
    returnObj.error = false;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function getAllNotificationTimings`, {
      stack: error.stack,
    });
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};
