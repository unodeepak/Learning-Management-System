import teacherModal from "../modals/teacherModal.js";
import userModal from "../modals/userModal.js";
import divisionModal from "../modals/divisionModal.js";
import mongoose from "mongoose";
import randomstring from "randomstring";
import aws from "aws-sdk";
import dotenv from "dotenv";
import CryptoJS from "crypto-js";
import { logger } from "../app.js";
import crypto from "crypto";
import Cryptr from "cryptr";
import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  validatePhoneNumberLength,
} from "libphonenumber-js";
const cryptr = new Cryptr(process.env.CRYPTO_SECRET_KEY);
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
import assessmentModal from "../modals/assessmentModal.js";
import courseModal from "../modals/courseModal.js";
import subFolderTrackModel from "../modals/subFolderTrackModel.js";
import { addNotification } from "./notificationController.js";
import { countriesRecord } from "./countryCode.js";
import notificationModal from "../modals/notificationModal.js";
import { log } from "console";
import { pipeline } from "stream";
import redisHelper from "../helpers/redis.js";
export const createTeacher = async (req, res) => {
  const {
    uId,
    firstName,
    middleName,
    surName,
    dob,
    enrollmentDate,
    schoolId,
    divisionId,
    gender,
    email,
    mobile,
    countryCode,
  } = req.body;
  try {
    let teacherExists = await userModal.findOne({
      $or: [{ email }, { mobile }, { uId }],
    });
    let getCountryName = countriesRecord[countryCode];
    if (
      isPossiblePhoneNumber(mobile + "", getCountryName) === false ||
      isValidPhoneNumber(mobile + "", getCountryName) === false
    ) {
      throw new Error(`Please enter the valid mobile number`);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) === false) {
      throw new Error(`Please enter the valid  email `);
    }

    if (teacherExists) {
      if (teacherExists.uId == uId)
        return res.status(409).json({
          message: `trainer already exists with uId ${uId}`,
          status: false,
        });

      if (teacherExists.mobile == mobile)
        return res.status(409).json({
          message: `trainer already exists with mobile ${mobile}`,
          status: false,
        });

      if (teacherExists.email == email)
        return res.status(409).json({
          message: `trainer already exists with email ${email}`,
          status: false,
        });
    }

    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(400).json({
        message: `division not found`,
        status: false,
      });
    }

    if (divisionExists) {
      if (divisionExists.schoolId != schoolId)
        return res.status(409).json({
          message: `the division is not part of this school`,
          status: false,
        });
    }
    let password = await randomstring.generate({
      length: 12,
      charset: "alphabetic",
    });
    const newTeacher = await teacherModal.create({
      uId,
      email,
      mobile,
      firstName,
      password,
      userRole: +2,
      middleName: middleName ? middleName : "",
      surName: surName ? surName : "",
      fullName:
        firstName && middleName && surName
          ? `${firstName} ${middleName} ${surName}`
          : firstName && middleName
          ? `${firstName} ${middleName}`
          : firstName,
      dob,
      enrollmentDate,
      schoolId,
      gradeNdivision: [
        {
          divisionId: divisionExists._id,
          gradeId: divisionExists.gradeId,
        },
      ],
      gender,
      countryCode,
      createdOn: new Date().getTime(),
    });
    let deleteRedisHash = ["getAllSchool", "getAllTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newTeacher) {
      return res.status(201).json({
        status: true,
        message: "the teacher successfully created",
        data: newTeacher,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadTeacherImage = async (req, res) => {
  try {
    const { URL } = process.env;
    if (req.fileValidationError && !req.doesExists) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }

    const getImageDetail = await teacherModal.findById(req.body.teacherId);
    if (!!getImageDetail === true) {
      if (
        "teacherImg" in getImageDetail &&
        getImageDetail["teacherImg"]?.length > 0
      ) {
        const checkey = getImageDetail.teacherImg.split("client-809/")[1];
        const { error } = await s3
          .deleteObject({ Bucket: BUCKET_NAME, Key: checkey })
          .promise();
        if (!!error === true) {
          return res.status(400).json({
            status: true,
            message: error,
          });
        }
      }
    }

    if (req.teacherExists) {
      return res
        .status(404)
        .json({ message: req.teacherExists, status: false });
    }
    req.teacherData.teacherImg = URL + req.fileData;
    await req.teacherData.save();
    let deleteRedisHash = ["getAllTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      data: req.teacherData,
      status: true,
      message: "the teacher has been updated",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editTeacher = async (req, res) => {
  const {
    teacherId,
    firstName,
    middleName,
    surName,
    dob,
    gender,
    email,
    mobile,
    countryCode,
    enrollmentDate,
  } = req.body;
  try {
    if (!!mobile === true && !!countryCode === true) {
      let getCountryName = countriesRecord[countryCode];
      if (
        isPossiblePhoneNumber(mobile + "", getCountryName) === false ||
        isValidPhoneNumber(mobile + "", getCountryName) === false
      ) {
        throw new Error(`Please enter the valid mobile number`);
      }
    }
    let teacherExists = await teacherModal.findById(teacherId);

    if (!teacherExists) {
      return res.status(404).json({
        message: `teacher does not exist with teacherId ${teacherId}`,
        status: false,
      });
    }

    if (email) {
      let teacherEmailExists = await userModal.findOne({ email });
      if (teacherEmailExists) {
        if (teacherEmailExists.email !== teacherExists.email) {
          return res.status(409).json({
            message: `teacher already exists with email ${email}`,
            status: false,
          });
        }
      }
    }

    if (mobile) {
      let teacherMobileExists = await userModal.findOne({ mobile });
      if (teacherMobileExists) {
        if (teacherMobileExists.mobile !== teacherExists.mobile) {
          return res.status(409).json({
            message: `teacher already exists with mobile ${mobile}`,
            status: false,
          });
        }
      }
    }

    teacherExists.firstName = firstName ? firstName : teacherExists.firstName;
    teacherExists.middleName = middleName
      ? middleName
      : teacherExists.middleName;
    teacherExists.surName = surName ? surName : teacherExists.surName;
    teacherExists.dob = dob ? dob : teacherExists.dob;
    teacherExists.gender = gender ? gender : teacherExists.gender;
    teacherExists.email = email ? email : teacherExists.email;
    teacherExists.mobile = mobile ? mobile : teacherExists.mobile;
    teacherExists.enrollmentDate = enrollmentDate
      ? enrollmentDate
      : teacherExists.enrollmentDate;
    teacherExists.updatedOn = new Date().getTime();
    (teacherExists.fullName =
      firstName && middleName && surName
        ? `${firstName} ${middleName} ${surName}`
        : firstName && middleName
        ? `${firstName} ${middleName}`
        : firstName),
      await teacherExists.save();
    let deleteRedisHash = ["getAllTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (teacherExists) {
      return res.status(200).json({
        status: true,
        message: "the teacher successfully updated",
        data: teacherExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableTeacher = async (req, res) => {
  const { teacherId } = req.params;
  try {
    let teacherExists = await teacherModal.findById(teacherId);

    if (!teacherExists) {
      return res.status(404).json({
        message: `Teacher does not Exist with teacherId ${teacherId}`,
        status: false,
      });
    }

    teacherExists.disable = teacherExists.disable ? false : true;
    await teacherExists.save();
    let deleteRedisHash = ["getAllSchool", "getAllTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (teacherExists) {
      return res.status(200).json({
        status: true,
        message: "The teacher successfully updated",
        data: teacherExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteTeacher = async (req, res) => {
  const { teacherIds } = req.body;
  try {
    for await (const teacherId of teacherIds) {
      if (!!mongoose.Types.ObjectId.isValid(teacherId) === false) {
        throw new Error(`Please provide the valid teacher id ${teacherId}`);
      }
      let teacherExists = await teacherModal.findById(teacherId);

      if (!teacherExists) {
        return res.status(404).json({
          message: `Teacher does not Exist with teacherId ${teacherId}`,
          status: false,
        });
      }

      await courseModal.updateMany(
        { "assignedTeachers.teacherId": teacherId },
        { $pull: { assignedTeachers: { teacherId: teacherId } } }
      );
      await subFolderTrackModel.deleteMany({ userId: teacherId });
      await teacherExists.deleteOne();
      let deleteRedisHash = ["getAllSchool", "getAllTeacher"];
      await redisHelper.delDataFromRedisHash(deleteRedisHash);
    }
    return res.status(200).json({
      status: true,
      message: "The teacher successfully deleted",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidTeacher = async (req, res) => {
  try {
    let teacherExists = await teacherModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!teacherExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "T-1",
      });
    }

    const lastUid = teacherExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "T-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    let teacherExists = await teacherModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "schoolData",
        },
      },
      { $unwind: "$schoolData" },
      {
        $lookup: {
          from: "divisions",
          localField: "gradeNdivision.divisionId",
          foreignField: "_id",
          as: "division",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "gradeNdivision.divisionId",
          foreignField: "_id",
          as: "divisionData",
        },
      },
      { $unwind: "$divisionData" },
      {
        $lookup: {
          from: "grades",
          localField: "gradeNdivision.gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      { $unwind: "$gradeData" },
      {
        $addFields: {
          gradeCount: {
            $size: {
              $reduce: {
                input: "$gradeNdivision",
                initialValue: [],
                in: {
                  $cond: {
                    if: { $in: ["$$this.gradeId", "$$value"] },
                    then: "$$value",
                    else: { $concatArrays: ["$$value", ["$$this.gradeId"]] },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          uId: 1,
          enrollmentDate: 1,
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          location: "$schoolData.location",
          schoolId: 1,
          mobile: 1,
          email: 1,
          firstName: 1,
          middleName: 1,
          surName: 1,
          fullName: 1,
          gradeName: "$gradeData.gradeName",
          gradeUid: "$gradeData.gradeUid",
          dob: 1,
          gender: 1,
          teacherImg: 1,
          countryCode: 1,
          divisionUid: "$divisionData.divisionUid",
          divisionName: "$divisionData.divisionName",
          divisionCount: { $size: "$gradeNdivision" },
          libraryCount: { $size: "$coursesForLearn" },
          gradeCount: "$gradeCount",
          coursesCount: {
            $reduce: {
              input: "$division",
              initialValue: 0,
              in: {
                $add: ["$$value", { $size: "$$this.courses" }],
              },
            },
          },
          assessmentsCount: { $size: "$assessmentsForAssess" },
          disable: 1,
          createdOn: 1,
          updatedOn: 1,
          notificationToken: 1,
        },
      },
    ]);
    teacherExists[0].phone = `${teacherExists[0].countryCode}${teacherExists[0].mobile}`;
    if (!teacherExists) {
      return res.status(404).json({
        message: `Teacher does not exist with teacherId ${teacherId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "The teacher successfully retrieved",
      data: teacherExists[0],
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllGradeByTeacher = async (req, res) => {
  const { teacherId } = req.params;
  try {
    let gradeExists = await teacherModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },
      {
        $lookup: {
          from: "grades",
          localField: "gradeNdivision.gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      {
        $unwind: "$gradeData",
      },
      {
        $project: {
          _id: "$gradeData._id",
          gradeName: "$gradeData.gradeName",
          gradeUid: "$gradeData.gradeUid",
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "The grade successfully retrieved",
      data: gradeExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllDivisionByTeacherAndGrade = async (req, res) => {
  const { teacherId, gradeId } = req.params;
  try {
    let divisionExists = await teacherModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },
      {
        $unwind: { path: "$gradeNdivision", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          "gradeNdivision.gradeId": new mongoose.Types.ObjectId(gradeId),
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "gradeNdivision.divisionId",
          foreignField: "_id",
          as: "divisionData",
        },
      },
      {
        $unwind: "$divisionData",
      },
      {
        $project: {
          _id: "$divisionData._id",
          divisionName: "$divisionData.divisionName",
          divisionUid: "$divisionData.divisionUid",
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "The division successfully retrieved",
      data: divisionExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllTeacher = async (req, res) => {
  try {
    const {
      pagination,
      page,
      limit,
      search,
      schoolId,
      gradeId,
      divisionId,
      sortBy,
      sortType,
    } = req.query;
    let queryObj = {};
    let getTeachers = [];

    let sortBys = "_id";
    let sortTypes = -1;
    let finalTeacher;
    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "date" ? "createdAt" : sortBys;
      sortBys = sortBys == "division" ? "gradeNdivisionLength" : sortBys;
    }
    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;
    let skip = (pageValue - 1) * limit;
    if (search) {
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (schoolId && schoolId != "null") {
      queryObj.schoolId = new mongoose.Types.ObjectId(schoolId);
    }
    if (gradeId && gradeId != "null") {
      queryObj["gradeNdivision.gradeId"] = new mongoose.Types.ObjectId(gradeId);
    }
    if (divisionId && divisionId != "null") {
      queryObj["gradeNdivision.divisionId"] = new mongoose.Types.ObjectId(
        divisionId
      );
    }

    getTeachers = [
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "schoolId",
        },
      },
      {
        $unwind: {
          path: "$schoolId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          gradeNdivisionLength: { $size: "$gradeNdivision" },
        },
      },
      {
        $project: {
          password: 1,
          fullName: 1,
          "schoolId.schoolUid": 1,
          "schoolId.schoolName": 1,
          uId: 1,
          password: 1,
          disable: 1,
          createdOn: 1,
          role: 1,
          createdAt: 1,
          gradeNdivisionLength: 1,
          numericPart: 1,
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
    if (schoolId || gradeId || divisionId || search) {
      getTeachers.unshift({ $match: { ...queryObj } });
    }

    if (!!sortBys === true && sortBys === "uId" && !!sortType === true) {
      getTeachers.splice(2, 1, {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$uId", "-"] }, 1],
            },
          },
          gradeNdivisionLength: { $size: "$gradeNdivision" },
        },
      });
      getTeachers.splice(4, 1, {
        $sort: { numericPart: +sortType },
      });
    }

    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllTeacher`,
      `getAllTeacher_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      finalTeacher = redisData;
    } else {
      finalTeacher = await teacherModal.aggregate(getTeachers);
      if (
        !!finalTeacher === true &&
        Array.isArray(finalTeacher) &&
        finalTeacher.length > 0
      ) {
        finalTeacher = finalTeacher.map((iterator) => {
          const decryptedString = cryptr.decrypt(iterator.password);
          iterator.password = decryptedString;
          if (
            !!iterator == true &&
            !!iterator.countryCode === true &&
            !!iterator.mobile === true
          ) {
            iterator.mobile = `${iterator.countryCode}${iterator.mobile}`;
          }
          return iterator;
        });
      }
      await redisHelper.setRedisHash(
        `getAllTeacher`,
        `getAllTeacher_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
        finalTeacher
      );
    }
    let totalLength = await teacherModal.countDocuments(queryObj);
    if (finalTeacher.length > 0) {
      return res.status(200).json({
        data: finalTeacher,
        status: true,
        message: "Teacher retrieved successfully",
        totalLength,
      });
    } else {
      return res.status(200).json({
        data: [],
        status: true,
        message: "Teacher retrieved successfully",
        totalLength: 0,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllTeacherForAssign = async (req, res) => {
  try {
    const { pagination, page, limit, search, schoolId, gradeId, divisionId } =
      req.query;

    let queryObj = {};
    let getTeachers = [];

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (schoolId && schoolId != "null") {
      queryObj.schoolId = schoolId;
    }
    if (gradeId && gradeId != "null") {
      queryObj["gradeNdivision.gradeId"] = gradeId;
    }
    if (divisionId && divisionId != "null") {
      queryObj["gradeNdivision.divisionId"] = divisionId;
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
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    getTeachers = teacherModal.find(queryObj).select("fullName uId");

    if (pagination) {
      let skip = (pageValue - 1) * limit;
      getTeachers = getTeachers.sort({ _id: -1 }).skip(skip).limit(limitValue);
    }

    getTeachers = await getTeachers;
    let totalLength = await teacherModal.countDocuments(queryObj);

    return res.status(200).json({
      data: getTeachers,
      status: true,
      message: "Teachers retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const assignDivisionToTeacher = async (req, res) => {
  const { teacherId, schoolId, divisionId } = req.body;
  try {
    let teacherExists = await teacherModal.findById(teacherId);
    if (!teacherExists) {
      return res.status(400).json({
        message: `trainer does not exist`,
        status: false,
      });
    }

    if (teacherExists.schoolId != schoolId)
      return res.status(409).json({
        message: `The assigned school and the choice of school are different`,
        status: false,
      });

    if (
      teacherExists.gradeNdivision.find((data) => data.divisionId == divisionId)
    )
      return res.status(409).json({
        message: `this division already assigned`,
        status: false,
      });

    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(400).json({
        message: `division not found`,
        status: false,
      });
    }

    if (divisionExists.schoolId != schoolId)
      return res.status(409).json({
        message: `the division is not part of this school`,
        status: false,
      });

    teacherExists.gradeNdivision.unshift({
      gradeId: divisionExists.gradeId,
      divisionId: divisionExists._id,
    });

    await teacherExists.save();
    let message = {};
    let payload = { message };
    payload.userId = teacherExists._id;
    payload.deviceToken = teacherExists.deviceToken;
    payload.isTeacher = true;
    message.notification = {
      title: "Brainstorm lms",
      body: `Division ${divisionExists.divisionName} has been assigned`,
      date: new Date().getTime(),
    };
    message.data = {
      type: "Division Assigned",
      divisionId: new mongoose.Types.ObjectId(divisionId),
    };
    addNotification.emit("addNotification", payload);

    let deleteRedisHash = ["getAllTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(201).json({
      status: true,
      message: "the division successfully assigned",
      data: teacherExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const removeDivisionFromTeacher = async (req, res) => {
  const { teacherId, divisionId } = req.body;
  try {
    let teacherExists = await teacherModal.findById(teacherId);
    if (!teacherExists) {
      return res.status(400).json({
        message: `trainer does not exist`,
        status: false,
      });
    }

    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(400).json({
        message: `division not found`,
        status: false,
      });
    }

    await teacherModal.updateOne(
      { _id: teacherExists._id },
      { $pull: { gradeNdivision: { divisionId: divisionExists._id } } }
    );

    return res.status(201).json({
      status: true,
      message: "the division successfully removed",
      data: teacherExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const removeCourseFromTeacher = async (req, res) => {
  const { teacherId, courseId, originalCourseId } = req.body;
  try {
    let teacherExists = await teacherModal.findById(teacherId);
    if (!teacherExists) {
      return res.status(400).json({
        message: `teacher does not exist`,
        status: false,
      });
    }

    await teacherModal.updateOne(
      { _id: teacherId },
      { $pull: { coursesForTeach: { courseId } } }
    );

    const getCourseDetail = await courseModal.findById({ _id: courseId });
    if (
      !!getCourseDetail === true &&
      !!getCourseDetail.assignedTeachers === true &&
      "assignedTeachers" in getCourseDetail
    ) {
      for (
        let index = 0;
        index < getCourseDetail.assignedTeachers.length;
        index++
      ) {
        const element = getCourseDetail.assignedTeachers[index];
        if (element + "".substring(0) === teacherId) {
          getCourseDetail.assignedTeachers.splice(index, 1);
        }
      }
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
    await notificationModal.deleteOne({
      userId: new mongoose.Types.ObjectId(teacherId),
      "data.courseId": new mongoose.Types.ObjectId(courseId),
    });
    await getCourseDetail.save();
    await teacherExists.save();
    return res.status(201).json({
      status: true,
      message: "the course successfully removed",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const removeAssessmentFromTeacher = async (req, res) => {
  const { teacherId, assessmentId } = req.body;
  try {
    let teacherExists = await teacherModal.findById(teacherId);
    if (!teacherExists) {
      return res.status(400).json({
        message: `teacher does not exist`,
        status: false,
      });
    }

    await teacherModal.updateOne(
      { _id: teacherExists._id },
      { $pull: { assessmentsForAssess: { assessmentId } } }
    );

    return res.status(201).json({
      status: true,
      message: "the assessment successfully removed",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for all roles who can view there meeting
 * @returns {object}
 * @param {teacherId}
 * @payload {body}
 * @method Post
 */

export const getTeacherDashboardCount = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;

    let divisionCount = 0,
      totalAssessment = 0,
      completedAssessment = 0,
      library = 0,
      coursesForTeachTotal = 0,
      coursesForTeachCompleted = 0;
    let fetchUserDetail = await teacherModal
      .findById(userId)
      .populate("schoolId");
    for await (const iterator of fetchUserDetail.gradeNdivision) {
      if ("divisionId" in iterator && !!iterator.divisionId === true) {
        divisionCount++;
      }
    }

    for await (const iterator of fetchUserDetail.assessmentsForAssess) {
      if ("assessmentId" in iterator && !!iterator.assessmentId === true) {
        totalAssessment++;
      }
      if (
        "completion" in iterator &&
        !!iterator.completion === true &&
        iterator.completion === true
      ) {
        completedAssessment++;
      }
    }
    for await (const iterator of fetchUserDetail.coursesForLearn) {
      if ("courseId" in iterator && !!iterator.courseId === true) {
        library++;
      }
    }
    for await (const iterator of fetchUserDetail.coursesForTeach) {
      if ("courseId" in iterator && !!iterator.courseId === true) {
        coursesForTeachTotal++;
      }
      if (
        "completion" in iterator &&
        !!iterator.completion === true &&
        iterator.completion === true
      ) {
        coursesForTeachCompleted++;
      }
    }
    let retData = {
      fullName: fetchUserDetail.fullName,
      teacherImg: fetchUserDetail.teacherImg,
      schoolName: fetchUserDetail.schoolId.schoolName,
      schoolLocation: fetchUserDetail.schoolId.location,
      divisionCount: divisionCount,
      totalAssessment: totalAssessment,
      completedAssessment: completedAssessment,
      library: library,
      coursesForTeachTotal: coursesForTeachTotal,
      coursesForTeachCompleted: coursesForTeachCompleted,
      uId: fetchUserDetail.uId,
    };
    returnObj.status = 201;
    returnObj.error = false;
    returnObj.data = retData;
    returnObj.message = "Teacher count data";
    return res.status(returnObj.status).json(returnObj);
  } catch (err̥or) {
    logger.error(`Error `, { stack: error.stack });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = err̥or.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for all teacher who can  access latest cource for dashbord
 * @returns {object}
 * @param {teacherId}
 * @payload {body}
 * @method Post
 */

export const getLatestCoursesForDashbord = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $unwind: "$coursesForTeach",
      },
      {
        $lookup: {
          from: "courses",
          localField: "coursesForTeach.courseId",
          foreignField: "_id",
          as: "courses",
        },
      },
      { $sort: { "courses.createdOn": -1 } },
      { $unwind: "$courses" },
      {
        $project: {
          _id: "$courses._id",
          courseName: "$courses.courseName",
          coursePicture: "$courses.coursePicture",
          createdOn: "$courses.createdOn",
        },
      },
      {
        $limit: 5,
      },
    ];
    const coursesForTeach = await teacherModal.aggregate(pipeline);
    returnObj.status = 201;
    returnObj.error = false;
    returnObj.data = coursesForTeach;
    returnObj.message = "Teacher Assessment detail";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error `, { stack: error.stack });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for all teacher who can  access latest Assessment for dashboard
 
 
 * @returns {object}
 * @param {teacherId}
 * @payload {body}
 * @method Post
 */
export const getLatestAssessmentForDashboard = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      { $unwind: "$assessmentsForAssess" },
      {
        $lookup: {
          from: "assessments",
          localField: "assessmentsForAssess.assessmentId",
          foreignField: "_id",
          as: "assessment",
        },
      },
      { $sort: { "assessmentsForAssess.createdOn": -1 } },
      { $unwind: "$assessment" },
      {
        $project: {
          _id: "$assessment._id",
          assessmentName: "$assessment.assessmentName",
          completion: "$assessmentsForAssess.completion",
          createdOn: "$assessment.createdOn",
        },
      },
      {
        $limit: 5,
      },
    ];
    const coursesForTeach = await teacherModal.aggregate(pipeline);
    returnObj.status = 201;
    returnObj.error = false;
    returnObj.data = coursesForTeach;
    returnObj.message = "Teacher cources detail";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error `, { stack: error.stack });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for all teacher who can  access latest Library for dashbord
 * @returns {object}
 * @param {teacherId}
 * @payload {body}
 * @method Post
 */
export const getLatestLibraryForDashboard = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { userId } = req.user;
    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $unwind: { path: "$coursesForLearn", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "courses",
          localField: "coursesForLearn.courseId",
          foreignField: "_id",
          as: "coursesDetail",
        },
      },
      { $unwind: { path: "$coursesDetail", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "folders",
          localField: "coursesDetail.contentFolder",
          foreignField: "_id",
          as: "foldersDetail",
        },
      },
      { $unwind: { path: "$foldersDetail", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseName: "$coursesDetail.courseName",
          coursePicture: "$coursesDetail.coursePicture",
          courseUid: "$coursesDetail.uId",
          _id: "$coursesDetail._id",
          subfolder: "$foldersDetail.subFolder",
          subfolderLength: {
            $cond: {
              if: {
                $eq: [{ $ifNull: ["$foldersDetail.subFolder", null] }, null],
              },
              then: 0,
              else: { $size: "$foldersDetail.subFolder" },
            },
          },
        },
      },
      {
        $limit: 5,
      },
    ];
    const coursesForTeach = await teacherModal.aggregate(pipeline);
    if (Object.keys(coursesForTeach[0]).length === 1) {
      coursesForTeach.length = 0;
    }
    if (!!coursesForTeach === true && coursesForTeach.length > 0) {
      for await (const iterator of coursesForTeach) {
        for (let index = 0; index < iterator.subfolder.length; index++) {
          let subfolderId = iterator.subfolder[index].toString().substring(0);
          let courceId = iterator._id.toString().substring(0);
          let getDetail = await subFolderTrackModel
            .findOne({
              userId: userId,
              courseId: courceId,
              subFolderId: subfolderId,
            })
            .lean();
          if (!!getDetail === true) {
            let obj = {
              subfolderId: subfolderId,
              accessibility: 1,
              accessLimit: getDetail.accessLimit,
            };
            await iterator.subfolder.splice(index, 1, obj);
          }
        }
      }
    }
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.data = coursesForTeach;
    returnObj.message = "Teacher library detail";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error `, { stack: error.stack });
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};
