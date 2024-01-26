import learnerModal from "../modals/learnerModal.js";
import teacherModal from "../modals/teacherModal.js";
import divisionModal from "../modals/divisionModal.js";
import userModal from "../modals/userModal.js";
import courseModal from "../modals/courseModal.js";
import assessmentModal from "../modals/assessmentModal.js";
import resultModal from "../modals/resultModal.js";
import mongoose from "mongoose";
import randomstring from "randomstring";
import bcrypt from "bcrypt";
import aws from "aws-sdk";
import dotenv from "dotenv";
import schoolModel from "../modals/schoolModal.js";
import csv from "csvtojson";
import fs from "fs";
import Cryptr from "cryptr"
import { countriesRecord } from './countryCode.js'
import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  validatePhoneNumberLength
} from 'libphonenumber-js'
import ejs from "ejs"
import path from 'path'
dotenv.config();
const cryptr = new Cryptr(process.env.CRYPTO_SCRET_KEY);
import redisHelper from "../helpers/redis.js"
import { Worker, isMainThread, parentPort } from 'worker_threads'

// import dotenv from "dotenv";
import CryptoJS from "crypto-js";
import gradeModal from "../modals/gradeModal.js";
import subFolderTrackModel from "../modals/subFolderTrackModel.js";
import { logger } from '../app.js'
import { validateMongoId } from "../util/util.js";
import notificationModal from "../modals/notificationModal.js";
import rabbitMqHelper from "../helpers/rebbitMqHelper.js";

import { log } from "console";
// dotenv.config();
const { AWS_ENDPOINT, BUCKET_NAME, AWS_ACCESS_KEY, AWS_SECRET_KEY } =
  process.env;
let s3 = new aws.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: "ap-south-mum-1",
  endpoint: AWS_ENDPOINT,
  s3ForcePathStyle: true,
});

export const createLearner = async (req, res) => {
  const {
    uId,
    firstName,
    middleName,
    surName,
    dob = "",
    enrollmentDate = "",
    divisionId,
    gender,
    email,
    mobile,
    countryCode
  } = req.body;
  try {
    let getCountryName = countriesRecord[countryCode]
    if (isPossiblePhoneNumber(mobile, getCountryName) === false || isValidPhoneNumber(mobile, getCountryName) === false) {
      throw new Error(
        `Please enter the valid mobile number`
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) === false) {
      throw new Error(
        `Please enter the valid email `
      );
    }
    let learnerExists = await userModal.findOne({
      $or: [{ email }, { mobile }, { uId }],
    });

    if (learnerExists) {
      if (learnerExists.uId == uId)
        return res.status(409).json({
          message: `learner already exists with uId ${uId}`,
          status: false,
        });

    }

    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(404).json({
        message: `division does not exist`,
        status: false,
      });
    }
    let password = await randomstring.generate({
      length: 12,
      charset: "alphanumeric",
    });
    const newLearner = await learnerModal.create({
      uId,
      email,
      mobile,
      firstName,
      password,
      userRole: +3,
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
      schoolId: divisionExists.schoolId,
      gradeId: divisionExists.gradeId,
      divisionId,
      countryCode,
      gender,
      createdOn: new Date().getTime()
    });
    if (process.env.SENTEMAIL === 'true') {
      // This point is used to sent email Registration Email
      let registerEmailPayload = {}
      registerEmailPayload.name = newLearner.fullName
      let filePath = path.join(process.cwd(), "./middleware/emailTemplate/learnerSignUp.ejs");
      let source = fs.readFileSync(filePath, "utf-8").toString();
      const htmlToSent = ejs.render(source, registerEmailPayload);
      registerEmailPayload.email = email
      registerEmailPayload.subject = `Welcome to Brainstorm International!`
      registerEmailPayload.html = htmlToSent
      await rabbitMqHelper.produceQueue(registerEmailPayload)

      //This point is used to sent log in credentials for learner
      let logInPayload = {}
      logInPayload.name = newLearner.fullName
      logInPayload.uId = uId
      logInPayload.password = password
      logInPayload.subject = `Login details of students!`
      logInPayload.email = email
      let filePathCredential = path.join(process.cwd(), "./middleware/emailTemplate/learnerSignUpCredential.ejs");
      let sourceCredential = fs.readFileSync(filePathCredential, "utf-8").toString();
      const htmlToSentCredential = ejs.render(sourceCredential, logInPayload);
      logInPayload.html = htmlToSentCredential
      await rabbitMqHelper.produceQueue(logInPayload)
    }
    let deleteRedisHash = ["getAllLearner", "getAllSchool", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    if (newLearner) {
      return res.status(201).json({
        status: true,
        message: "the learner successfully created",
        data: newLearner,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadLearnerImage = async (req, res) => {
  try {
    const { URL } = process.env;
    if (req.fileValidationError && !req.doesExists) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }
    const getImageDetail = await learnerModal.findById(req.body.learnerId);
    if (!!getImageDetail === true) {
      if (
        "learnerImg" in getImageDetail &&
        getImageDetail["learnerImg"]?.length > 0
      ) {
        const checkey = getImageDetail.learnerImg.split("client-809/")[1];
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

    if (req.learnerExists) {
      return res
        .status(404)
        .json({ message: req.learnerExists, status: false });
    }

    req.learnerData.learnerImg = URL + req.fileData;

    await req.learnerData.save();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    return res.status(200).json({
      data: req.learnerData,
      status: true,
      message: "the learner has been updated",
    });
  } catch (err) {
    logger.error(`Error from function ${uploadLearnerImage.name}`, { stack: err.stack })

    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editLearner = async (req, res) => {
  const {
    learnerId,
    firstName,
    middleName,
    surName,
    dob,
    gender,
    email,
    mobile,
    enrollmentDate,
    countryCode,
    schoolId,
    gradeId,
    divisionId
  } = req.body;
  try {
    if (!!mobile === true && !!countryCode === true) {
      let getCountryName = countriesRecord[countryCode]
      if (isPossiblePhoneNumber(mobile + '', getCountryName) === false || isValidPhoneNumber(mobile + '', getCountryName) === false) {
        throw new Error(
          `Please enter the valid mobile number`
        );
      }
    }
    let learnerExists = await learnerModal.findById(learnerId);


    if (!learnerExists) {
      return res.status(404).json({
        message: `learner does not exist with learnerId ${learnerId}`,
        status: false,
      });
    }

    if (email) {
      let learnerEmailExists = await userModal.findOne({ email });
      if (learnerEmailExists) {
        if (learnerEmailExists.email !== learnerExists.email) {
          return res.status(409).json({
            message: `learner already exists with email ${email}`,
            status: false,
          });
        }
      }
    }

    if (mobile) {
      let learnerMobileExists = await userModal.findOne({ mobile });
      if (learnerMobileExists) {
        if (learnerMobileExists.mobile !== learnerExists.mobile) {
          return res.status(409).json({
            message: `learner already exists with mobile ${mobile}`,
            status: false,
          });
        }
      }
    }
    let checkingGradeById;
    let checkingDivisionById;
    let getNewCourseByDivision;
    let assecmentByfilter;
    if (!!schoolId === true && !!gradeId === true && !!divisionId === true) {
      let schoolExist = await schoolModel.findById(schoolId).lean();
      if (!!schoolExist === false) throw new Error(`Please enter the valid school id`)

      let gradeExist = await gradeModal.findById(gradeId).lean();

      if (!!gradeExist === false) throw new Error(`Please enter the valid grade id`)

      let divisionExist = await divisionModal.findById(divisionId).lean();

      if (!!divisionExist === false) throw new Error(`Please enter the valid division id`)

      checkingGradeById = learnerExists.gradeId + ''.substring(0)

      checkingDivisionById = learnerExists.divisionId + ''.substring(0)
      let validateGrade = await schoolModel.find({ _id: schoolId, grades: { $in: gradeId } })

      if (Array.isArray(validateGrade) && validateGrade.length <= 0) throw new Error(`This grade dose not fall under the school id ${schoolId}`)
      let validateDivision = await gradeModal.find({ _id: gradeId, divisions: { $in: divisionId } })
      if (Array.isArray(validateDivision) && validateDivision.length <= 0) throw new Error(`This division dose not fall under the grade id ${gradeId}`)

      let getAllCoursesByCourseId = await courseModal.find({ assignedGrade: checkingGradeById }, { _id: 1 })

      let getAllCoursesByDivisionId = await courseModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })

      getAllCoursesByCourseId = getAllCoursesByCourseId.map((element) => element._id + ''.substring(0))

      getAllCoursesByDivisionId = getAllCoursesByDivisionId.map((element) => element._id + ''.substring(0))

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { courses: { courseId: { $in: getAllCoursesByCourseId } } } })

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { courses: { courseId: { $in: getAllCoursesByDivisionId } } } })

      let getAllAssessmentByCourseId = await assessmentModal.find({ assignedGrade: checkingGradeById }, { _id: 1 })

      let getAllAssessmentByDivisionId = await assessmentModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })

      getAllAssessmentByCourseId = getAllAssessmentByCourseId.map((element) => element._id + ''.substring(0))

      getAllAssessmentByDivisionId = getAllAssessmentByDivisionId.map((element) => element._id + ''.substring(0))

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { assessments: { assessmentId: { $in: getAllAssessmentByCourseId }, completion: false } } })

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { assessments: { assessmentId: { $in: getAllAssessmentByDivisionId }, completion: false }, } })
      getNewCourseByDivision = await divisionModal.findOne({ _id: divisionId }, { "courses._id": 0 })
      let getNewAssessmentByDivision = await divisionModal.findOne({ _id: divisionId }, { "assessments._id": 0 })
      if (!!getNewAssessmentByDivision === true) {
        assecmentByfilter = getNewAssessmentByDivision.assessments.filter((element) => element.completion === false)
      }
    } else if (!!gradeId === true && !!divisionId === true) {

      let gradeExist = await gradeModal.findById(gradeId).lean();

      if (!!gradeExist === false) throw new Error(`Please enter the valid grade id`)

      let divisionExist = await divisionModal.findById(divisionId).lean();

      if (!!divisionExist === false) throw new Error(`Please enter the valid division id`)

      checkingGradeById = learnerExists.gradeId + ''.substring(0)

      checkingDivisionById = learnerExists.divisionId + ''.substring(0)

      let validateDivision = await gradeModal.find({ _id: gradeId, divisions: { $in: divisionId } })
      if (Array.isArray(validateDivision) && validateDivision.length <= 0) throw new Error(`This division dose not fall under the grade id ${gradeId}`)


      let getAllCoursesByCourseId = await courseModal.find({ assignedGrade: checkingGradeById }, { _id: 1 })

      let getAllCoursesByDivisionId = await courseModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })

      getAllCoursesByCourseId = getAllCoursesByCourseId.map((element) => element._id + ''.substring(0))

      getAllCoursesByDivisionId = getAllCoursesByDivisionId.map((element) => element._id + ''.substring(0))

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { courses: { courseId: { $in: getAllCoursesByCourseId } } } })

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { courses: { courseId: { $in: getAllCoursesByDivisionId } } } })

      let getAllAssessmentByCourseId = await assessmentModal.find({ assignedGrade: checkingGradeById }, { _id: 1 })

      let getAllAssessmentByDivisionId = await assessmentModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })

      getAllAssessmentByCourseId = getAllAssessmentByCourseId.map((element) => element._id + ''.substring(0))

      getAllAssessmentByDivisionId = getAllAssessmentByDivisionId.map((element) => element._id + ''.substring(0))

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { assessments: { assessmentId: { $in: getAllAssessmentByCourseId }, completion: false } } })

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { assessments: { assessmentId: { $in: getAllAssessmentByDivisionId }, completion: false }, } })
      getNewCourseByDivision = await divisionModal.findOne({ _id: divisionId }, { "courses._id": 0 })
      let getNewAssessmentByDivision = await divisionModal.findOne({ _id: divisionId }, { "assessments._id": 0 })
      if (!!getNewAssessmentByDivision === true) {
        assecmentByfilter = getNewAssessmentByDivision.assessments.filter((element) => element.completion === false)
      }
    } else if (!!divisionId === true) {
      let divisionExist = await divisionModal.findById(divisionId).lean();

      if (!!divisionExist === false) throw new Error(`Please enter the valid division id`)

      checkingDivisionById = learnerExists.divisionId + ''.substring(0)


      let getAllCoursesByDivisionId = await courseModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })


      getAllCoursesByDivisionId = getAllCoursesByDivisionId.map((element) => element._id + ''.substring(0))


      await learnerModal.updateMany({ _id: learnerId }, { $pull: { courses: { courseId: { $in: getAllCoursesByDivisionId } } } })


      let getAllAssessmentByDivisionId = await assessmentModal.find({ assignedDivisions: { $in: checkingDivisionById } }, { _id: 1 })

      getAllAssessmentByDivisionId = getAllAssessmentByDivisionId.map((element) => element._id + ''.substring(0))

      await learnerModal.updateMany({ _id: learnerId }, { $pull: { assessments: { assessmentId: { $in: getAllAssessmentByDivisionId }, completion: false }, } })
      getNewCourseByDivision = await divisionModal.findOne({ _id: divisionId }, { "courses._id": 0 })
      let getNewAssessmentByDivision = await divisionModal.findOne({ _id: divisionId }, { "assessments._id": 0 })
      if (!!getNewAssessmentByDivision === true) {
        assecmentByfilter = getNewAssessmentByDivision.assessments.filter((element) => element.completion === false)
      }
    }


    //This loop is used while applying all methods to set and push and exist which is not working thats why i have applied this loop
    if (!!getNewCourseByDivision === true && !!assecmentByfilter === true && Array.isArray(getNewCourseByDivision.courses) && getNewCourseByDivision.courses.length > 0 || Array.isArray(assecmentByfilter) && assecmentByfilter.length > 0) {
      await learnerModal.updateOne(
        {
          _id: learnerId,
        },
        {
          $addToSet: { courses: getNewCourseByDivision.courses, assessments: assecmentByfilter }
        },
      );
    }

    learnerExists.firstName = firstName ? firstName : learnerExists.firstName;
    learnerExists.middleName = middleName
      ? middleName
      : learnerExists.middleName;
    learnerExists.surName = surName ? surName : learnerExists.surName;
    learnerExists.dob = dob ? dob : learnerExists.dob;
    learnerExists.gender = gender ? gender : learnerExists.gender;
    learnerExists.email = email ? email : learnerExists.email;
    learnerExists.mobile = mobile ? mobile : learnerExists.mobile;
    learnerExists.enrollmentDate = enrollmentDate ? enrollmentDate : learnerExists.enrollmentDate;
    learnerExists.schoolId = schoolId ? schoolId : learnerExists.schoolId;
    learnerExists.gradeId = gradeId ? gradeId : learnerExists.gradeId;
    learnerExists.divisionId = divisionId ? divisionId : learnerExists.divisionId;
    learnerExists.fullName = firstName && middleName && surName
      ? `${firstName} ${middleName} ${surName}`
      : firstName && middleName
        ? `${firstName} ${middleName}`
        : firstName

    learnerExists.updatedOn = new Date().getTime();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    await learnerExists.save();

    if (learnerExists) {
      return res.status(200).json({
        status: true,
        message: "the learner successfully updated",
        data: learnerExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableLearner = async (req, res) => {
  const { learnerId } = req.params;
  try {
    let learnerExists = await learnerModal.findById(learnerId);

    if (!learnerExists) {
      return res.status(404).json({
        message: `Learner does not Exist with learnerId ${learnerId}`,
        status: false,
      });
    }
    learnerExists.disable = learnerExists.disable ? false : true;
    await learnerExists.save();
    if (!!learnerExists.courses === true && Array.isArray(learnerExists.courses) && learnerExists.courses.length > 0) {
      learnerExists.courses.map((element) => {
        return element.disable = learnerExists.disable ? true : false
      })
    }
    if (!!learnerExists.assessments === true && Array.isArray(learnerExists.assessments) && learnerExists.assessments.length > 0) {
      learnerExists.assessments.map((element) => {
        return element.disable = learnerExists.disable ? true : false
      })
    }
    let deleteRedisHash = ["getAllLearner", "getAllSchool", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    if (learnerExists) {
      return res.status(200).json({
        status: true,
        message: "The learner successfully updated",
        data: learnerExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteLearner = async (req, res) => {
  const { learnerIds } = req.body;
  try {
    for await (let learnerId of learnerIds) {
      if (!!mongoose.Types.ObjectId.isValid(learnerId) === false) {
        throw new Error(`Please provide the valid learner id ${learnerId}`)
      }

      let learnerExists = await learnerModal.findById(learnerId);

      if (!learnerExists) {
        return res.status(404).json({
          message: `Learner does not Exist with learnerId ${learnerId}`,
          status: false,
        });
      }
      await courseModal.updateMany(
        { "assignedLearners.learnerId": learnerId },
        { $pull: { assignedLearners: { learnerId: learnerId } } }
      );
      await resultModal.deleteMany({ learnerId });
      await subFolderTrackModel.deleteMany({ userId: learnerId });
      await learnerExists.deleteOne();
    }
    let deleteRedisHash = ["getAllLearner", "getAllSchool", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    return res.status(200).json({
      status: true,
      message: "The learner successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllLearner = async (req, res) => {
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
    let getLearners = [];
    let matchQuery = {};

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "courses" ? "coursesCount" : sortBys
      sortBys = sortBys == "assessments" ? "assessmentsCount" : sortBys
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (schoolId && schoolId != "null") {
      matchQuery = {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
        },
      };
      queryObj.schoolId = schoolId;
    }
    if (gradeId && gradeId != "null") {
      matchQuery = {
        $match: {
          gradeId: new mongoose.Types.ObjectId(gradeId),
        },
      };
      queryObj.gradeId = gradeId;
    }
    if (divisionId && divisionId != "null") {
      matchQuery = {
        $match: {
          divisionId: new mongoose.Types.ObjectId(divisionId),
        },
      };
      queryObj.divisionId = divisionId;
    }

    let pipeline = [
      {
        $lookup: {
          from: "grades",
          localField: "gradeId",
          foreignField: "_id",
          as: "grade",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "divisionId",
          foreignField: "_id",
          as: "division",
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "school",
        },
      },
      { $unwind: "$school" },
      { $unwind: "$grade" },
      { $unwind: "$division" },
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "learnerId",
          as: "results",
        },
      },
      {
        $addFields: {
          coursesCount: { $size: '$courses' },
          assessmentsCount: { $size: '$assessments' }
        }
      },
      {
        $project: {
          assessments: 0,
          courses: 0,
          grade: 0,
          division: 0,
          school: 0,
          results: 0,
          firstName: 0,
          middleName: 0,
          surName: 0,
          passwordChanged: 0,
          dob: 0,
          enrollmentDate: 0,
          schoolId: 0,
          divisionId: 0,
          gender: 0,
          email: 0,
          countryCode: 0,
          updatedOn: 0,
          userRole: 0,
          updatedAt: 0,
          deviceToken: 0,
          deviceType: 0,
          macAddress: 0,
          role: 0,
          learnerImg: 0,
          gradeId: 0,
        }
      },
      {
        $sort: {
          [sortBys]: sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },

    ];
    if (schoolId || gradeId || divisionId) {
      pipeline.unshift(matchQuery);
    }
    if (search && (schoolId || gradeId || divisionId)) {
      pipeline.unshift({
        $match: {
          $or: [
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
          ],
        },
      });
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
    } else if (search) {
      pipeline.unshift({
        $match: {
          $or: [
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
          ],
        },
      });
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
    if (sortBy && sortType) {
      if (sortBy == "uId") {
        pipeline.splice(7, 1, {
          $addFields: {
            numericPart: {
              $toInt: {
                $arrayElemAt: [{ $split: ["$uId", "-"] }, 1]
              }
            },
            coursesCount: { $size: '$courses' },
            assessmentsCount: { $size: '$assessments' }
          }
        },
        )
        pipeline.splice(9, 1, {
          $sort: { numericPart: +sortType }
        },
        )
      }

    }


    let redisData = await redisHelper.getDataFromRedisHash(`getAllLearner`, `getAllLearner_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`);
    if (Array.isArray(redisData) && redisData != false) {
      getLearners = redisData

    } else {
      getLearners = await learnerModal.aggregate(pipeline);
      for await (const iterator of getLearners) {
        const originalText = cryptr.decrypt(iterator.password);
        iterator.password = originalText;
        if (!!iterator == true && !!iterator.countryCode === true && !!iterator.mobile === true) {
          iterator.mobile = `${iterator.countryCode}${iterator.mobile}`
        }
      }
      await redisHelper.setRedisHash(`getAllLearner`, `getAllLearner_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`, getLearners)
    }
    let totalLength = await learnerModal.countDocuments(queryObj);


    return res.status(200).json({
      data: getLearners,
      status: true,
      message: "Learners retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllLearner.name}`, { stack: err.stack })
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllLearnerForAssign = async (req, res) => {
  try {
    const { pagination, page, limit, search, schoolId, gradeId, divisionId } =
      req.query;

    let queryObj = {};
    let getLearners = [];

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
      queryObj.gradeId = gradeId;
    }
    if (divisionId && divisionId != "null") {
      queryObj.divisionId = divisionId;
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
    getLearners = learnerModal.find(queryObj).select("fullName uId");

    if (pagination) {
      let skip = (pageValue - 1) * limit;
      getLearners = getLearners.sort({ _id: -1 }).skip(skip).limit(limitValue);
    }

    getLearners = await getLearners;
    let totalLength = await learnerModal.countDocuments(queryObj);

    return res.status(200).json({
      data: getLearners,
      status: true,
      message: "Learners retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllLearnerForAssign.name}`, { stack: err.stack })
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getUidLearner = async (req, res) => {
  try {
    let learnerExists = await learnerModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!learnerExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "S-1",
      });
    }

    const lastUid = learnerExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "S-" + (uidNumber + 1);
    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    let learnerExists = await learnerModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(learnerId) } },
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
      { $unwind: "$gradeData" },
      { $unwind: "$divisionData" },
      { $unwind: "$schoolData" },

      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "learnerId",
          as: "resultData",
        },
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          middleName: 1,
          surName: 1,
          fullName: 1,
          dob: 1,
          enrollmentDate: 1,
          schoolId: 1,
          email: 1,
          uId: 1,
          mobile: 1,
          gradeId: 1,
          divisionId: 1,
          gender: 1,
          learnerImg: 1,
          courses: 1,
          passwordChanged: 1,
          assessments: 1,
          countryCode: 1,
          assessmentLength: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$assessments", null] }, null] },
              then: 0,
              else: { $size: "$assessments" }
            }
          },
          coursesLength: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$courses", null] }, null] },
              then: 0,
              else: { $size: "$courses" }
            }
          },
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          gradeUid: "$gradeData.gradeUid",
          gradeName: "$gradeData.gradeName",
          divisionUid: "$divisionData.divisionUid",
          divisionName: "$divisionData.divisionName",
          totalMarks: { $sum: "$resultData.maxMarks" },
          totalObtainMarks: { $sum: "$resultData.totalObtainMarks" },
        },
      },
    ]);
    learnerExists[0].phone = `${learnerExists[0].countryCode}${learnerExists[0].mobile}`
    if (learnerExists.length > 0)
      return res.status(200).json({
        status: true,
        message: "The learner successfully retrieved",
        data: learnerExists[0],
      });

    return res.status(404).json({
      status: false,
      message: `Learner does not Exist with learnerId ${learnerId}`,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for  forgot password purpose
 * @returns {Object}
 */
export const forgotPassword = async (req, res) => {
  let returnObj = { message: "", error: false, status: 400 };
  try {
    const { id, password } = req.body;
    if (mongoose.Types.ObjectId.isValid(id) === false) {
      returnObj.status = 404;
      returnObj.error = true;
      returnObj.message = "Id not valid";
      return res.status(returnObj.status).json(returnObj);
    }
    const getUserDetail = await userModal.findById({ _id: id });
    if (!!getUserDetail === false) {
      returnObj.status = 404;
      returnObj.error = true;
      returnObj.message = "Please enter the valid id";
      return res.status(returnObj.status).json(returnObj);
    }
    const encryptedData = cryptr.encrypt(password);
    await userModal.findOneAndUpdate(
      {
        _id: id,
      },
      {
        password: encryptedData,
      }
    );
    let deleteRedisHash = ["getAllLearner"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    returnObj.status = 200;
    returnObj.error = true;
    returnObj.message = "Password changed successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${forgotPassword.name}`, { stack: error.stack })
    returnObj.message = error;
    returnObj.error = true;
    returnObj.status = 400;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for lerner change password 
 * @returns {Object}
 */
export const changePassword = async (req, res) => {
  let returnObj = { message: "", error: false, status: 400 };
  try {
    const { currentPassword, newPassword } = req.body;
    const { userId } = req.user;
    const userDetail = await userModal.findById(userId).select("+password");
    if (!!userDetail === true && "password" in userDetail) {
      let originalText = cryptr.decrypt(userDetail?.password);
      if (!!originalText === true && originalText !== currentPassword) {
        throw new Error(
          "Currecnt password is invalid please provide the correct one"
        );
      }
    }
    const ciphertext = cryptr.encrypt(newPassword);
    await userModal.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        password: ciphertext,
      }
    );
    let deleteRedisHash = ["getAllLearner"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    returnObj.status = 200;
    returnObj.error = true;
    returnObj.message = "Password updated successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${changePassword.name}`, { stack: error.stack })
    returnObj.message = error.message;
    returnObj.error = true;
    returnObj.status = 400;
    return res.status(returnObj.status).json(returnObj);
  }
};

/**
 * This function is used for get course detail by course id
 * @returns {params}
 */
export const getCourseDetailByCourseId = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {
    const { courseId } = req.params;
    const { userId } = req.user;
    let queryObj = {};
    queryObj = {
      $match: {
        assigned: true,
        _id: new mongoose.Types.ObjectId(courseId),
      },
    };
    let pipeline = [
      queryObj,
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
          let: {
            subFoldersIds: "$folderData.subFolder",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$subFoldersIds"],
                },
              },
            },
          ],
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
                    { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] },
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
        $project: {
          courseName: 1,
          courseDuration: 1,
          createdOn: 1,
          expiredOn: 1,
          about: 1,
          subfolderLength: {
            $ifNull: [{ $size: "$folderData.subFolder" }, 0]
          },
          coursePicture: 1,
          folderData: 1,
          subFolderData: 1,
          subFolderTrackData: 1,
        },
      },
    ];
    const getCourseDetail = await courseModal.aggregate(pipeline);
    for (let iterator1 of getCourseDetail) {
      for (const iterator of iterator1.subFolderData) {
        iterator1.subFolderTrackData.filter((element) => {
          return iterator._id + ''.substring(0) == element.subFolderId + ''.substring(0) && element.userId + ''.substring(0) == userId && element.courseId + ''.substring(0) == courseId

        }).map((element) => {
          iterator.accessibility = element.accessibility
          iterator.accessLimit = element.accessLimit
        })
      }
    }
    if (!!getCourseDetail === false || getCourseDetail.length <= 0) {
      returnObj.status = 409;
      returnObj.error = true;
      returnObj.message = "This course id is invalid";
      return res.status(returnObj.status).json(returnObj);
    }
    returnObj.message = "Course detail found successfully";
    returnObj.error = false;
    returnObj.status = 200;
    returnObj.data = getCourseDetail;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${getCourseDetailByCourseId.name}`, { stack: error.stack })
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error;
    return res.status(returnObj.status).json(returnObj);
  }
};

export const getLearnerByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const {
      gradeId,
      divisionId,
      pagination,
      page,
      limit,
      sortBy,
      sortType,
      search,
    } = req.query;
    let learners;
    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys
      sortBys = sortBys == "Grades" ? "GradesPart" : sortBys
    }
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(404).json({
        status: false,
        message: `give correct format of teacher Id`,
      });
    }
    const teacherExists = await teacherModal.findById(teacherId).lean();
    let divisionIds = [];

    if (!teacherExists) {
      return res.status(404).json({
        status: false,
        message: `teacher does not exist with teacherId ${teacherId}`,
      });
    }
    if (teacherExists.gradeNdivision.length == 0) {
      return res.status(404).json({
        status: false,
        message: `No division assigned to this teacher`,
      });
    }
    if (mongoose.Types.ObjectId.isValid(gradeId) === true) {
      for (let division of gradeNdivision) {
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


    let pipeline = [
      {
        $match: {
          divisionId: { $in: divisionIds },
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
      { $unwind: "$gradeData" },
      { $unwind: "$divisionData" },
      { $unwind: "$schoolData" },
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "learnerId",
          as: "resultData",
        },
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$uId", "-"] }, 1]
            }
          },
          gradesPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$gradeName", "-"] }, 1]
            }
          },

        }
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                uId: 1,
                middleName: 1,
                surName: 1,
                fullName: 1,
                dob: 1,
                enrollmentDate: 1,
                schoolId: 1,
                gradeId: 1,
                divisionId: 1,
                gender: 1,
                learnerImg: 1,
                numericPart: 1,
                gradesPart: 1,
                schoolUid: "$schoolData.schoolUid",
                schoolName: "$schoolData.schoolName",
                gradeUid: "$gradeData.gradeUid",
                gradeName: "$gradeData.gradeName",
                divisionUid: "$divisionData.divisionUid",
                divisionName: "$divisionData.divisionName",
                totalMarks: { $sum: "$resultData.maxMarks" },
                totalObtainMarks: { $sum: "$resultData.totalObtainMarks" },
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

    if (search) {
      pipeline.splice(1, 0, {
        $match: {
          $or: [
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
          ],
        },
      });
    }
    let redisData = await redisHelper.getDataFromRedisHash(`getLearnerByTeacher`, `getLearnerByTeacher_${teacherId}_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`);
    if (Array.isArray(redisData) && redisData != false) {
      learners = redisData
    } else {
      learners = await learnerModal.aggregate(pipeline);
      await redisHelper.setRedisHash(`getLearnerByTeacher`, `getLearnerByTeacher_${teacherId}_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`, learners)

    }

    return res.status(200).json({
      status: true,
      message: "The learner successfully retrieved",
      data: learners[0].data,
      totalLength: learners[0].totalCount[0]?.total || 0,
    });
  } catch (err) {
    logger.error(`Error from function ${getLearnerByTeacher.name}`, { stack: err.stack })
  }
};


function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      return;
    }
    console.log("Directory deleted successfully");
  });
}

/**
 * This function is used for uploading multiple lerner 
 * @returns {N/A}
 * @payload {body}
 * @method Post
 */

export const uploadLernerByCsv = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  let filePath
  try {
    let { schoolId, gradeId, divisionId } = req.body;
    if (!!req.message === true) {
      throw new Error(req.message);
    }
    filePath = `${req.file.path.replace(/\\/g, "/")}`;
    let array = await csv().fromFile(filePath);
    let checkHeaders = [
      "firstName",
      "middleName",
      "surName",
      "gender",
      "email",
      "mobile",
      "countryCode",
      // 'profile_pic'
    ];
    let { length } = Object.keys(array[0]);
    if (checkHeaders.length !== length) {
      await deleteFile(filePath)
      throw new Error(
        `Please provide the all required headers ${checkHeaders.join(",")}`
      );
    }
    for (let index = 0; index < checkHeaders.length; index++) {
      const element = checkHeaders[index];
      if (element.toString() !== Object.keys(array[0])[index].toString()) {
        throw new Error(`${element.toString()} field is missing `);
      }
    }
    for (let index = 0; index < array.length; index++) {
      const element = array[index];
      let getCountryName = countriesRecord[element?.countryCode]
      if (isPossiblePhoneNumber(element["mobile"], getCountryName) === false || isValidPhoneNumber(element["mobile"], getCountryName) === false) {
        await deleteFile(filePath)
        throw new Error(
          `Please enter the valid mobile number ${element["mobile"]} at row no:${index + 2
          }`
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(element["email"]) === false) {
        await deleteFile(filePath)
        throw new Error(
          `Please enter the valid email ${element["email"]} at row no:${index + 2
          }`
        );
      }

    }
    let newUid;
    let learnerExists = await learnerModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!!learnerExists === false) {
      newUid = "S-1";
    }

    if (!!learnerExists === true) {
      const lastUid = learnerExists?.uId;
      const uidNumber = parseInt(lastUid.split("-")[1]);
      newUid = "S-" + (uidNumber + 1);
    }
    if (array.length <= 200) {
      let addArray = []
      for await (const iterator of array) {
        let password = await randomstring.generate({
          length: 12,
          charset: "alphanumeric",
        });
        let addObject = {
          firstName: iterator.firstName,
          middleName: iterator.middleName,
          surName: iterator.surName,
          fullName: iterator.firstName && iterator.middleName && iterator.surName
            ? `${iterator.firstName} ${iterator.middleName} ${iterator.surName}`
            : iterator.firstName && iterator.middleName
              ? `${iterator.firstName} ${iterator.middleName}`
              : iterator.firstName,
          dob: iterator.dob || "",
          enrollmentDate: iterator.enrollmentDate || "",
          gender: iterator.gender,
          email: iterator.email,
          mobile: iterator.mobile,
          userRole: 3,
          role: "Learner",
          schoolId: schoolId,
          gradeId: gradeId,
          divisionId: divisionId,
          password: cryptr.encrypt(password),
          createdOn: new Date().getTime()
        }

        if (Array.isArray(addArray) && addArray.length <= 0) {
          addObject.uId = newUid
        } else {
          let getLastIndex = addArray[addArray.length - 1].uId
          const uidNumber = parseInt(getLastIndex.split("-")[1])
          let newUid = "S-" + (uidNumber + 1);
          addObject.uId = newUid
        }
        if (process.env.SENTEMAIL === 'true') {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {}
          registerEmailPayload.name = addObject.fullName
          let filePath = path.join(process.cwd(), "./middleware/emailTemplate/learnerSignUp.ejs");
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = addObject.email
          registerEmailPayload.subject = `Welcome to Brainstorm International!`
          registerEmailPayload.html = htmlToSent
          await rabbitMqHelper.produceQueue(registerEmailPayload)

          //This point is used to sent log in credentials for learner
          let logInPayload = {}
          logInPayload.name = addObject.fullName
          logInPayload.uId = addObject.uId
          logInPayload.password = password
          logInPayload.subject = `Login details of students!`
          logInPayload.email = addObject.email
          let filePathCredential = path.join(process.cwd(), "./middleware/emailTemplate/learnerSignUpCredential.ejs");
          let sourceCredential = fs.readFileSync(filePathCredential, "utf-8").toString();
          const htmlToSentCredential = ejs.render(sourceCredential, logInPayload);
          logInPayload.html = htmlToSentCredential
          await rabbitMqHelper.produceQueue(logInPayload)
        }
        addArray.push(addObject)

      }
      await learnerModal.insertMany(addArray);
      await deleteFile(filePath)
    } else {
      if (!!isMainThread === true) {
        let worker = new Worker(__basedir + '/workerThread/uploadLearnerWorker.js')
        const payloadObj = { newUid: newUid, schoolId: schoolId, gradeId: gradeId, divisionId: divisionId }
        worker.postMessage({ array, payloadObj })
        worker.on('message', async (message) => {
          await learnerModal.insertMany(message);
        });
        await deleteFile(filePath)
      }
    }
    let deleteRedisHash = ["getAllLearner", "getAllSchool", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    returnObj.status = 201;
    returnObj.error = false;
    // returnObj.rows = lernerAdded
    returnObj.message = "Learners excel start uploading";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${uploadLernerByCsv.name}`, { stack: error.stack })
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};



/**
 * This function is used for removing course for learner which have assigned through division or grade
 
 
 * @returns {N/A}
 * @payload {body}
 * @method Post
 */
export const removeCourseFromLearner = async (req, res) => {
  const { learnerId, courseId, originalCourseId } = req.body;
  try {
    let learnerExist = await learnerModal.findById(learnerId);
    if (!learnerExist) {
      return res.status(400).json({
        message: `learner does not exist`,
        status: false,
      });
    }

    let courseExist = await courseModal.findById(courseId).lean();
    if (!!courseExist === false) {
      return res.status(400).json({
        message: `course does not exist`,
        status: false,
      });
    }

    await learnerModal.updateOne(
      { _id: learnerId },
      { $pull: { courses: { courseId } } }
    );

    const getCourseDetail = await courseModal.findById(courseId)
    if (!!getCourseDetail === true && !!getCourseDetail.assignedLearners === true && "assignedLearners" in getCourseDetail) {
      for (let index = 0; index < getCourseDetail.assignedLearners.length; index++) {
        const element = getCourseDetail.assignedLearners[index];
        if (element + "".substring(0) === learnerId) {
          getCourseDetail.assignedLearners.splice(index, 1)
        }
      }
    }
    await getCourseDetail.save();
    const getOldCourseDetail = await courseModal.findById(originalCourseId).lean();
    if (!!getOldCourseDetail === true) {

      await courseModal.updateOne({ _id: originalCourseId }, { subCourseCount: getOldCourseDetail.subCourseCount - 1 })
    }
    await notificationModal.deleteOne({
      userId: new mongoose.Types.ObjectId(learnerId), 'data.courseId': new mongoose.Types.ObjectId(courseId)
    });
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    return res.status(201).json({
      status: true,
      message: "the course successfully removed",
    });
  } catch (err) {
    logger.error(`Error from function ${removeCourseFromLearner.name}`, { stack: err.stack })
    return res.status(500).json({ status: false, message: err.message });
  }
};


/**
 * This function is used for get course detail by course id 
 * @returns {params}
 */
export const getAllSkillByAssessmentForLearner = async (req, res) => {
  const returnObj = { status: 400, error: true, message: "" };
  try {

    const { userId } = req.user;
    let { limit, page } = req.params

    let pageValue = parseInt(page) || 1
    let limitValue = parseInt(limit) || 10
    let skip = (pageValue - 1) * limitValue;
    let pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) }
      },
      { $unwind: { path: "$assessments", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "assessments",
          localField: "assessments.assessmentId",
          foreignField: "_id",
          as: "assessmentsDetail"
        }
      },
      { $unwind: { path: "$assessmentsDetail", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subskills",
          localField: "assessmentsDetail.subSkillId",
          foreignField: "_id",
          as: "subSkillDetail"
        }
      },
      { $unwind: { path: "$subSkillDetail", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "skills",
          localField: "subSkillDetail.skillId",
          foreignField: "_id",
          as: "skillDetail"
        }
      },
      {
        $sort: {
          "skillDetail.createdOn": - 1
        }
      },
      {
        $limit: limitValue
      },
      {
        $skip: skip
      },
      { $unwind: { path: "$skillDetail", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: "$skillDetail._id",
          skillName: "$skillDetail.skillName"
        }
      }
    ]
    const getSkillDetail = await learnerModal.aggregate(pipeline);
    returnObj.message = "Skill detail found successfully";
    returnObj.error = false;
    returnObj.status = 200;
    returnObj.data = getSkillDetail || [];
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${getAllSkillByAssessmentForLearner.name}`, { stack: error.stack })
    returnObj.status = 400;
    returnObj.error = true;
    returnObj.message = error;
    return res.status(returnObj.status).json(returnObj);
  }
};





/**
 * This function is used for lerner without old password due to requirement 
 * @returns {Object}
 */
export const changePasswordWithoutOldPassword = async (req, res) => {
  let returnObj = { message: "", error: false, status: 400 };
  try {
    const { newPassword } = req.body;
    const { userId } = req.user;
    if (!!newPassword === false) {
      throw new Error('Please provide the new Password')
    }
    if (newPassword.length <= 0) {
      throw new Error('Password should not be empty')
    }
    // const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,16}$/;

    const ciphertext = cryptr.encrypt(newPassword);
    await learnerModal.updateOne(
      {
        _id: userId,
      },
      {
        password: ciphertext,
        passwordChanged: true
      }
    );
    let deleteRedisHash = ["getAllLearner"]
    await redisHelper.delDataFromRedisHash(deleteRedisHash)
    returnObj.status = 200;
    returnObj.error = true;
    returnObj.message = "Password updated successfully";
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    returnObj.message = error.message;
    returnObj.error = true;
    returnObj.status = 400;
    return res.status(returnObj.status).json(returnObj);
  }
};




export const uploadLearnerFolder = async (req, res) => {
  try {
    const { URL } = process.env;
    if (!!req.fileData === true) {
      req.folderUrl = URL + req.fileData;
    }

    return res.status(200).json({
      data: req.folderUrl,
      status: true,
      message: "Files uploaded successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${uploadLearnerImage.name}`, { stack: err.stack })

    return res.status(500).json({ status: false, message: err.message });
  }
};