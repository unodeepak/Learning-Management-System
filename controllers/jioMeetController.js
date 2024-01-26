import mongoose, { Mongoose } from "mongoose";
import JioMeetModel from "../modals/jioMeetModel.js";
import schoolModel from "../modals/schoolModal.js";
import gradeModal from "../modals/gradeModal.js";
import divisionModal from "../modals/divisionModal.js";
import jioMeetModel from "../modals/jioMeetModel.js";
import userModal from "../modals/userModal.js";
import learnerModal from "../modals/learnerModal.js";
import teacherModal from "../modals/teacherModal.js";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
import axios from "axios";
import { addNotification } from "../controllers/notificationController.js";
import KJUR from "jsrsasign";

/**
 * This function is used for get  the last meeting id
 * @returns {N/A}
 * @method Get
 */
export const getUidJioMeet = async (_req, res) => {
  try {
    let meetingExist = await JioMeetModel.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );
    if (!meetingExist) {
      return res.status(200).json({
        status: true,
        message: "The meetingUid successfully retrieved",
        data: "M-1",
      });
    }

    const lastUid = meetingExist.meetingUid;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "M-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidJioMeet.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for crating the jio meet meeting
 * @returns {object}
 * @payload {body}
 * @method Post
 */

export const createMeeting = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const checkUser = { admin: 1, teacher: 2 };
    let getDetail,
      createMeetingPayload = {},
      EmailToSent = [],
      mobileToSent = [],
      lernerParticipants = [],
      teacherParticipants = [],
      NotificationToSent = [];
    const {
      meetingUid,
      schoolId,
      gradeId,
      divisionId,
      meetingName,
      startDate,
      startTime,
      durationInHours,
      durationInMinutes,
    } = req.body;
    if (
      !!durationInHours === true &&
      (parseInt(durationInHours) < 0 || parseInt(durationInHours) > 24)
    ) {
      throw new Error(`Hours should be in between 0 and 24`);
    }
    if (
      !!durationInMinutes === true &&
      (parseInt(durationInMinutes) < 0 || parseInt(durationInMinutes) > 60)
    ) {
      throw new Error(`Minutes should be in between 0 and 60`);
    }
    const { userId, userRole } = req.user;
    if (
      !!schoolId === true &&
      mongoose.Types.ObjectId.isValid(schoolId) === false
    ) {
      throw new Error(`This id is invalid  ${schoolId}`);
    }
    getDetail = await schoolModel.findById(schoolId);
    if (!!getDetail === false) {
      throw new Error(`Please provide the valid schoolId  ${schoolId}`);
    }
    if (
      !!gradeId === true &&
      mongoose.Types.ObjectId.isValid(gradeId) === false
    ) {
      throw new Error(`This id is invalid  ${gradeId}`);
    }
    getDetail = await gradeModal.findById(gradeId);
    if (!!getDetail === false) {
      throw new Error(`Please provide the valid gradeId  ${gradeId}`);
    }
    if (
      !!divisionId === true &&
      mongoose.Types.ObjectId.isValid(divisionId) === false
    ) {
      throw new Error(`This id is invalid  ${divisionId}`);
    }
    getDetail = await divisionModal.findById(divisionId);
    if (!!getDetail === false) {
      throw new Error(`Please provide the valid divisionId  ${divisionId}`);
    }
    if (!!meetingUid === true) {
      getDetail = await jioMeetModel.findOne({ meetingUid: meetingUid }).lean();
      if (!!getDetail === true) {
        throw new Error(
          `This meetingUid is already exit please provide the correct one`
        );
      }
    }
    if (
      !!userRole === true &&
      Object.values(checkUser).includes(userRole) === false
    ) {
      throw new Error("Only admin and teacher can create meeting");
    }

    //Admin create the meeting
    if (!!userRole === true && userRole === 1) {
      const getLernerDetail = await learnerModal
        .find({
          $and: [
            { schoolId: new mongoose.Types.ObjectId(schoolId) },
            { gradeId: new mongoose.Types.ObjectId(gradeId) },
            { divisionId: new mongoose.Types.ObjectId(divisionId) },
            { role: "Learner" },
          ],
        })
        .lean();
      const getTeacherDetail = await teacherModal
        .find({
          $and: [
            { schoolId: new mongoose.Types.ObjectId(schoolId) },
            {
              gradeNdivision: {
                $elemMatch: {
                  divisionId: new mongoose.Types.ObjectId(divisionId),
                  gradeId: new mongoose.Types.ObjectId(gradeId),
                },
              },
            },
            { role: "Teacher" },
          ],
        })
        .lean();
      const array = [...getLernerDetail, ...getTeacherDetail];
      for (let index = 0; index < array.length; index++) {
        if (
          !!getLernerDetail === true &&
          getLernerDetail.length > 0 &&
          Array.isArray(getLernerDetail) &&
          getLernerDetail[index] != undefined
        ) {
          const lernerObj = {};
          lernerObj.participantId = getLernerDetail[index]._id;
          lernerObj.createdOn = +new Date();
          lernerObj.updatedOn = +new Date();
          lernerParticipants.push(lernerObj);
        }
        if (
          !!getTeacherDetail === true &&
          getTeacherDetail.length > 0 &&
          Array.isArray(getTeacherDetail) &&
          getTeacherDetail[index] != undefined
        ) {
          const teacherObj = {};
          teacherObj.participantId = getTeacherDetail[index]._id;
          teacherObj.createdOn = +new Date();
          teacherObj.updatedOn = +new Date();
          teacherParticipants.push(teacherObj);
        }
        if (
          "deviceType" in array[index] &&
          !!array[index]?.deviceType === true &&
          "deviceToken" in array[index] &&
          !!array[index]?.deviceToken === true
        ) {
          const obj = {};
          obj["deviceToken"] = array[index]?.deviceToken;
          obj["deviceType"] = array[index]?.deviceType;
          obj["role"] = array[index]?.role;
          obj["userId"] = array[index]?._id;
          NotificationToSent = [...NotificationToSent, obj];
        }
        if (
          !!array[index].email === true &&
          "email" in array[index] &&
          array[index].email.length > 0
        ) {
          const obj = { email: array[index].email };
          EmailToSent = [...EmailToSent, obj];
        } else {
          if (
            !!array[index].mobile === true &&
            "mobile" in array[index] &&
            array[index].mobile.length > 0
          ) {
            mobileToSent = [...mobileToSent, array[index].mobile];
          }
        }
      }
      createMeetingPayload.meetingUid = meetingUid;
      createMeetingPayload.schoolId = schoolId;
      createMeetingPayload.gradeId = gradeId;
      createMeetingPayload.divisionId = divisionId;
      createMeetingPayload.meetingName = meetingName;
      createMeetingPayload.createdById = userId;
      createMeetingPayload.createdBy = "Admin";
      createMeetingPayload.lernerParticipants = lernerParticipants;
      createMeetingPayload.teacherParticipants = teacherParticipants;
      createMeetingPayload.updatedOn = +new Date();
      createMeetingPayload.createdOn = +new Date();
    }
    //Teacher create the meeting
    if (!!userRole === true && userRole === 2) {
      const getTeacherDetail = await teacherModal
        .find({
          $and: [
            { _id: new mongoose.Types.ObjectId(userId) },
            { schoolId: new mongoose.Types.ObjectId(schoolId) },
            { gradeId: new mongoose.Types.ObjectId(gradeId) },
            { divisionId: new mongoose.Types.ObjectId(divisionId) },
            { role: "Teacher" },
          ],
        })
        .lean();
      const getLernerDetail = await learnerModal
        .find({
          $and: [
            { schoolId: new mongoose.Types.ObjectId(schoolId) },
            { gradeId: new mongoose.Types.ObjectId(gradeId) },
            { divisionId: new mongoose.Types.ObjectId(divisionId) },
            { role: "Learner" },
          ],
        })
        .lean();
      const array = [...getTeacherDetail, ...getLernerDetail];
      for (let index = 0; index < array.length; index++) {
        if (
          !!getLernerDetail === true &&
          getLernerDetail.length > 0 &&
          Array.isArray(getLernerDetail) &&
          getLernerDetail[index] != undefined
        ) {
          const lernerObj = {};
          lernerObj.participantId = getLernerDetail[index]._id;
          lernerObj.createdOn = +new Date();
          lernerObj.updatedOn = +new Date();
          lernerParticipants.push(lernerObj);
        }
        if (
          !!getTeacherDetail === true &&
          getTeacherDetail.length > 0 &&
          Array.isArray(getTeacherDetail) &&
          getTeacherDetail[index] != undefined
        ) {
          const teacherObj = {};
          teacherObj.participantId = getTeacherDetail[index]._id;
          teacherObj.createdOn = +new Date();
          teacherObj.updatedOn = +new Date();
          teacherParticipants.push(teacherObj);
        }
        if (
          ("deviceType" in array[index] &&
            !!array[index]?.deviceType === true &&
            "deviceToken" in array[index] &&
            !!array[index]?.deviceToken === true &&
            array[index]?.deviceToken,
          length > 0)
        ) {
          const obj = {};
          obj["deviceToken"] = array[index]?.deviceToken;
          obj["deviceType"] = array[index]?.deviceType;
          obj["role"] = array[index]?.role;
          obj["userId"] = array[index]?._id;

          NotificationToSent = [...NotificationToSent, obj];
        }
        if (
          !!array[index].email === true &&
          "email" in array[index] &&
          array[index].email.length > 0
        ) {
          const obj = { email: array[index].email };
          EmailToSent = [...EmailToSent, obj];
        } else {
          if (
            !!array[index].mobile === true &&
            "mobile" in array[index] &&
            array[index].mobile.length > 0
          ) {
            mobileToSent = [...mobileToSent, array[index].mobile];
          }
        }
      }
      // Get the difference in days
      createMeetingPayload.meetingUid = meetingUid;
      createMeetingPayload.schoolId = schoolId;
      createMeetingPayload.gradeId = gradeId;
      createMeetingPayload.divisionId = divisionId;
      createMeetingPayload.meetingName = meetingName;
      createMeetingPayload.createdBy = "Teacher";
      createMeetingPayload.createdById = userId;
      createMeetingPayload.updatedOn = +new Date();
      createMeetingPayload.lernerParticipants = lernerParticipants;
      createMeetingPayload.teacherParticipants = [{ participantId: userId }];
      createMeetingPayload.createdOn = +new Date();
    }
    createMeetingPayload.startDate = startDate;
    createMeetingPayload.startTime = startTime;
    createMeetingPayload.startDateAndTime = `${startDate}T${startTime}Z`;

    let zoomMeetUrl = await addZoomMeeting(
      EmailToSent,
      mobileToSent,
      createMeetingPayload
    );

    //Admin ui changed after api create meeting api i have added this admin id in teacher participant
    const getAdminId = await userModal.findOne({ userRole: 1 }).lean();
    createMeetingPayload.teacherParticipants.push({
      meetingJoined: false,
      participantId: getAdminId._id,
    });

    createMeetingPayload.meetingCompletedStatus =
      zoomMeetUrl.meetingCompletedStatus;
    createMeetingPayload.meetingId = zoomMeetUrl.id;
    createMeetingPayload.host_email = zoomMeetUrl.host_email;
    createMeetingPayload.start_url = zoomMeetUrl.start_url;
    createMeetingPayload.join_url = zoomMeetUrl.join_url;
    createMeetingPayload.pstn_password = zoomMeetUrl.pstn_password;
    createMeetingPayload.encrypted_password = zoomMeetUrl.encrypted_password;
    createMeetingPayload.password = zoomMeetUrl.password;
    createMeetingPayload.durationInHours = durationInHours || 0;
    createMeetingPayload.durationInMinutes = durationInMinutes || 0;
    let addMeting = await jioMeetModel.create(createMeetingPayload);

    if (!!addMeting.error === true) {
      throw new Error(`Error from meeting side`, addMeting.error);
    }
    for await (const iterator of NotificationToSent) {
      let message = {};
      let payload = { message };
      payload.deviceToken = iterator.deviceToken;
      payload.userId = iterator.userId;
      payload.deviceType = iterator.deviceType;
      payload.isLerner = iterator.role == "Learner" ? true : false;
      payload.isTeacher = iterator.role == "Teacher" ? true : false;
      payload.isMeeting = true;
      message.notification = {
        title: "New Meeting",
        body: `Meeting has been schedule`,
        date: new Date().getTime(),
      };
      message.data = {
        type: "New Meeting",
        join_url: zoomMeetUrl?.join_url,
        start_url: zoomMeetUrl?.start_url,
        pstn_password: zoomMeetUrl?.pstn_password,
        topic: zoomMeetUrl?.topic,
        startDate: startDate,
        startTime: startTime,
      };
      addNotification.emit("addNotification", payload);
    }
    await redisHelper.delDataFromRedisHash([`getAllUserMeeting`]);
    returnObj.status = 201;
    returnObj.error = false;
    // returnObj.rows = zoomMeetUrl;
    returnObj.message = "Meeting created successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${createMeeting.name}`, {
      stack: error.stack,
    });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for all roles who can view there meeting
  * @returns {object}
 * @payload {body}
 * @method Post
 */

export const getAllMeeting = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    let fetchUserDetail,
      pipeline,
      countDocument = 0,
      bodyStatus = {};

    const payload = req.body;
    payload["status"] = payload["status"] || "UPCOMING";
    payload["status"] = payload["status"].toUpperCase();

    const { userId, userRole } = req.user; //1=for admin,2 for teacher,3 learner
    bodyStatus.COMPLETED = "Completed";
    bodyStatus.UPCOMING = "Upcoming";
    Object.freeze(bodyStatus);
    const meetingStatus =
      payload["status"].trim().toUpperCase() === "COMPLETED" ? true : false;
    const limit = parseInt(payload["limit"] || 10);
    const page = parseInt(payload["page"] || 1);
    let skip = (page - 1) * limit;
    skip = parseInt(skip);
    let sortBy = payload["sortBy"] || "createdOn";
    let sortType = payload["sortType"] || "-1";
    if (sortBy && sortType) {
      sortType = Number(sortType);
      sortBy = sortBy == "meetingUid" ? "numericPart" : sortBy;
      sortBy = sortBy == "duration" ? "totalDurationInMinutes" : sortBy;
    }

    if ("status" in payload === true) {
      if (
        Object.keys(bodyStatus).includes(payload["status"].toUpperCase()) ===
        false
      ) {
        throw new Error(`Status should be ${Object.keys(bodyStatus)} `);
      }
    }
    let queryObj = {
      $match: {
        $and: [{ meetingCompletedStatus: meetingStatus }],
      },
    };
    if (!!payload["schoolId"] === true) {
      queryObj.$match.$and.push({
        schoolId: new mongoose.Types.ObjectId(payload["schoolId"]),
      });
    }
    if (!!payload["gradeId"] === true) {
      queryObj.$match.$and.push({
        gradeId: new mongoose.Types.ObjectId(payload["gradeId"]),
      });
    }
    if (!!payload["divisionId"] === true) {
      queryObj.$match.$and.push({
        divisionId: new mongoose.Types.ObjectId(payload["divisionId"]),
      });
    }

    if (!!payload["search"] === true && payload["search"].length > 0) {
      queryObj.$match.$and.push({
        $or: [
          {
            meetingName: {
              $regex: payload["search"],
              $options: "i",
            },
          },
          {
            meetingUid: {
              $regex: payload["search"],
              $options: "i",
            },
          },
        ],
      });
    }
    switch (userRole) {
      case 1:
        if (
          !!payload["schoolId"] === true ||
          !!payload["gradeId"] === true ||
          !!payload["divisionId"]
        ) {
          pipeline = [
            queryObj,
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] }, // Convert hours to minutes
                    { $toInt: "$durationInMinutes" }, // Add minutes
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                action: 1,
                createdOn: 1,
                createdBy: 1,
                meetingCompletedStatus: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                numericPart: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                password: "$encrypted_password",
                // encrypted_password: 1
              },
            },
            {
              $sort: {
                [sortBy]: sortType,
              },
            },
            { $skip: +skip },
            { $limit: +limit },
          ];
        } else {
          pipeline = [
            queryObj,
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] },
                    {
                      $toInt: "$durationInMinutes",
                    },
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                action: 1,
                createdOn: 1,
                createdBy: 1,
                meetingCompletedStatus: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                numericPart: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                password: "$encrypted_password",
                // encrypted_password: 1
              },
            },
            {
              $sort: {
                [sortBy]: sortType,
              },
            },
            { $skip: +skip },
            {
              $limit: +limit,
            },
          ];
        }
        break;

      case 2:
        queryObj.$match.$and.push({
          "teacherParticipants.participantId": new mongoose.Types.ObjectId(
            userId
          ),
        });
        if (
          !!payload["schoolId"] === true ||
          !!payload["gradeId"] === true ||
          !!payload["divisionId"]
        ) {
          pipeline = [
            queryObj,
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] },
                    {
                      $toInt: "$durationInMinutes",
                    },
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                action: 1,
                createdOn: 1,
                createdBy: 1,
                meetingCompletedStatus: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                numericPart: 1,
                password: "$encrypted_password",
                // encrypted_password: 1
              },
            },
            {
              $sort: {
                sortBy: sortType,
              },
            },
            { $skip: +skip },
            { $limit: +limit },
          ];
        } else {
          pipeline = [
            queryObj,
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] },
                    {
                      $toInt: "$durationInMinutes",
                    },
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                createdBy: 1,
                action: 1,
                createdOn: 1,
                meetingCompletedStatus: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                numericPart: 1,
                password: "$encrypted_password",
                // encrypted_password: 1
              },
            },
            {
              $sort: {
                sortBy: sortType,
              },
            },
            { $skip: +skip },
            { $limit: +limit },
          ];
        }
        break;
      case 3:
        let schoolId, gradeId, divisionId;
        let userPayload = await learnerModal.findById(userId).lean();
        schoolId = userPayload.schoolId + "";
        gradeId = userPayload.gradeId + "";
        divisionId = userPayload.divisionId + "";
        if ("search" in payload === true && !!payload["search"] === true) {
          if ("createdTime" in payload && !!payload["createdTime"] === true) {
            queryObj = {
              $match: {
                $and: [
                  { gradeId: new mongoose.Types.ObjectId(gradeId) },
                  { divisionId: new mongoose.Types.ObjectId(divisionId) },
                  { schoolId: new mongoose.Types.ObjectId(schoolId) },
                  {
                    "lernerParticipants.participantId": {
                      $eq: new mongoose.Types.ObjectId(userId),
                    },
                  },
                  { meetingCompletedStatus: meetingStatus },
                  { startDate: { $eq: payload["createdTime"] } },
                  {
                    $or: [
                      {
                        meetingName: {
                          $regex: payload["search"],
                          $options: "i",
                        },
                      },
                      {
                        meetingUid: {
                          $regex: payload["search"],
                          $options: "i",
                        },
                      },
                    ],
                  },
                ],
              },
            };
          } else {
            queryObj = {
              $match: {
                $and: [
                  { gradeId: new mongoose.Types.ObjectId(gradeId) },
                  { divisionId: new mongoose.Types.ObjectId(divisionId) },
                  { schoolId: new mongoose.Types.ObjectId(schoolId) },
                  {
                    "lernerParticipants.participantId": {
                      $eq: new mongoose.Types.ObjectId(userId),
                    },
                  },
                  { meetingCompletedStatus: meetingStatus },
                  {
                    $or: [
                      {
                        meetingName: {
                          $regex: payload["search"],
                          $options: "i",
                        },
                      },
                      {
                        meetingUid: {
                          $regex: payload["search"],
                          $options: "i",
                        },
                      },
                    ],
                  },
                ],
              },
            };
          }

          pipeline = [
            queryObj,
            {
              $addFields: {
                meetingUid: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] },
                    {
                      $toInt: "$durationInMinutes",
                    },
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                action: 1,
                createdOn: 1,
                createdBy: 1,
                meetingCompletedStatus: 1,
                // lernerParticipants: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                start_url: 1,
                password: "$encrypted_password",
              },
            },
            {
              $sort: {
                sortBy: sortType,
              },
            },
            { $skip: +skip },
            { $limit: +limit },
          ];
        } else {
          if ("createdTime" in payload && !!payload["createdTime"] === true) {
            queryObj = {
              $match: {
                $and: [
                  { schoolId: new mongoose.Types.ObjectId(schoolId) },
                  { startDate: { $eq: payload["createdTime"] } },
                  { gradeId: new mongoose.Types.ObjectId(gradeId) },
                  { divisionId: new mongoose.Types.ObjectId(divisionId) },
                  {
                    "lernerParticipants.participantId": {
                      $eq: new mongoose.Types.ObjectId(userId),
                    },
                  },
                  { meetingCompletedStatus: meetingStatus },
                ],
              },
            };
          } else {
            queryObj = {
              $match: {
                $and: [
                  { schoolId: new mongoose.Types.ObjectId(schoolId) },
                  { gradeId: new mongoose.Types.ObjectId(gradeId) },
                  { divisionId: new mongoose.Types.ObjectId(divisionId) },
                  {
                    "lernerParticipants.participantId": {
                      $eq: new mongoose.Types.ObjectId(userId),
                    },
                  },
                  { meetingCompletedStatus: meetingStatus },
                ],
              },
            };
          }

          pipeline = [
            queryObj,
            {
              $addFields: {
                meetingUid: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$meetingUid", "-"] }, 1],
                  },
                },
                totalDurationInMinutes: {
                  $add: [
                    { $multiply: [{ $toInt: "$durationInHours" }, 60] },
                    {
                      $toInt: "$durationInMinutes",
                    },
                  ],
                },
              },
            },
            {
              $project: {
                meetingUid: 1,
                meetingName: 1,
                startDate: 1,
                startTime: 1,
                duration: 1,
                createdBy: 1,
                action: 1,
                createdOn: 1,
                meetingCompletedStatus: 1,
                // lernerParticipants: 1,
                host_email: 1,
                join_url: 1,
                pstn_password: 1,
                meetingId: 1,
                durationInHours: 1,
                durationInMinutes: 1,
                totalDurationInMinutes: 1,
                start_url: 1,
                password: "$encrypted_password",
              },
            },
            {
              $sort: {
                sortBy: sortType,
              },
            },
            { $skip: +skip },
            { $limit: +limit },
          ];
        }
        break;
      default:
        break;
    }
    fetchUserDetail = await jioMeetModel.aggregate(pipeline);

    countDocument = await jioMeetModel.aggregate([
      queryObj,
      { $count: "count" },
    ]);
    returnObj.count =
      !!countDocument == true &&
      countDocument.length > 0 &&
      Array.isArray(countDocument) &&
      countDocument[0].count > 0
        ? countDocument[0].count
        : 0;
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.message = "All meeting detail";
    returnObj.data = fetchUserDetail;
    await redisHelper.setRedisHash(
      `getAllUserMeeting`,
      `getAllUserMeeting_${userId}_${userRole}_${meetingStatus}_${limit}_${skip}_${payload["search"]}_${payload["createdTime"]}_${payload["schoolId"]}_${payload["gradeId"]}_${payload["divisionId"]}_${sortBy}_${sortType}`,
      [returnObj]
    );
    return res.status(returnObj.status).json(returnObj);
    // }
  } catch (error) {
    logger.error(`Error from function ${getAllMeeting.name} `, {
      stack: error.stack,
    });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for all getting all the participants detail of virtual meet
 * @returns {object}
 * @payload {body}
 * @method Post
 */

export const seeAllParticipantsDetailByMeetingId = async (req, res) => {
  const returnObj = {
    status: 400,
    error: true,
    message: "",
  };
  try {
    let {
      meetingId,
      limit = 10,
      page = 1,
      sortBy = "createdOn",
      sortType = -1,
    } = req.body;
    let skip = (page - 1) * limit;
    sortBy = sortBy === "uId" ? "numericUid" : sortBy;
    if (!!meetingId == false) {
      throw new Error("Please provide the meeting id");
    }
    if (
      !!meetingId === true &&
      mongoose.Types.ObjectId.isValid(meetingId) == false
    ) {
      throw new Error(
        "This meeting id is invalid please provide the correct one"
      );
    }
    let isExist = await jioMeetModel.findById(meetingId).lean();
    if (!!isExist == false)
      throw new Error(
        `Meeting id does not exist please provide the correct one`
      );
    let getMeetingFromRedis = await redisHelper.getDataFromRedisHash(
      `getAllUserMeeting`,
      `getAllUserMeeting_${meetingId}_${limit}_${skip}_${sortBy}_${sortType}`
    );
    if (!!getMeetingFromRedis === true) {
      return res
        .status(getMeetingFromRedis[0].status)
        .json(getMeetingFromRedis[0]);
    } else {
      let pipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(meetingId),
          },
        },
        {
          $addFields: {
            allParticipantsIds: {
              $concatArrays: ["$teacherParticipants", "$lernerParticipants"],
            },
          },
        },
        {
          $unwind: {
            path: "$allParticipantsIds",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "allParticipantsIds.participantId",
            foreignField: "_id",
            as: "usersData",
          },
        },
        {
          $unwind: {
            path: "$usersData",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: "$usersData._id",
            uId: "$usersData.uId",
            fullName: "$usersData.fullName",
            email: "$usersData.email",
            mobile: "$usersData.mobile",
            countryCode: "$usersData.countryCode",
            meetingJoined: "$allParticipantsIds.meetingJoined",
          },
        },
        {
          $sort: {
            [sortBy]: sortType,
          },
        },
        { $skip: +skip },
        { $limit: +limit },
      ];
      const countUser = await jioMeetModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(meetingId),
          },
        },
        {
          $project: {
            userCount: {
              $size: {
                $concatArrays: ["$lernerParticipants", "$teacherParticipants"],
              },
            },
          },
        },
      ]);

      let userDetail = await jioMeetModel.aggregate(pipeline);
      returnObj.status = 200;
      returnObj.error = false;
      returnObj.message = "All participants detail";
      returnObj.count =
        countUser[0]?.userCount > 0 ? countUser[0]?.userCount : 0;
      returnObj.data = countUser[0]?.userCount > 0 ? userDetail : [];
      await redisHelper.setRedisHash(
        `getAllUserMeeting`,
        `getAllUserMeeting_${meetingId}_${limit}_${skip}_${sortBy}_${sortType}`,
        [returnObj]
      );

      return res.status(returnObj.status).json(returnObj);
    }
  } catch (error) {
    logger.error(
      `Error from function ${seeAllParticipantsDetailByMeetingId.name} `,
      { stack: error.stack }
    );
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

//This function is used for sent meeting link to all user
async function addZoomMeeting() {
  const [email, mobile, payload] = arguments;
  const zoomPayload = {
    topic: payload?.meetingName,
    duration: payload?.duration,
    start_time: payload?.startDateAndTime,
    type: 2,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      jbh_time: 0,
      mute_upon_entry: true,
      watermark: true,
      auto_recording: "cloud",
      show_share_button: true,
      allow_multiple_devices: true,
      registrants_email_notification: true,
      alternative_hosts_email_notification: true,
      show_join_info: true,
      approval_type: 0,
      email_notification: true,
      email: email,
      calendar_type: 2,
      focus_mode: true,
      show_share_button: true,
    },
    registrants: email,
  };
  let headers = await createAccessToken();
  const createMeeting = await axios.post(
    `${process?.env?.CREATE_MEETING_BASE_URL}/users/me/meetings`,
    zoomPayload,
    { headers }
  );
  return createMeeting?.data;
}

/**
 * This function is used for update meeting when user has joined
 * @returns {object}
 * @payload {body}
 * @method Post
 */
export async function updateMeetingWhoJoinedOrNot(req, res) {
  const { userId, userRole } = req.user;
  const meetingId = req.params.meetingId;
  let returnObj = { status: 400, error: true, message: "" };
  try {
    if (mongoose.Types.ObjectId.isValid(meetingId) === false) {
      throw new Error(`Please enter the valid mongoose id ${meetingId}`);
    }
    let checkMeeting = await jioMeetModel.findById(meetingId).lean();
    if (!!checkMeeting === false) {
      throw new Error(`Please enter the valid meeting id ${meetingId}`);
    }
    let changeStatus = {
      _id: new mongoose.Types.ObjectId(meetingId),
    };
    const queryForUpdate = {};
    let findUser = await userModal.findById(userId).lean();
    if (!!findUser === false) {
      throw new Error("Token not valid");
    }
    if (!!userRole === true && parseInt(userRole) === 3) {
      changeStatus["lernerParticipants.participantId"] =
        new mongoose.Types.ObjectId(userId);
      queryForUpdate["lernerParticipants.$.meetingJoined"] = true;
    }
    if (!!userRole === true && parseInt(userRole) === 2) {
      changeStatus["teacherParticipant.participantId"] =
        new mongoose.Types.ObjectId(userId);
      queryForUpdate["teacherParticipant.$.meetingJoined"] = true;
    }
    const { error } = await jioMeetModel.updateOne(
      { $and: [changeStatus] },
      { $set: queryForUpdate }
    );
    if (!!error == true) {
      throw new Error(error);
    }
    await redisHelper.delDataFromRedisHash([`getAllUserMeeting`]);
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.message = "Meeting status updated successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    logger.error(`Error from function ${updateMeetingWhoJoinedOrNot.name}`, {
      stack: error.stack,
    });
    return res.status(returnObj.status).json(returnObj);
  }
}

/**
 * This function is used for delete meeting
 * @returns {object}
 * @payload {body}
 * @method Post
 */

export async function deleteMeeting(req, res) {
  let returnObj = { error: true, status: 400, message: "" };
  try {
    const { meetingId } = req.params;
    if (!!meetingId === true && !mongoose.Types.ObjectId.isValid(meetingId))
      throw new Error("This mongo meeting id is not valid");
    let isExist = await jioMeetModel.findById(meetingId);
    if (!!isExist === false)
      throw new Error("Please provide the valid meeting id");
    const { error } = await jioMeetModel.deleteOne({
      _id: new mongoose.Types.ObjectId(meetingId),
    });
    if (!!error === true) {
      throw new Error(error);
    }
    await redisHelper.delDataFromRedisHash([`getAllUserMeeting`]);
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.message = "Meeting deleted successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
}

/**
 * This function is used for creating jwt for create meeting 
 * @returns {object}
 * @payload {body}
 * @method Post
 */
async function createAccessToken() {
  const getToken = await axios.post(
    `${process?.env?.ZOOM_OATH_TOKEN_BASE_URL}/token?grant_type=account_credentials&account_id=${process?.env?.ACCOUNT_ID}`,
    {
      grant_type: "account_credentials",
      account_id: process?.env?.ACCOUNT_ID,
      client_secret: process?.env?.CLIENT_SECRET,
    },
    {
      auth: {
        username: process?.env?.CLIENT_ID,
        password: process?.env?.CLIENT_SECRET,
      },
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (!!getToken?.error === true) {
    throw new Error(
      `Error from create access token for meeting  ${getToken?.error}`
    );
  }
  const headers = {
    Authorization: `Bearer ${getToken?.data?.access_token}`,
    "Content-Type": "application/json",
  };
  return headers;
}

/**
 * This function is used get meeting status by meeting id 
 * @returns {object}
 * @payload {body}
 * @method Post
 */
export async function getMeetingStatusById(req, res) {
  const returnObj = { error: true, status: 400, message: "" };
  try {
    const { meetingId } = req.params;
    if (!!meetingId === false) throw new Error(`Meeting is required`);
    if (mongoose.Types.ObjectId.isValid(meetingId) === false)
      throw new Error(`Meeting id is invalid ${meetingId}`);
    let isExist = await jioMeetModel.findById(meetingId).lean();
    if (!!isExist == false) throw new Error(`Meeting id does not exist`);
    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(meetingId),
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      {
        $lookup: {
          from: "grades",
          localField: "gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "divisionId",
          foreignField: "_id",
          as: "divisionData",
        },
      },
      { $unwind: { path: "$divisionData", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$gradeData", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$schoolData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          divisionName: "$divisionData.divisionName",
          schoolName: "$schoolData.schoolName",
          gradeName: "$gradeData.gradeName",
          meetingName: 1,
          startTime: 1,
          durationInHours: 1,
          durationInMinutes: 1,
          startDate: 1,
          meetingCompletedStatus: 1,
          join_url: 1,
        },
      },
    ];
    let getMeeting = await jioMeetModel.aggregate(pipeline);
    if (!!getMeeting === false) throw new Error(`Meeting id not found`);
    returnObj.error = false;
    returnObj.status = 200;
    returnObj.data = getMeeting[0];
    returnObj.message = `Meeting status retrieve successfully`;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.error = false;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
}

export async function removeParticipantFromMeeting(req, res) {
  const returnObj = { error: true, status: 400, message: "" };
  try {
    let { meetingId, userId } = req.params;
    if (mongoose.Types.ObjectId.isValid(meetingId) === false)
      throw new Error(`Please enter the valid meeting Id ${meetingId}`);
    if (mongoose.Types.ObjectId.isValid(userId) === false)
      throw new Error(`Please enter the valid userId ${userId}`);
    const getMeetingDetail = await jioMeetModel.findById(meetingId).lean();
    if (!!getMeetingDetail === false)
      throw new Error("Meeting id does not exist");
    const userDetail = await userModal.findById(userId).lean();
    if (!!userDetail === false) throw new Error("User id does not exist");
    const getUserMeetingDetail = await jioMeetModel.findOne({
      $and: [
        { _id: new mongoose.Types.ObjectId(meetingId) },
        {
          $or: [
            {
              "teacherParticipants.participantId": new mongoose.Types.ObjectId(
                userId
              ),
            },
            {
              "lernerParticipants.participantId": new mongoose.Types.ObjectId(
                userId
              ),
            },
          ],
        },
      ],
    });
    if (!!getUserMeetingDetail === false)
      throw new Error("Meeting not assigned to this user");

    let { error } = await jioMeetModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(meetingId),
        $or: [
          {
            "teacherParticipants.participantId": new mongoose.Types.ObjectId(
              userId
            ),
          },
          {
            "lernerParticipants.participantId": new mongoose.Types.ObjectId(
              userId
            ),
          },
        ],
      },
      {
        $pull: {
          teacherParticipants: {
            participantId: new mongoose.Types.ObjectId(userId),
          },
          lernerParticipants: {
            participantId: new mongoose.Types.ObjectId(userId),
          },
        },
      }
    );
    if (!!error === true) {
      throw new Error(error);
    }
    await redisHelper.delDataFromRedisHash([`getAllUserMeeting`]);
    returnObj.message = "User removed successfully";
    returnObj.error = false;
    returnObj.status = 200;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
}

export async function getAllRecording(req, res) {
  const returnObj = { error: true, status: 400, message: "" };
  try {
    let allDetail;
    const { meetingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(meetingId))
      throw new Error(`Meeting id is invalid`);
    let getMeetingDetail = await jioMeetModel.findById(meetingId).lean();
    if (!!getMeetingDetail === false)
      throw new Error(`Please enter the valid meeting id ${meetingId}`);
    const getToken = await createAccessToken();
    allDetail = await axios.get(
      `${process.env.CREATE_MEETING_BASE_URL}/meetings/${getMeetingDetail?.meetingId}/recordings`,
      {
        headers: getToken,
      }
    );

    returnObj.status = 200;
    returnObj.error = false;
    returnObj.message = `All meeting detail`;
    returnObj.data = allDetail;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${getAllRecording.name}`, {
      stack: error.stack,
    });
    returnObj.message =
      error?.response?.data?.message.length > 1
        ? error.response.data.message
        : error.message;
    return res.status(returnObj.status).json(returnObj);
  }
}

export async function generateSignature(req, res) {
  let returnObj = { error: true, status: 400, message: "" };
  try {
    const { meetingId } = req.params;
    if (!!meetingId === false) throw new Error("Please provide the meeting id");

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: "HS256", typ: "JWT" };

    const oPayload = {
      sdkKey: process.env.SIGNATURE_API_KEY,
      mn: meetingId,
      role: 0,
      iat: iat,
      exp: exp,
      tokenExp: exp,
    };
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = await KJUR.jws.JWS.sign(
      "HS256",
      sHeader,
      sPayload,
      process.env.SIGNATURE_SCRET_KEY
    );
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.message = "Signature created successfully";
    returnObj.data = {
      signature: sdkJWT,
    };
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${generateSignature.name}`, {
      stack: error.stack,
    });
    return res.status(returnObj.status).json(returnObj);
  }
}

export async function getMeetingByVirtualMeetId(req, res) {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { meetingId } = req.params;
    if (!!meetingId == false) throw new Error("Please provide the meeting id");
    const meetingInfo = await jioMeetModel
      .find(
        { meetingId: meetingId },
        {
          _id: 0,
          meetingName: 1,
          host_email: 1,
          password: "$encrypted_password",
        }
      )
      .lean();
    if (!!meetingInfo === false)
      throw new Error(`Please provide the valid meeting id`);
    returnObj.error = false;
    returnObj.status = 200;
    returnObj.message = "Meeting detail fetch successfully";
    returnObj.data = meetingInfo[0];
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${getAllRecording.name}`, {
      stack: error.stack,
    });
    return res.status(returnObj.status).json(returnObj);
  }
}
