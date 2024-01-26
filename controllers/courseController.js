import mongoose from "mongoose";
import courseModal from "../modals/courseModal.js";
import gradeModal from "../modals/gradeModal.js";
import divisionModal from "../modals/divisionModal.js";
import learnerModal from "../modals/learnerModal.js";
import teacherModal from "../modals/teacherModal.js";
import aws from "aws-sdk";
import dotenv from "dotenv";
import schoolModal from "../modals/schoolModal.js";
import userModal from "../modals/userModal.js";
import { log } from "console";
import { addNotification } from "./notificationController.js";
import resultModal from "../modals/resultModal.js";
import { logger } from "../app.js";
import notificationModal from "../modals/notificationModal.js";
import rabbitMqHelper from "../helpers/rebbitMqHelper.js";
import moment from "moment/moment.js";
import fs from "fs";
import ejs from "ejs";
import path from "path";
import moment1 from "moment-timezone";
import { pipeline } from "stream";
import redisHelper from "../helpers/redis.js";
dotenv.config();
const { AWS_ENDPOINT, BUCKET_NAME, AWS_ACCESS_KEY, AWS_SECRET_KEY } =
  process.env;
let s3 = new aws.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: "ap-south-mum-1",
  endpoint: AWS_ENDPOINT,
  s3ForcePathStyle: true,
});

export const createCourse = async (req, res) => {
  const { uId, courseName, about, courseDuration, contentFolder } = req.body;
  try {
    let courseExists = await courseModal.findOne({
      $or: [{ uId }, { courseName }],
    });

    if (courseExists) {
      if (uId == courseExists.uId)
        return res.status(409).json({
          message: `Course already exists with uid ${uId}`,
          status: false,
        });

      if (courseName == courseExists.courseName)
        return res.status(409).json({
          message: `Course already exists with courseName ${courseName}`,
          status: false,
        });
    }

    const newCourse = await courseModal.create({
      uId,
      courseName,
      about,
      courseDuration,
      contentFolder,
      createdOn: new Date().getTime(),
    });
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllLearner",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newCourse) {
      return res.status(201).json({
        status: true,
        message: "the course successfully created",
        data: newCourse,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadCourseImage = async (req, res) => {
  try {
    const { URL } = process.env;
    if (req.fileValidationError && !req.doesExists) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }

    if (req.courseExists) {
      return res.status(404).json({ message: req.courseExists, status: false });
    }
    const getImageDetail = await courseModal.findById(req.body.courseId);
    if (!!getImageDetail === true) {
      if (
        "coursePicture" in getImageDetail &&
        getImageDetail["coursePicture"]?.length > 0
      ) {
        const { error } = await s3
          .deleteObject({ Bucket: BUCKET_NAME, Key: checkey })
          .promise();
        if (!!error === true) {
          return res.status(400).json({
            data: req.courseData,
            status: true,
            message: error,
          });
        }
        let deleteRedisHash = [
          "getAllNotAssignedCourse",
          "getAllCourseWithTrackRecordOfTeacherForTeach",
          "getAllAssignedCourse",
        ];
        await redisHelper.delDataFromRedisHash(deleteRedisHash);
        // }
        // }
        // }
      }
    }
    req.courseData.coursePicture = URL + req.fileData;

    await req.courseData.save();

    return res.status(200).json({
      data: req.courseData,
      status: true,
      message: "the course has been updated",
    });
  } catch (err) {
    logger.error(`Error from function ${uploadCourseImage.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editCourse = async (req, res) => {
  const { courseId, courseName, about, courseDuration, contentFolder } =
    req.body;

  try {
    function isDataEmpty(item) {
      return Object.keys(item).length === 0 && item.constructor === Object;
    }
    let courseExists = await courseModal.findById(courseId);

    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let courseNameExists = await courseModal.findOne({ courseName });

    if (courseNameExists) {
      if (courseNameExists._id.toString() != courseExists._id.toString()) {
        return res.status(409).json({
          message: `Course already exist with courseName ${courseName}`,
          status: false,
        });
      }
    }
    courseExists.courseName = courseName ? courseName : courseExists.courseName;
    courseExists.about = about ? about : courseExists.about;
    courseExists.courseDuration =
      !courseDuration ||
      courseDuration?.length == 0 ||
      (courseDuration.length > 0 && isDataEmpty(courseDuration[0]))
        ? courseExists.courseDuration
        : courseDuration;
    courseExists.contentFolder = contentFolder
      ? contentFolder
      : courseExists.contentFolder;
    courseExists.updatedOn = new Date().getTime();

    await courseExists.save();
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (courseExists) {
      return res.status(200).json({
        status: true,
        message: "the course successfully updated",
        data: courseExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllNotAssignedCourseForAssign = async (req, res) => {
  try {
    const { pagination, page, limit, search } = req.query;

    let queryObj = {
      assigned: false,
      disable: false,
    };
    let getCourse = [];

    if (search) {
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          courseName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getCourse = courseModal
      .find(queryObj)
      .select("courseName uId subCourseCount originalCourseId");

    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;

    if (pagination) {
      let skip = (pageValue - 1) * limit;
      getCourse = getCourse.sort({ _id: -1 }).skip(skip).limit(limitValue);
    }

    getCourse = await getCourse;

    let totalLength = await courseModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getCourse,
      status: true,
      message: "Course retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllNotAssignedCourseForAssign.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllNotAssignedCourse = async (req, res) => {
  try {
    let { pagination, page, limit, search, sortBy, sortType } = req.query;
    let skip;
    let pipeline;
    let queryObj = {
      assigned: false,
    };
    let getCourse = [];

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBy == "uId" ? "numericPart" : sortBy;
    }

    if (search) {
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          courseName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // getCourse = courseModal.find(queryObj, { uId: 1, courseName: 1, subCourseCount: 1, createdOn: 1 });

    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;

    if (pagination) {
      skip = (pageValue - 1) * limit;
      // getCourse = getCourse
      //   .sort({ [sortBys]: sortTypes })
      //   .skip(skip)
      //   .limit(limitValue);
    }

    pipeline = [
      {
        $match: queryObj,
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
            },
          },
        },
      },
      {
        $project: {
          uId: 1,
          courseName: 1,
          subCourseCount: 1,
          createdOn: 1,
          numericPart: 1,
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
      {
        $limit: limitValue,
      },
      {
        $skip: skip,
      },
    ];
    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllNotAssignedCourse`,
      `getAllNotAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      getCourse = redisData;
    } else {
      getCourse = await courseModal.aggregate(pipeline);
      await redisHelper.setRedisHash(
        `getAllNotAssignedCourse`,
        `getAllNotAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`,
        getCourse
      );
    }
    let totalLength = await courseModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getCourse,
      status: true,
      message: "Course retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllNotAssignedCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllAssignedCourse = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      schoolId,
      gradeId,
      divisionId,
      ongoing,
      expired,
    } = req.query;

    let queryObj = {
      assigned: true,
    };

    let matchQuery = {
      $match: {
        assigned: true,
      },
    };
    let matchObject = {};

    const currentDateInMilliseconds = Date.now();
    let divisionIds = [];

    if (
      schoolId &&
      schoolId != "null" &&
      schoolId != "false" &&
      schoolId != undefined
    ) {
      const divisionTotal = await divisionModal.find({ schoolId });

      for (let division of divisionTotal) {
        divisionIds.push(division._id);
      }

      queryObj.assignedDivisions = { $in: divisionIds };
    }

    if (
      gradeId &&
      gradeId != "null" &&
      gradeId != "false" &&
      gradeId != undefined
    ) {
      queryObj.assignedGrade = new mongoose.Types.ObjectId(gradeId);
    }

    if (
      divisionId &&
      divisionId != "null" &&
      divisionId != "false" &&
      divisionId != undefined
    ) {
      queryObj.assignedDivisions = {
        $in: [new mongoose.Types.ObjectId(divisionId)],
      };
    }
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;
    let redisData;
    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys === "uId" ? "numericPart" : sortBys;
      sortBys = sortBys === "assignedGrades" ? "gradeCount" : sortBys;
      sortBys = sortBys === "assignedDivisions" ? "divisionCount" : sortBys;
      sortBys = sortBys === "assignedLearners" ? "learnerCount" : sortBys;
      sortBys = sortBys === "assignedTeachers" ? "teacherCount" : sortBys;
      sortBys = sortBys === "subFolder" ? "subFolderLength" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };
      matchQuery = {
        $match: {
          expiredOn: matchObject,
          assigned: true,
        },
      };
      queryObj.expiredOn = matchObject;
    }

    if (search) {
      matchQuery = {
        $match: {
          assigned: true,
          expiredOn: matchObject,
          $or: [
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              courseName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          courseName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    switch (
      schoolId &&
      (schoolId != undefined || schoolId != "null" || schoolId != "false")
        ? 1
        : gradeId &&
          (gradeId != undefined || gradeId != "null" || gradeId != "false")
        ? 2
        : divisionId &&
          (divisionId != undefined ||
            divisionId != "null" ||
            divisionId != "false")
        ? 3
        : 4
    ) {
      case 1:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedCourse`,
          `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getCourse = redisData;
        } else {
          getCourse = await courseModal.aggregate([
            matchQuery,
            {
              $lookup: {
                from: "divisions",
                localField: "assignedDivisions",
                foreignField: "_id",
                as: "divisions",
              },
            },

            {
              $match: {
                "divisions.schoolId": new mongoose.Types.ObjectId(schoolId),
              },
            },
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
                  },
                },
                gradeCount: {
                  $cond: [{ $ne: ["$assignedGrade", null] }, 1, 0],
                },
                divisionCount: { $size: "$assignedDivisions" },
                learnerCount: { $size: "$assignedLearners" },
                teacherCount: { $size: "$assignedTeachers" },
              },
            },
            {
              $sort: {
                [sortBys]: sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
            {
              $project: {
                uId: 1,
                courseName: 1,
                about: 1,
                numericPart: 1,
                assigned: 1,
                courseDuration: 1,
                coursePicture: 1,
                originalCourseId: 1,
                subFolder: { $arrayElemAt: ["$folderData.subFolder", 0] },
                status: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $lte: [
                            currentDateInMilliseconds,
                            { $toLong: "$expiredOn" },
                          ],
                        },
                        {
                          $gte: [
                            currentDateInMilliseconds,
                            { $toLong: "$createdOn" },
                          ],
                        },
                      ],
                    },
                    then: false,
                    else: true,
                  },
                },
                disable: 1,
                startedOn: 1,
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                gradeCount: 1,
                divisionCount: 1,
                learnerCount: 1,
                teacherCount: 1,
              },
            },
          ]);
          await redisHelper.setRedisHash(
            `getAllAssignedCourse`,
            `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getCourse
          );
        }
        break;
      case 2:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedCourse`,
          `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getCourse = redisData;
        } else {
          getCourse = await courseModal.aggregate([
            matchQuery,
            {
              $lookup: {
                from: "grades",
                localField: "assignedGrade",
                foreignField: "_id",
                as: "grade",
              },
            },

            {
              $match: {
                "grade._id": new mongoose.Types.ObjectId(gradeId),
              },
            },
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
                  },
                },
                subFolderLength: { $size: "$folderData.subFolder" },
              },
            },

            { $skip: skip },
            { $limit: limitValue },
            {
              $project: {
                uId: 1,
                courseName: 1,
                // about: 1,
                // assigned: 1,
                courseDuration: 1,
                numericPart: 1,
                // coursePicture: 1,
                originalCourseId: 1,
                // subFolder: { $arrayElemAt: ["$folderData.subFolder", 0] },
                status: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $lte: [
                            currentDateInMilliseconds,
                            { $toLong: "$expiredOn" },
                          ],
                        },
                        {
                          $gte: [
                            currentDateInMilliseconds,
                            { $toLong: "$createdOn" },
                          ],
                        },
                      ],
                    },
                    then: false,
                    else: true,
                  },
                },
                disable: 1,
                // startedOn: 1,
                expiredOn: 1,
                createdOn: 1,
                // updatedOn: 1,
              },
            },
            {
              $sort: {
                [sortBys]: sortTypes,
              },
            },
          ]);
          await redisHelper.setRedisHash(
            `getAllAssignedCourse`,
            `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getCourse
          );
        }
        break;
      case 3:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedCourse`,
          `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getCourse = redisData;
        } else {
          getCourse = await courseModal.aggregate([
            matchQuery,
            {
              $lookup: {
                from: "divisions",
                localField: "assignedDivisions",
                foreignField: "_id",
                as: "divisions",
              },
            },

            {
              $match: {
                "divisions._id": new mongoose.Types.ObjectId(divisionId),
              },
            },
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
                  },
                },
                gradeCount: {
                  $cond: [{ $ne: ["$assignedGrade", null] }, 1, 0],
                },
                divisionCount: { $size: "$assignedDivisions" },
                learnerCount: { $size: "$assignedLearners" },
                teacherCount: { $size: "$assignedTeachers" },
              },
            },
            {
              $sort: {
                [sortBys]: sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
            {
              $project: {
                uId: 1,
                courseName: 1,
                about: 1,
                assigned: 1,
                courseDuration: 1,
                coursePicture: 1,
                originalCourseId: 1,
                subFolder: { $arrayElemAt: ["$folderData.subFolder", 0] },
                status: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $lte: [
                            currentDateInMilliseconds,
                            { $toLong: "$expiredOn" },
                          ],
                        },
                        {
                          $gte: [
                            currentDateInMilliseconds,
                            { $toLong: "$createdOn" },
                          ],
                        },
                      ],
                    },
                    then: false,
                    else: true,
                  },
                },
                disable: 1,
                startedOn: 1,
                expiredOn: 1,
                numericPart: 1,
                createdOn: 1,
                updatedOn: 1,
                gradeCount: 1,
                divisionCount: 1,
                learnerCount: 1,
                teacherCount: 1,
              },
            },
          ]);
          await redisHelper.setRedisHash(
            `getAllAssignedCourse`,
            `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getCourse
          );
        }
        break;
      case 4:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedCourse`,
          `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getCourse = redisData;
        } else {
          getCourse = await courseModal.aggregate([
            matchQuery,
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
                  },
                },
                gradeCount: {
                  $cond: [{ $ne: ["$assignedGrade", null] }, 1, 0],
                },
                divisionCount: { $size: "$assignedDivisions" },
                learnerCount: { $size: "$assignedLearners" },
                teacherCount: { $size: "$assignedTeachers" },
              },
            },
            {
              $sort: {
                [sortBys]: +sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
            {
              $project: {
                uId: 1,
                courseName: 1,
                originalCourseId: 1,
                numericPart: 1,
                // subFolder: { $arrayElemAt: ["$folderData.subFolder", 0] }, // These are now required thats why removed
                status: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $lte: [
                            currentDateInMilliseconds,
                            { $toLong: "$expiredOn" },
                          ],
                        },
                        {
                          $gte: [
                            currentDateInMilliseconds,
                            { $toLong: "$createdOn" },
                          ],
                        },
                      ],
                    },
                    then: false,
                    else: true,
                  },
                },
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                gradeCount: 1,
                divisionCount: 1,
                learnerCount: 1,
                teacherCount: 1,
              },
            },
          ]);
          await redisHelper.setRedisHash(
            `getAllAssignedCourse`,
            `getAllAssignedCourse_${limitValue}_${skip}_${sortBys}_${sortTypes}_${ongoing}_${expired}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getCourse
          );
        }
    }

    let totalLength = await courseModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getCourse,
      status: true,
      message: "Course retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllAssignedCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const disableCourse = async (req, res) => {
  const { courseId } = req.params;
  try {
    let courseExists = await courseModal.findById(courseId);

    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    courseExists.disable = courseExists.disable ? false : true;
    await divisionModal.updateMany(
      { "courses.courseId": courseId },
      { "courses.disable": courseExists.disable }
    );
    await gradeModal.updateMany(
      { "courses.courseId": courseId },
      { "courses.disable": courseExists.disable }
    );
    await teacherModal.updateMany(
      { "coursesForLearn.courseId": courseId },
      { "coursesForLearn.disable": courseExists.disable }
    );
    await teacherModal.updateMany(
      { "coursesForTeach.courseId": courseId },
      { "coursesForTeach.disable": courseExists.disable }
    );
    await learnerModal.updateMany(
      { "courses.courseId": courseId },
      { "courses.disable": courseExists.disable }
    );

    await courseExists.save();
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllLearner",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (courseExists) {
      return res.status(200).json({
        status: true,
        message: "the course successfully updated",
        data: courseExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

//if course assigned then it will remove association of course from grade,division,learner,trainer before delete.
export const deleteCourse = async (req, res) => {
  const { courseId, originalCourseId } = req.params;
  try {
    let courseExists = await courseModal.findById(courseId);

    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not exist with courseId ${courseId}`,
        status: false,
      });
    }
    if (courseExists.assigned) {
      await gradeModal.updateMany(
        { "courses.courseId": courseId },
        { $pull: { courses: { courseId: courseId } } }
      );
      await divisionModal.updateMany(
        { "courses.courseId": courseId },
        { $pull: { courses: { courseId: courseId } } }
      );
      await learnerModal.updateMany(
        { "courses.courseId": courseId },
        { $pull: { courses: { courseId: courseId } } }
      );
      await teacherModal.updateMany(
        { "coursesForLearn.courseId": courseId },
        { $pull: { coursesForLearn: { courseId: courseId } } }
      );
    }
    const getOldCourseDetail = await courseModal
      .findById(originalCourseId)
      .lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: originalCourseId },
        { subCourseCount: getOldCourseDetail.subCourseCount - 1 }
      );
    }
    await notificationModal.deleteMany({
      "data.courseId": new mongoose.Types.ObjectId(courseId),
    });
    await courseModal.deleteOne({ _id: courseId });
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllLearner",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "the course successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidCourse = async (req, res) => {
  try {
    let courseExists = await courseModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!courseExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "C-1",
      });
    }

    const lastUid = courseExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "C-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    let courseExists = await courseModal.findById(courseId).populate({
      path: "contentFolder",
      populate: {
        path: "subFolder",
      },
    });

    let AssignedDivision = await courseModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "divisions",
          localField: "assignedDivisions",
          foreignField: "_id",
          as: "divisionData",
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "divisionData.schoolId",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      {
        $lookup: {
          from: "grades",
          localField: "divisionData.gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      { $unwind: "$schoolData" },
      { $unwind: "$gradeData" },
      { $unwind: "$divisionData" },
      {
        $project: {
          divisionUid: "$divisionData.divisionUid",
          divisionName: "$divisionData.divisionName",
          gradeUid: "$gradeData.gradeUid",
          gradeName: "$gradeData.gradeName",
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          startedOn: "$startedOn",
          expiredOn: "$expiredOn",
          createdOn: "$createdOn",
        },
      },
    ]);

    let AssignedLearners = await courseModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "users",
          localField: "assignedLearners",
          foreignField: "_id",
          as: "LearnerData",
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "LearnerData.schoolId",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      {
        $lookup: {
          from: "grades",
          localField: "LearnerData.gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "LearnerData.divisionId",
          foreignField: "_id",
          as: "divisionData",
        },
      },
      { $unwind: "$schoolData" },
      { $unwind: "$gradeData" },
      { $unwind: "$LearnerData" },
      { $unwind: "$divisionData" },
      {
        $project: {
          learnerUid: "$LearnerData.uId",
          learnerName: "$LearnerData.fullName",
          divisionUid: "$divisionData.divisionUid",
          divisionName: "$divisionData.divisionName",
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          gradeUid: "$gradeData.gradeUid",
          gradeName: "$gradeData.gradeName",
          startedOn: "$startedOn",
          expiredOn: "$expiredOn",
          createdOn: "$createdOn",
        },
      },
    ]);

    let AssignedTeachers = await courseModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "users",
          localField: "assignedTeachers",
          foreignField: "_id",
          as: "teacherData",
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "teacherData.schoolId",
          foreignField: "_id",
          as: "schoolData",
        },
      },

      { $unwind: "$schoolData" },
      { $unwind: "$teacherData" },
      {
        $project: {
          teacherUid: "$teacherData.uId",
          teacherName: "$teacherData.fullName",
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          startedOn: "$startedOn",
          expiredOn: "$expiredOn",
          createdOn: "$createdOn",
        },
      },
    ]);

    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not exist with courseId ${courseId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "The course successfully retrieved",
      data: courseExists,
      AssignedDivision,
      AssignedLearners,
      AssignedTeachers,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

//this course has assgined to grade and its division that teacher teach the student accordingly to the division
export const assignCourseToGrade = async (req, res) => {
  try {
    const { uId, courseId, gradeId, courseName } = req.body;

    let courseExists = await courseModal.findById(courseId);
    let expiredOn;
    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let courseNameUIDExists = await courseModal.findOne({
      $or: [{ uId }, { courseName }],
    });

    if (courseNameUIDExists) {
      if (uId == courseNameUIDExists.uId)
        return res.status(409).json({
          message: `Course already exists with uid ${uId}`,
          status: false,
        });

      if (courseName == courseNameUIDExists.courseName)
        return res.status(409).json({
          message: `Course already exists with courseName ${courseName}`,
          status: false,
        });
    }

    let gradeExists = await gradeModal.findById(gradeId);

    if (!gradeExists) {
      return res.status(404).json({
        message: `Grade does not exist with gradeId ${gradeId}`,
        status: false,
      });
    }

    if (courseExists.courseDuration.slot == "days") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "months") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 30.44 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "years") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 365 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    const newCourse = await courseModal.create({
      uId,
      courseName,
      about: courseExists.about,
      assigned: true,
      coursePicture: courseExists.coursePicture,
      courseDuration: courseExists.courseDuration,
      contentFolder: courseExists.contentFolder,
      assignedGrade: gradeId,
      assignedDivisions: gradeExists.divisions,
      originalCourseId: courseId,
      expiredOn,
      createdOn: new Date().getTime(),
    });
    await gradeModal.updateOne(
      {
        _id: gradeId,
      },
      {
        $addToSet: {
          courses: {
            courseId: newCourse._id,
            assignedOn: new Date().getTime(),
            expiredOn,
          },
        },
      }
    );

    await divisionModal.updateMany(
      {
        gradeId,
      },
      {
        $addToSet: {
          courses: {
            courseId: newCourse._id,
            assignedOn: new Date().getTime(),
            expiredOn,
          },
        },
      }
    );
    await teacherModal.updateMany(
      {
        "gradeNdivision.gradeId": gradeId,
      },
      {
        $addToSet: {
          coursesForTeach: {
            courseId: newCourse._id,
            assignedOn: new Date().getTime(),
            expiredOn,
          },
        },
      }
    );
    await learnerModal.updateMany(
      {
        gradeId: gradeId,
      },
      {
        $addToSet: {
          courses: {
            courseId: newCourse._id,
            assignedOn: new Date().getTime(),
            expiredOn,
          },
        },
      }
    );

    const getAllTeacher = await teacherModal.find({
      "gradeNdivision.gradeId": new mongoose.Types.ObjectId(gradeId),
    });
    if (
      !!getAllTeacher === true &&
      Array.isArray(getAllTeacher) &&
      getAllTeacher.length > 0
    ) {
      for (const iterator of getAllTeacher) {
        let message = {};
        let payload = { message };
        payload.userId = iterator._id;
        payload.deviceToken = iterator.deviceToken;
        payload.deviceType = iterator.deviceType;
        payload.isTeacher = true;
        payload.isCourse = true;
        payload.isAssessment = false;
        message.notification = {
          title: "New Course",
          body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Course Assigned",
          courseId: new mongoose.Types.ObjectId(newCourse._id),
          coursePicture: courseExists.coursePicture,
        };
        addNotification.emit("addNotification", payload);
        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.courseName = courseName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
            "DD-MM-YYYY"
          );
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/courseAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New Course Assignment ${courseName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
    }

    const getAllLearner = await learnerModal.find({
      gradeId: new mongoose.Types.ObjectId(gradeId),
    });
    if (
      !!getAllLearner === true &&
      Array.isArray(getAllLearner) &&
      getAllLearner.length > 0
    ) {
      for (const iterator of getAllLearner) {
        let message = {};
        let payload = { message };
        payload.userId = iterator._id;
        payload.deviceToken = iterator.deviceToken;
        payload.deviceType = iterator.deviceType;
        payload.isLerner = true;
        payload.isCourse = true;
        payload.isAssessment = false;
        message.notification = {
          title: "New Course",
          body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Course Assigned",
          courseId: new mongoose.Types.ObjectId(newCourse._id),
          coursePicture: courseExists.coursePicture,
        };
        addNotification.emit("addNotification", payload);
        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.courseName = courseName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
            "DD-MM-YYYY"
          );
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/courseAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New Course Assignment ${courseName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
    }
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllLearner",
      "getAllTeacher",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    const getOldCourseDetail = await courseModal.findById(courseId).lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: courseId },
        { subCourseCount: getOldCourseDetail.subCourseCount + 1 }
      );
    }
    if (newCourse) {
      return res.status(201).json({
        status: true,
        message: "The course has been assigned to grade successfully",
      });
    }
  } catch (err) {
    logger.error(`Error from function ${assignCourseToGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

// this course has assgined to the division that teacher teach the student accordingly.
export const assignCourseToDivision = async (req, res) => {
  try {
    const { uId, courseId, divisionIds, courseName } = req.body;
    let courseExists = await courseModal.findById(courseId);
    let expiredOn;
    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let courseNameUIDExists = await courseModal.findOne({
      $or: [{ uId }, { courseName }],
    });

    if (courseNameUIDExists) {
      if (uId == courseNameUIDExists.uId)
        return res.status(409).json({
          message: `Course already exists with uid ${uId}`,
          status: false,
        });

      if (courseName == courseNameUIDExists.courseName)
        return res.status(409).json({
          message: `Course already exists with courseName ${courseName}`,
          status: false,
        });
    }

    let divisionIdsExists = await divisionModal.find({
      _id: { $in: divisionIds },
    });
    const existingDivisionIds = divisionIdsExists.map((division) =>
      division._id.toString()
    );
    const nonExistentDivisionIds = divisionIds.filter(
      (id) => !existingDivisionIds.includes(id)
    );
    if (nonExistentDivisionIds.length > 0) {
      return res.status(404).json({
        message: `Some division are not exist`,
        status: false,
        data: nonExistentDivisionIds,
      });
    }

    if (courseExists.courseDuration.slot == "days") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "months") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 30.44 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "years") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 365 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }

    const newCourse = await courseModal.create({
      uId,
      courseName,
      about: courseExists.about,
      assigned: true,
      coursePicture: courseExists.coursePicture,
      courseDuration: courseExists.courseDuration,
      contentFolder: courseExists.contentFolder,
      assignedDivisions: divisionIds,
      originalCourseId: courseId,
      // assignedTeachers: getAllTeacherForAssign,
      // assignedLearners: getAllLearnerForAssign,
      expiredOn,
      createdOn: new Date().getTime(),
    });

    for await (let divisionId of divisionIds) {
      await divisionModal.updateOne(
        {
          _id: divisionId,
        },
        {
          $addToSet: {
            courses: {
              courseId: newCourse._id,
              assignedOn: new Date().getTime(),
              expiredOn,
            },
          },
        }
      );

      await teacherModal.updateMany(
        {
          "gradeNdivision.divisionId": divisionId,
        },
        {
          $addToSet: {
            coursesForTeach: {
              courseId: newCourse._id,
              assignedOn: new Date().getTime(),
              expiredOn,
            },
          },
        }
      );
      const getAllTeacher = await teacherModal.find({
        "gradeNdivision.divisionId": new mongoose.Types.ObjectId(divisionId),
      });
      if (
        !!getAllTeacher === true &&
        Array.isArray(getAllTeacher) &&
        getAllTeacher.length > 0
      ) {
        for await (const iterator of getAllTeacher) {
          let message = {};
          let payload = { message };
          payload.userId = iterator._id;
          payload.deviceToken = iterator.deviceToken;
          payload.deviceType = iterator.deviceType;
          payload.isTeacher = true;
          payload.isCourse = true;
          payload.isAssessment = false;
          message.notification = {
            title: "New Course",
            body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
            date: new Date().getTime(),
          };
          message.data = {
            type: "Course Assigned",
            courseId: new mongoose.Types.ObjectId(newCourse._id),
            coursePicture: courseExists.coursePicture,
          };
          addNotification.emit("addNotification", payload);
          if (process.env.SENTEMAIL === "true") {
            // This point is used to sent email Registration Email
            let registerEmailPayload = {};
            registerEmailPayload.name = iterator.fullName;
            registerEmailPayload.courseName = courseName;
            registerEmailPayload.createdOn = moment1()
              .tz("Asia/Kolkata")
              .format("DD-MM-YYYY");
            registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
              "DD-MM-YYYY"
            );
            let filePath = path.join(
              process.cwd(),
              "./middleware/emailTemplate/courseAssigned.ejs"
            );
            let source = fs.readFileSync(filePath, "utf-8").toString();
            const htmlToSent = ejs.render(source, registerEmailPayload);
            registerEmailPayload.email = iterator?.email;
            registerEmailPayload.subject = `New Course Assignment ${courseName}`;
            registerEmailPayload.html = htmlToSent;
            await rabbitMqHelper.produceQueue(registerEmailPayload);
          }
        }
      }
      await learnerModal.updateMany(
        {
          divisionId: divisionId,
        },
        {
          $addToSet: {
            courses: {
              courseId: newCourse._id,
              assignedOn: new Date().getTime(),
              expiredOn,
            },
          },
        }
      );

      const getAllLearner = await learnerModal.find({
        divisionId: new mongoose.Types.ObjectId(divisionId),
      });
      if (
        !!getAllLearner === true &&
        Array.isArray(getAllLearner) &&
        getAllLearner.length > 0
      ) {
        for (const iterator of getAllLearner) {
          let message = {};
          let payload = { message };
          payload.userId = iterator._id;
          payload.deviceToken = iterator.deviceToken;
          payload.deviceType = iterator.deviceType;
          payload.isLerner = true;
          payload.isCourse = true;
          payload.isAssessment = false;
          message.notification = {
            title: "New Course",
            body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
            date: new Date().getTime(),
          };
          message.data = {
            type: "Course Assigned",
            courseId: new mongoose.Types.ObjectId(newCourse._id),
            coursePicture: courseExists.coursePicture,
          };
          addNotification.emit("addNotification", payload);
          if (process.env.SENTEMAIL === "true") {
            // This point is used to sent email Registration Email
            let registerEmailPayload = {};
            registerEmailPayload.name = iterator.fullName;
            registerEmailPayload.courseName = courseName;
            registerEmailPayload.createdOn = moment1()
              .tz("Asia/Kolkata")
              .format("DD-MM-YYYY");
            registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
              "DD-MM-YYYY"
            );
            let filePath = path.join(
              process.cwd(),
              "./middleware/emailTemplate/courseAssigned.ejs"
            );
            let source = fs.readFileSync(filePath, "utf-8").toString();
            const htmlToSent = ejs.render(source, registerEmailPayload);
            registerEmailPayload.email = iterator?.email;
            registerEmailPayload.subject = `New Course Assignment ${courseName}`;
            registerEmailPayload.html = htmlToSent;
            await rabbitMqHelper.produceQueue(registerEmailPayload);
          }
        }
      }
    }
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllLearner",
      "getAllTeacher",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    const getOldCourseDetail = await courseModal.findById(courseId).lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: courseId },
        { subCourseCount: getOldCourseDetail.subCourseCount + 1 }
      );
    }
    return res.status(201).json({
      status: true,
      message: "The course has been assigned to division successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${assignCourseToDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

//either this learning course has assgined to single learner/multiple teacher
export const assignCourseToLearner = async (req, res) => {
  try {
    const { uId, courseId, learnerIds, courseName } = req.body;

    let courseExists = await courseModal.findById(courseId);
    let expiredOn;
    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let courseNameUIDExists = await courseModal.findOne({
      $or: [{ uId }, { courseName }],
    });

    if (courseNameUIDExists) {
      if (uId == courseNameUIDExists.uId)
        return res.status(409).json({
          message: `Course already exists with uid ${uId}`,
          status: false,
        });

      if (courseName == courseNameUIDExists.courseName)
        return res.status(409).json({
          message: `Course already exists with courseName ${courseName}`,
          status: false,
        });
    }

    let learnerIdsExists = await learnerModal.find({
      _id: { $in: learnerIds },
    });
    const existingLearnerIds = learnerIdsExists.map((learner) =>
      learner._id.toString()
    );
    const nonExistentLearnerIds = learnerIds.filter(
      (id) => !existingLearnerIds.includes(id)
    );
    if (nonExistentLearnerIds.length > 0) {
      return res.status(404).json({
        message: `Some learner are not exist`,
        status: false,
        data: nonExistentLearnerIds,
      });
    }

    if (courseExists.courseDuration.slot == "days") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "months") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 30.44 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "years") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 365 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }

    const newCourse = await courseModal.create({
      uId,
      courseName,
      about: courseExists.about,
      assigned: true,
      coursePicture: courseExists.coursePicture,
      courseDuration: courseExists.courseDuration,
      contentFolder: courseExists.contentFolder,
      assignedLearners: learnerIds,
      expiredOn,
      originalCourseId: courseId,
      createdOn: new Date().getTime(),
    });

    for (let learnerId of learnerIds) {
      await learnerModal.updateOne(
        {
          _id: learnerId,
        },
        {
          $addToSet: {
            courses: {
              courseId: newCourse._id,
              assignedOn: new Date().getTime(),
              expiredOn,
            },
          },
        }
      );
      const getAllLerner = await learnerModal.find({
        _id: new mongoose.Types.ObjectId(learnerId),
      });
      if (
        !!getAllLerner === true &&
        Array.isArray(getAllLerner) &&
        getAllLerner.length > 0
      ) {
        for (const iterator of getAllLerner) {
          let message = {};
          let payload = { message };
          payload.userId = iterator._id;
          payload.deviceToken = iterator.deviceToken;
          payload.deviceType = iterator.deviceType;
          payload.isLerner = true;
          payload.isCourse = true;
          payload.isAssessment = false;
          message.notification = {
            title: "New Course",
            body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
            date: new Date().getTime(),
          };
          message.data = {
            type: "Course Assigned",
            courseId: new mongoose.Types.ObjectId(newCourse._id),
            coursePicture: courseExists.coursePicture,
          };
          addNotification.emit("addNotification", payload);
          if (process.env.SENTEMAIL === "true") {
            // This point is used to sent email Registration Email
            let registerEmailPayload = {};
            registerEmailPayload.name = iterator.fullName;
            registerEmailPayload.courseName = courseName;
            registerEmailPayload.createdOn = moment1()
              .tz("Asia/Kolkata")
              .format("DD-MM-YYYY");
            registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
              "DD-MM-YYYY"
            );
            let filePath = path.join(
              process.cwd(),
              "./middleware/emailTemplate/courseAssigned.ejs"
            );
            let source = fs.readFileSync(filePath, "utf-8").toString();
            const htmlToSent = ejs.render(source, registerEmailPayload);
            registerEmailPayload.email = iterator?.email;
            registerEmailPayload.subject = `New Course Assignment ${courseName}`;
            registerEmailPayload.html = htmlToSent;
            await rabbitMqHelper.produceQueue(registerEmailPayload);
          }
        }
      }
    }
    let deleteRedisHash = [
      "getAllNotAssignedCourse",
      "getAllLearner",
      "getAllAssignedCourse",
    ];

    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    const getOldCourseDetail = await courseModal.findById(courseId).lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: courseId },
        { subCourseCount: getOldCourseDetail.subCourseCount + 1 }
      );
    }
    return res.status(201).json({
      status: true,
      message: "The course has been assigned to learner successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${assignCourseToLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

//either this learning course has assgined to single teacher/multiple teacher
export const assignCourseToTeacher = async (req, res) => {
  try {
    const { uId, courseId, teacherIds, courseName } = req.body;
    let courseExists = await courseModal.findById(courseId);
    let expiredOn;
    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let courseNameUIDExists = await courseModal.findOne({
      $or: [{ uId }, { courseName }],
    });

    if (courseNameUIDExists) {
      if (uId == courseNameUIDExists.uId)
        return res.status(409).json({
          message: `Course already exists with uid ${uId}`,
          status: false,
        });

      if (courseName == courseNameUIDExists.courseName)
        return res.status(409).json({
          message: `Course already exists with courseName ${courseName}`,
          status: false,
        });
    }

    let teacherIdsExists = await teacherModal.find({
      _id: { $in: teacherIds },
    });
    const existingTeacherIds = teacherIdsExists.map((learner) =>
      learner._id.toString()
    );
    const nonExistentTeacherIds = teacherIds.filter(
      (id) => !existingTeacherIds.includes(id)
    );
    if (nonExistentTeacherIds.length > 0) {
      return res.status(404).json({
        message: `Some teacher are not exist`,
        status: false,
        data: nonExistentTeacherIds,
      });
    }

    if (courseExists.courseDuration.slot == "days") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "months") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 30.44 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }
    if (courseExists.courseDuration.slot == "years") {
      let currentMilliSeconds = new Date().getTime();
      let durationMilliSeconds =
        courseExists.courseDuration.duration * 365 * 24 * 60 * 60 * 1000;
      expiredOn = currentMilliSeconds + durationMilliSeconds;
    }

    const newCourse = await courseModal.create({
      uId,
      courseName,
      about: courseExists.about,
      assigned: true,
      coursePicture: courseExists.coursePicture,
      courseDuration: courseExists.courseDuration,
      contentFolder: courseExists.contentFolder,
      assignedTeachers: teacherIds,
      originalCourseId: courseId,
      expiredOn,
      createdOn: new Date().getTime(),
    });

    for (let teacherId of teacherIds) {
      await teacherModal.updateOne(
        {
          _id: teacherId,
        },
        {
          $addToSet: {
            coursesForLearn: {
              courseId: newCourse._id,
              assignedOn: new Date().getTime(),
              expiredOn,
            },
          },
        }
      );

      const getAllTeacher = await teacherModal.find({
        _id: new mongoose.Types.ObjectId(teacherId),
      });
      if (
        !!getAllTeacher === true &&
        Array.isArray(getAllTeacher) &&
        getAllTeacher.length > 0
      ) {
        for (const iterator of getAllTeacher) {
          let message = {};
          let payload = { message };
          payload.userId = iterator._id;
          payload.deviceToken = iterator.deviceToken;
          payload.deviceType = iterator.deviceType;
          payload.isTeacher = true;
          payload.isCourse = false;
          payload.isAssessment = false;
          payload.isLibrary = true;
          message.notification = {
            title: "New Course",
            body: `Congratulations! You've successfully enrolled in the course ${courseName}`,
            date: new Date().getTime(),
          };
          message.data = {
            type: "Course Assigned",
            courseId: new mongoose.Types.ObjectId(newCourse._id),
            coursePicture: courseExists.coursePicture,
          };
          addNotification.emit("addNotification", payload);
          if (process.env.SENTEMAIL === "true") {
            let registerEmailPayload = {};
            registerEmailPayload.name = iterator.fullName;
            registerEmailPayload.courseName = courseName;
            registerEmailPayload.createdOn = moment1()
              .tz("Asia/Kolkata")
              .format("DD-MM-YYYY");
            registerEmailPayload.expiredOn = moment(new Date(expiredOn)).format(
              "DD-MM-YYYY"
            );
            let filePath = path.join(
              process.cwd(),
              "./middleware/emailTemplate/courseAssigned.ejs"
            );
            let source = fs.readFileSync(filePath, "utf-8").toString();
            const htmlToSent = ejs.render(source, registerEmailPayload);
            registerEmailPayload.email = iterator?.email;
            registerEmailPayload.subject = `New Course Assignment ${courseName}`;
            registerEmailPayload.html = htmlToSent;
            await rabbitMqHelper.produceQueue(registerEmailPayload);
          }
        }
      }
    }
    const getOldCourseDetail = await courseModal.findById(courseId).lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: courseId },
        { subCourseCount: getOldCourseDetail.subCourseCount + 1 }
      );
    }
    let deleteRedisHash = [
      "getAllAssignedCourse",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllLearner",
      "getAllTeacher",
      "getAllNotAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);

    return res.status(201).json({
      status: true,
      message: "The course has been assigned to teacher successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${assignCourseToTeacher.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const removeDivisionFromCourse = async (req, res) => {
  try {
    const { divisionId, courseId, originalCourseId } = req.body;

    let courseExists = await courseModal.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }

    let divisionExists = await divisionModal.findById(divisionId);
    if (!divisionExists) {
      return res.status(404).json({
        message: `Division does not Exist with division ${divisionId}`,
        status: false,
      });
    }

    const divisionIndex = courseExists.assignedDivisions.indexOf(divisionId);
    if (divisionIndex > -1) {
      //when element does not match it returns -1
      courseExists.assignedDivisions.splice(divisionIndex, 1);
    }

    const courseIndex = divisionExists.courses.findIndex(
      (course) => course.courseId.toString() === courseId
    );
    if (courseIndex > -1) {
      //when element does not match it returns -1
      divisionExists.courses.splice(courseIndex, 1);
    }
    const getOldCourseDetail = await courseModal
      .findById(originalCourseId)
      .lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: originalCourseId },
        { subCourseCount: getOldCourseDetail.subCourseCount - 1 }
      );
    }
    await notificationModal.deleteMany({
      "data.courseId": new mongoose.Types.ObjectId(courseId),
    });
    await courseExists.save();
    await divisionExists.save();
    let deleteRedisHash = [
      "getAllLearner",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "The division has been removed successfully from course",
    });
  } catch (err) {
    logger.error(`Error from function ${removeDivisionFromCourse.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllCourseWithTrackRecordOfLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    let matchObject = {};
    const currentDateInMilliseconds = Date.now();

    if (ongoing != "true" && expired != "true") {
      return res.status(400).json({
        status: false,
        message: "you should give which course either ongoing or expired",
      });
    }

    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };

      if (search) {
        pipeline.splice(5, 0, {
          $match: {
            $or: [
              {
                "courseData.uId": {
                  $regex: search,
                  $options: "i",
                },
              },
              {
                "courseData.courseName": {
                  $regex: search,
                  $options: "i",
                },
              },
            ],
          },
        });
      }
    }

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      {
        $match: {
          assigned: true,
          assignedLearners: { $in: [new mongoose.Types.ObjectId(learnerId)] },
          expiredOn: matchObject,
        },
      },
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      { $unwind: "$folderData" },

      {
        $lookup: {
          from: "subfolders",
          localField: "folderData.subFolder",
          foreignField: "_id",
          as: "subFolderData",
        },
      },

      {
        $lookup: {
          from: "subfoldertracks",
          let: {
            folderSubFolderIds: "$folderData.subFolder",
            courseId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$userId", new mongoose.Types.ObjectId(learnerId)],
                    },
                    { $eq: ["$courseId", "$$courseId"] },
                    { $in: ["$subFolderId", "$$folderSubFolderIds"] },
                  ],
                },
              },
            },
          ],
          as: "subFolderTrackData",
        },
      },

      {
        $addFields: {
          subFolderData: {
            $map: {
              input: "$subFolderData",
              as: "subFolder",
              in: {
                $mergeObjects: [
                  "$$subFolder",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$subFolderTrackData",
                          cond: {
                            $eq: ["$$this.subFolderId", "$$subFolder._id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: 1,
                uId: "$courseData.uId",
                courseName: 1,
                about: 1,
                assigned: 1,
                courseDuration: 1,
                disable: 1,
                startedOn: 1,
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                totalChapter: { $size: "$folderData.subFolder" },
                completeChapter: { $size: "$subFolderTrackData" },
              },
            },
          ],
        },
      },
      {
        $sort: {
          [sortBys]: sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
    ];

    getCourse = await courseModal.aggregate(pipeline);

    return res.status(200).json({
      data: getCourse[0].data,
      totalLength: getCourse[0].totalCount[0]?.total || 0,
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllCourseWithTrackRecordOfLearner.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getSingleCourseOfLearnerWithTrackRecord = async (req, res) => {
  try {
    const { learnerId, courseId } = req.params;
    let pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      { $unwind: "$folderData" },

      {
        $lookup: {
          from: "subfolders",
          localField: "folderData.subFolder",
          foreignField: "_id",
          as: "subFolderData",
        },
      },
      {
        $lookup: {
          from: "subfoldertracks",
          let: {
            folderSubFolderIds: "$folderData.subFolder",
            courseId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$userId", new mongoose.Types.ObjectId(learnerId)],
                    },
                    { $eq: ["$courseId", "$$courseId"] },
                    { $in: ["$subFolderId", "$$folderSubFolderIds"] },
                  ],
                },
              },
            },
          ],
          as: "subFolderTrackData",
        },
      },
      {
        $addFields: {
          subFolderData: {
            $map: {
              input: "$subFolderData",
              as: "subFolder",
              in: {
                $mergeObjects: [
                  "$$subFolder",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$subFolderTrackData",
                          cond: {
                            $eq: ["$$this.subFolderId", "$$subFolder._id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 1,
          uId: 1,
          courseName: 1,
          about: 1,
          assigned: 1,
          courseDuration: 1,
          disable: 1,
          startedOn: 1,
          expiredOn: 1,
          createdOn: 1,
          updatedOn: 1,
          subFolderData: 1,
        },
      },
    ];

    let getCourse = await courseModal.aggregate(pipeline);

    return res.status(200).json({
      data: getCourse[0],
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {}
  logger.error(
    `Error from function ${getSingleCourseOfLearnerWithTrackRecord.name}`,
    { stack: err.stack }
  );
};

export const getAllCourseWithTrackRecordOfTeacherForLearn = async (
  req,
  res
) => {
  try {
    const { teacherId } = req.params;
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    let matchObject = {};
    const currentDateInMilliseconds = Date.now();

    if (ongoing != "true" && expired != "true") {
      return res.status(400).json({
        status: false,
        message: "you should give which course either ongoing or expired",
      });
    }
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };
    }

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      {
        $match: {
          assigned: true,
          assignedTeachers: { $in: [new mongoose.Types.ObjectId(teacherId)] }, //this code and below code same use
          // assignedTeachers: {
          //   $elemMatch: { $eq: new mongoose.Types.ObjectId(userId) },
          // },
          expiredOn: matchObject,
        },
      },
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      { $unwind: "$folderData" },

      {
        $lookup: {
          from: "subfolders",
          localField: "folderData.subFolder",
          foreignField: "_id",
          as: "subFolderData",
        },
      },

      {
        $lookup: {
          from: "subfoldertracks",
          let: {
            folderSubFolderIds: "$folderData.subFolder",
            courseId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$userId", new mongoose.Types.ObjectId(teacherId)],
                    },
                    { $eq: ["$courseId", "$$courseId"] },
                    { $in: ["$subFolderId", "$$folderSubFolderIds"] },
                  ],
                },
              },
            },
          ],
          as: "subFolderTrackData",
        },
      },

      {
        $addFields: {
          subFolderData: {
            $map: {
              input: "$subFolderData",
              as: "subFolder",
              in: {
                $mergeObjects: [
                  "$$subFolder",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$subFolderTrackData",
                          cond: {
                            $eq: ["$$this.subFolderId", "$$subFolder._id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: 1,
                uId: "$courseData.uId",
                coursePicture: 1,
                courseName: 1,
                about: 1,
                assigned: 1,
                courseDuration: 1,
                disable: 1,
                startedOn: 1,
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                totalChapter: { $size: "$folderData.subFolder" },
                completeChapter: { $size: "$subFolderTrackData" },
              },
            },
            {
              $sort: {
                [sortBys]: sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
          ],
        },
      },
    ];
    if (ongoing === "true" || expired === "true") {
      if (search) {
        pipeline.splice(5, 0, {
          $match: {
            $or: [
              {
                uId: {
                  $regex: search,
                  $options: "i",
                },
              },
              {
                courseName: {
                  $regex: search,
                  $options: "i",
                },
              },
            ],
          },
        });
      }
    }
    getCourse = await courseModal.aggregate(pipeline);
    let returnArray = getCourse.length <= 0 ? [] : getCourse[0].data;
    let returnCount =
      getCourse.length <= 0 ? 0 : getCourse[0].totalCount[0]?.total;
    return res.status(200).json({
      data: returnArray,
      totalLength: returnCount,
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllCourseWithTrackRecordOfTeacherForLearn.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllCourseWithTrackRecordOfTeacherForTeach = async (
  req,
  res
) => {
  try {
    const { teacherId } = req.params;
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      gradeId,
      divisionId,
      ongoing,
      expired,
    } = req.query;

    let divisionIds = [];
    const currentDateInMilliseconds = Date.now();
    let matchObject = {};
    if (ongoing != "true" && expired != "true") {
      return res.status(400).json({
        status: false,
        message: "you should give which course either ongoing or expired",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res
        .status(400)
        .json({ message: "teacherId is not correct ", status: false });
    }
    let teacherExists = await teacherModal.findById(teacherId);
    if (!teacherExists) {
      return res.status(404).json({
        message: `the teacher with teacherId ${teacherId} does not exist`,
      });
    }
    if (mongoose.Types.ObjectId.isValid(gradeId) === true) {
      for (let division of teacherExists.gradeNdivision) {
        if (division.gradeId.toString() === gradeId)
          divisionIds.push(division.divisionId);
      }
    } else if (mongoose.Types.ObjectId.isValid(divisionId) === true) {
      divisionIds.push(new mongoose.Types.ObjectId(divisionId));
    } else {
      for (let division of teacherExists.gradeNdivision) {
        divisionIds.push(division.divisionId);
      }
    }

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };
    }

    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },
      { $unwind: "$coursesForTeach" },
      { $match: { "coursesForTeach.expiredOn": matchObject } },
      {
        $lookup: {
          from: "courses",
          localField: "coursesForTeach.courseId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      { $unwind: "$courseData" },
      {
        $lookup: {
          from: "folders",
          localField: "courseData.contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      { $unwind: "$folderData" },
      {
        $lookup: {
          from: "subfoldertracks",
          let: {
            folderSubFolderIds: "$folderData.subFolder",
            courseId: "$courseData._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$userId", new mongoose.Types.ObjectId(teacherId)],
                    },
                    { $eq: ["$courseId", "$$courseId"] },
                    { $in: ["$subFolderId", "$$folderSubFolderIds"] },
                  ],
                },
              },
            },
          ],
          as: "subFolderTrackData",
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: "$courseData._id",
                uId: "$courseData.uId",
                courseName: "$courseData.courseName",
                coursePicture: "$courseData.coursePicture",
                about: "$courseData.about",
                assigned: "$courseData.assigned",
                courseDuration: "$courseData.courseDuration",
                disable: "$courseData.disable",
                startedOn: "$courseData.startedOn",
                expiredOn: "$courseData.expiredOn",
                createdOn: "$courseData.createdOn",
                updatedOn: "$courseData.updatedOn",
                totalChapter: { $size: "$folderData.subFolder" },
                completeChapter: { $size: "$subFolderTrackData" },
              },
            },
            {
              $sort: {
                [sortBys]: sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
          ],
        },
      },
    ];
    if (search) {
      pipeline.splice(5, 0, {
        $match: {
          $or: [
            {
              "courseData.uId": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "courseData.courseName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }
    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllCourseWithTrackRecordOfTeacherForTeach`,
      `getAllCourseWithTrackRecordOfTeacherForTeach_${teacherId}_${limitValue}_${skip}_${sortBys}_${ongoing}_${expired}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      getCourse = redisData;
    } else {
      getCourse = await teacherModal.aggregate(pipeline);
      await redisHelper.setRedisHash(
        `getAllCourseWithTrackRecordOfTeacherForTeach`,
        `getAllCourseWithTrackRecordOfTeacherForTeach_${teacherId}_${limitValue}_${skip}_${sortBys}_${ongoing}_${expired}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`,
        getCourse
      );
    }
    return res.status(200).json({
      data: getCourse[0].data,
      totalLength: getCourse[0].totalCount[0]?.total || 0,
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllCourseWithTrackRecordOfTeacherForTeach.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getSingleCourseOfTeacherWithTrackRecord = async (req, res) => {
  try {
    const { teacherId, courseId } = req.params;
    let pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      {
        $lookup: {
          from: "grades",
          localField: "assignedGrade",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      { $unwind: "$folderData" },
      { $unwind: { path: "$gradeData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "subfolders",
          localField: "folderData.subFolder",
          foreignField: "_id",
          as: "subFolderData",
        },
      },
      {
        $lookup: {
          from: "subfoldertracks",
          let: {
            folderSubFolderIds: "$folderData.subFolder",
            courseId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$userId", new mongoose.Types.ObjectId(teacherId)],
                    },
                    { $eq: ["$courseId", "$$courseId"] },
                    { $in: ["$subFolderId", "$$folderSubFolderIds"] },
                  ],
                },
              },
            },
          ],
          as: "subFolderTrackData",
        },
      },
      {
        $addFields: {
          subFolderData: {
            $map: {
              input: "$subFolderData",
              as: "subFolder",
              in: {
                $mergeObjects: [
                  "$$subFolder",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$subFolderTrackData",
                          cond: {
                            $eq: ["$$this.subFolderId", "$$subFolder._id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 1,
          uId: 1,
          gradeName: "$gradeData.gradeName",
          coursePicture: 1,
          courseName: 1,
          about: 1,
          assigned: 1,
          courseDuration: 1,
          disable: 1,
          startedOn: 1,
          expiredOn: 1,
          createdOn: 1,
          updatedOn: 1,
          subFolderData: 1,
        },
      },
    ];
    let getCourse = await courseModal.aggregate(pipeline);
    if (!!getCourse === true && getCourse.length > 0) {
      const getSchoolName = await userModal
        .findById(teacherId)
        .populate("schoolId")
        .populate({ path: "gradeNdivision.divisionId", model: "Division" })
        .lean();
      getCourse[0].schoolName = getSchoolName?.schoolId?.schoolName;
      getCourse[0].divisionName =
        getSchoolName?.gradeNdivision[0]?.divisionId?.divisionName;
    }
    return res.status(200).json({
      data: getCourse[0],
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${getSingleCourseOfTeacherWithTrackRecord.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ msg: err.message, success: false });
  }
};

export const getAllAssignedCourseForLearner = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    const { learnerId } = req.params;
    let queryObj = {
      assigned: true,
      assignedLearners: { $in: [learnerId] },
    };

    let matchQuery = {
      $match: {
        assigned: true,
        assignedLearners: { $in: [new mongoose.Types.ObjectId(learnerId)] },
      },
    };
    let matchObject = {};

    const currentDateInMilliseconds = Date.now();
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;
    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };
      matchQuery = {
        $match: {
          assignedLearners: { $in: [new mongoose.Types.ObjectId(learnerId)] },
          expiredOn: matchObject,
          assigned: true,
        },
      };
      queryObj.expiredOn = matchObject;
    }

    if (search) {
      matchQuery = {
        $match: {
          assigned: true,
          assignedLearners: { $in: [new mongoose.Types.ObjectId(learnerId)] },
          expiredOn: matchObject,
          $or: [
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              courseName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          courseName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getCourse = await courseModal.aggregate([
      matchQuery,
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
            },
          },
        },
      },

      {
        $project: {
          uId: 1,
          courseName: 1,
          about: 1,
          assigned: 1,
          courseDuration: 1,
          coursePicture: 1,
          assignedGrade: 1,
          assignedDivisions: 1,
          subFolder: { $arrayElemAt: ["$folderData.subFolder", 0] },
          status: {
            $cond: {
              if: {
                $and: [
                  {
                    $lte: [
                      currentDateInMilliseconds,
                      { $toLong: "$expiredOn" },
                    ],
                  },
                  {
                    $gte: [
                      currentDateInMilliseconds,
                      { $toLong: "$createdOn" },
                    ],
                  },
                ],
              },
              then: false,
              else: true,
            },
          },
          subfolderLength: { $ifNull: [{ $size: "$folderData.subFolder" }, 0] },
          disable: 1,
          startedOn: 1,
          expiredOn: 1,
          createdOn: 1,
          updatedOn: 1,
          numericPart: 1,
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
    ]);
    let totalLength = await courseModal.countDocuments(queryObj);
    let getUserDetail = await learnerModal.findById(learnerId);
    if (!!getCourse === true && getCourse.length > 0) {
      getCourse = getCourse.map((element) => {
        const userCourseDisableStatus = getUserDetail.courses.filter(
          (element1) => {
            return (
              element1.courseId + "".substring("") ===
              element._id + "".substring("")
            );
          }
        );
        return { ...element, userCourseDisableStatus };
      });
    }
    return res.status(200).json({
      data: getCourse,
      status: true,
      message: "Course retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllAssignedCourseForLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllAssignedCourseForTeacherForLearn = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    const { teacherId } = req.params;

    let queryObj = {
      assigned: true,
      assignedTeachers: { $in: [teacherId] },
    };

    let matchQuery = {
      $match: {
        assigned: true,
        assignedTeachers: { $in: [new mongoose.Types.ObjectId(teacherId)] },
      },
    };
    let matchObject = {};

    const currentDateInMilliseconds = Date.now();
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys === "uId" ? "numericPart" : sortBys;
      sortBys = sortBys === "subFolder" ? "chapters" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };
      matchQuery = {
        $match: {
          assignedTeachers: { $in: [new mongoose.Types.ObjectId(teacherId)] },
          expiredOn: matchObject,
          assigned: true,
        },
      };
      queryObj.expiredOn = matchObject;
    }

    if (search) {
      matchQuery = {
        $match: {
          assigned: true,
          assignedTeachers: { $in: [new mongoose.Types.ObjectId(teacherId)] },
          expiredOn: matchObject,
          $or: [
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              courseName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          courseName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getCourse = await courseModal.aggregate([
      matchQuery,
      {
        $lookup: {
          from: "folders",
          localField: "contentFolder",
          foreignField: "_id",
          as: "folderData",
        },
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          uId: 1,
          courseName: 1,
          assigned: 1,
          courseDuration: 1,
          subCourseCount: 1,
          originalCourseId: 1,
          chapters: {
            $size: {
              $ifNull: [{ $arrayElemAt: ["$folderData.subFolder", 0] }, []],
            },
          },
          disable: 1,
          startedOn: 1,
          expiredOn: 1,
          createdOn: 1,
          updatedOn: 1,
          numericPart: 1,
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
    ]);

    let totalLength = await courseModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getCourse,
      status: true,
      message: "Course retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllAssignedCourseForTeacherForLearn.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllAssignedCourseForTeacherForTeach = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    const { teacherId } = req.params;
    let matchObject = {};

    const currentDateInMilliseconds = Date.now();
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys;
      sortBys = sortBys == "Teacher" ? "createdOn" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },
      {
        $unwind: { path: "$coursesForTeach", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "courses",
          localField: "coursesForTeach.courseId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      {
        $unwind: { path: "$courseData", preserveNullAndEmptyArrays: true },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: "$courseData._id",
                uId: "$courseData.uId",
                courseName: "$courseData.courseName",
                about: "$courseData.about",
                assigned: "$courseData.assigned",
                courseDuration: "$courseData.courseDuration",
                contentFolder: "$courseData.contentFolder",
                assignedGrade: "$courseData.assignedGrade",
                assignedDivisions: "$courseData.assignedDivisions",
                assignedLearners: "$courseData.assignedLearners",
                assignedTeachers: "$courseData.assignedTeachers",
                subCourseCount: "$courseData.subCourseCount",
                originalCourseId: "$courseData.originalCourseId",
                disable: "$courseData.disable",
                startedOn: "$courseData.startedOn",
                expiredOn: "$courseData.expiredOn",
                createdOn: "$courseData.createdOn",
                updatedOn: "$courseData.updatedOn",
                __v: "$courseData.__v",
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$courseData.uId", "-"] }, 1],
                  },
                },
              },
            },
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },

            {
              $project: {
                _id: 1,
                uId: 1,
                courseName: 1,
                assigned: 1,
                courseDuration: 1,
                // chapters: {
                //   $size: { $ifNull: [{ $arrayElemAt: ["$folderData.subFolder", 0] }, []] }
                // },
                chapters: {
                  $cond: {
                    if: {
                      $ne: [
                        {
                          $size: {
                            $ifNull: [
                              { $arrayElemAt: ["$folderData.subFolder", 0] },
                              [],
                            ],
                          },
                        },
                        0,
                      ],
                    },
                    then: {
                      $size: {
                        $ifNull: [
                          { $arrayElemAt: ["$folderData.subFolder", 0] },
                          [],
                        ],
                      },
                    },
                    else: "$$REMOVE", // This removes the field from the output
                  },
                },
                disable: 1,
                startedOn: 1,
                subCourseCount: 1,
                originalCourseId: 1,
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                numericPart: 1,
                coursesForTeach: 1,
              },
            },
            {
              $match: {
                _id: { $ne: null },
              },
            },
            {
              $sort: {
                [sortBys]: +sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
          ],
        },
      },
    ];

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };

      let matchQuery = {
        $match: {
          "coursesForTeach.expiredOn": matchObject,
        },
      };
      pipeline.splice(2, 0, matchQuery);
    }

    if (search) {
      let index = 3;
      if (ongoing === "true" || expired === "true") {
        index = 4;
      }
      pipeline.splice(index, 0, {
        $match: {
          $or: [
            {
              "courseData.uId": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "courseData.courseName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }
    getCourse = await teacherModal.aggregate(pipeline);

    return res.status(200).json({
      data: getCourse[0].data,
      totalLength:
        getCourse[0].data.length <= 0 ? 0 : getCourse[0].totalCount[0]?.total,
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllAssignedCourseForTeacherForTeach.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

/**
 * This function is used for disable personal courses for learner and teacher
 * @returns {params}
 * @method Get
 */
export const disableCourseForLearnerTeacher = async (req, res) => {
  const { courseId, userId, courseType, userType } = req.body;
  try {
    if (mongoose.Types.ObjectId.isValid(courseId) === false) {
      throw new Error("courseId is not valid");
    }
    if (mongoose.Types.ObjectId.isValid(userId) === false) {
      throw new Error("userId is not valid");
    }
    let courseExists = await courseModal.findById(courseId);
    let status;
    if (!!courseExists === false) {
      return res.status(404).json({
        message: `Course does not Exist with courseId ${courseId}`,
        status: false,
      });
    }
    let userExists = await userModal.findById(userId);
    if (!!userExists === false) {
      return res.status(404).json({
        message: `User does not Exist with courseId ${userId}`,
        status: false,
      });
    }

    if (courseType === "library" && userType === "teacher") {
      if (
        !!userExists === true &&
        Array.isArray(userExists.coursesForLearn) &&
        userExists.coursesForLearn.length > 0
      ) {
        status = await userExists.coursesForLearn.filter(
          (element) => element.courseId + "".substring(0) === courseId
        );
        status = status[0].disable === true ? false : true;
      }
      await teacherModal.updateOne(
        { _id: userId, "coursesForLearn.courseId": courseId },
        { $set: { "coursesForLearn.$.disable": status } }
      );
      await courseModal.updateOne({ _id: courseId }, { disable: status });
    }
    if (courseType === "teach" && userType === "teacher") {
      if (
        !!userExists === true &&
        Array.isArray(userExists.coursesForTeach) &&
        userExists.coursesForTeach.length > 0
      ) {
        status = await userExists.coursesForTeach.filter(
          (element) => element.courseId + "".substring(0) === courseId
        );
        status = status[0].disable === true ? false : true;
      }
      await teacherModal.updateOne(
        { _id: userId, "coursesForTeach.courseId": courseId },
        { $set: { "coursesForTeach.$.disable": status } }
      );
    }
    if (courseType === "library" && userType === "learner") {
      if (
        !!userExists === true &&
        Array.isArray(userExists.courses) &&
        userExists.courses.length > 0
      ) {
        status = await userExists.courses.filter(
          (element) => element.courseId + "".substring(0) === courseId
        );
        status = status[0].disable === true ? false : true;
      }
      await learnerModal.updateOne(
        { _id: userId, "courses.courseId": courseId },
        { $set: { "courses.$.disable": status } }
      );
      await courseModal.updateOne({ _id: courseId }, { disable: status });
    }
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllNotAssignedCourse",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (courseExists) {
      return res.status(200).json({
        status: true,
        message: "the course disabled successfully updated",
        data: courseExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableCourseForLearnerTeacher.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for personal course from leaner
 * @returns {N/A}
 * @payload {body}
 * @method Post
 */
export const deletePersonalCourseFromLearnerAndTeacher = async (req, res) => {
  const { userId, courseId, courseType, userType, originalCourseId } = req.body;
  try {
    if (mongoose.Types.ObjectId.isValid(userId) === false) {
      throw new Error(`user Id is invalid`);
    }
    if (mongoose.Types.ObjectId.isValid(courseId) === false) {
      throw new Error(`course Id is invalid`);
    }
    let learnerExist = await userModal.findById(userId);
    if (!learnerExist) {
      return res.status(400).json({
        message: `User does not exist`,
        status: false,
      });
    }
    let courseExist = await courseModal.findById(courseId);
    if (!!courseExist === false) {
      return res.status(400).json({
        message: `Course id is invalid`,
        status: false,
      });
    }
    if (courseType === "library" && userType === "learner") {
      await learnerModal.updateOne(
        { _id: userId },
        { $pull: { courses: { courseId: courseId } } }
      );
      await courseModal.deleteOne({
        _id: new mongoose.Types.ObjectId(courseId),
      });
      await notificationModal.deleteOne({
        userId: new mongoose.Types.ObjectId(userId),
        "data.courseId": new mongoose.Types.ObjectId(courseId),
      });
    }
    if (courseType === "library" && userType === "teacher") {
      await teacherModal.updateOne(
        { _id: userId },
        { $pull: { coursesForLearn: { courseId: courseId } } }
      );
      await courseModal.deleteOne({
        _id: new mongoose.Types.ObjectId(courseId),
      });
      await notificationModal.deleteOne({
        userId: new mongoose.Types.ObjectId(userId),
        "data.courseId": new mongoose.Types.ObjectId(courseId),
      });
    }

    const getOldCourseDetail = await courseModal
      .findById(originalCourseId)
      .lean();
    if (!!getOldCourseDetail === true) {
      await courseModal.updateOne(
        { _id: originalCourseId },
        { subCourseCount: getOldCourseDetail.subCourseCount - 1 }
      );
    }
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
      "getAllNotAssignedCourse",
      "getAllAssignedCourse",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(201).json({
      status: true,
      message: "Personal assigned course deleted successfully",
    });
  } catch (err) {
    logger.error(
      `Error from function ${deletePersonalCourseFromLearnerAndTeacher.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used get all Course
 *  detail for learner
 * @returns {params}
 * @method Get
 */

export const getAllCourseForLearner = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      sortBy,
      sortType,
      ongoing,
      expired,
    } = req.query;

    const { learnerId } = req.params;
    let matchObject = {};

    const currentDateInMilliseconds = Date.now();
    let getCourse = [];
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(learnerId),
        },
      },
      {
        $unwind: { path: "$courses", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "courses",
          localField: "courses.courseId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      {
        $unwind: { path: "$courseData", preserveNullAndEmptyArrays: true },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: "$courseData._id",
                uId: "$courseData.uId",
                courseName: "$courseData.courseName",
                about: "$courseData.about",
                assigned: "$courseData.assigned",
                courseDuration: "$courseData.courseDuration",
                contentFolder: "$courseData.contentFolder",
                assignedGrade: "$courseData.assignedGrade",
                assignedDivisions: "$courseData.assignedDivisions",
                assignedLearners: "$courseData.assignedLearners",
                assignedTeachers: "$courseData.assignedTeachers",
                disable: "$courseData.disable",
                originalCourseId: "$courseData.originalCourseId",
                subCourseCount: "$courseData.subCourseCount",
                startedOn: "$courseData.startedOn",
                expiredOn: "$courseData.expiredOn",
                createdOn: "$courseData.createdOn",
                updatedOn: "$courseData.updatedOn",
                __v: "$courseData.__v",
              },
            },
            {
              $lookup: {
                from: "folders",
                localField: "contentFolder",
                foreignField: "_id",
                as: "folderData",
              },
            },
            {
              $addFields: {
                numericPart: {
                  $toInt: {
                    $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                courseName: 1,
                assigned: 1,
                courseDuration: 1,
                assignedGrade: 1,
                assignedDivisions: 1,
                assignedLearners: 1,
                assignedTeachers: 1,
                chapters: {
                  $size: {
                    $ifNull: [
                      { $arrayElemAt: ["$folderData.subFolder", 0] },
                      [],
                    ],
                  },
                },
                disable: 1,
                originalCourseId: 1,
                subCourseCount: 1,
                startedOn: 1,
                expiredOn: 1,
                createdOn: 1,
                updatedOn: 1,
                numericPart: 1,
              },
            },

            {
              $sort: {
                [sortBys]: +sortTypes,
              },
            },
            { $skip: skip },
            { $limit: limitValue },
          ],
        },
      },
    ];

    if (ongoing === "true" || expired === "true") {
      if (ongoing === "true") matchObject = { $gt: currentDateInMilliseconds };
      if (expired === "true") matchObject = { $lt: currentDateInMilliseconds };

      let matchQuery = {
        $match: {
          "courses.expiredOn": matchObject,
        },
      };
      pipeline.splice(2, 0, matchQuery);
    }

    if (search) {
      let index = 3;
      if (ongoing === "true" || expired === "true") {
        index = 4;
      }
      pipeline.splice(index, 0, {
        $match: {
          $or: [
            {
              "courseData.uId": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "courseData.courseName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    getCourse = await learnerModal.aggregate(pipeline);
    for (let index = 0; index < getCourse[0].data.length; index++) {
      const element = getCourse[0].data[index];
      if (Object.keys(element).length === 1) {
        getCourse[0].data.splice(index, 1);
        getCourse[0].totalCount[0].total =
          getCourse[0].totalCount[0]?.total - 1;
      }
    }
    return res.status(200).json({
      data: getCourse[0].data,
      totalLength: getCourse[0].totalCount[0]?.total || 0,
      status: true,
      message: "Course retrieved successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${getAllCourseForLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};
