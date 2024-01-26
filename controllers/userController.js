import assessmentModal from "../modals/assessmentModal.js";
import courseModal from "../modals/courseModal.js";
import learnerModal from "../modals/learnerModal.js";
import schoolModal from "../modals/schoolModal.js";
import teacherModal from "../modals/teacherModal.js";
import userModal from "../modals/userModal.js";
import Cryptr from "cryptr";
import dotenv from "dotenv";
import mongoose from "mongoose";
import CryptoJS from "crypto-js";
import aws from "aws-sdk";
import { logger } from "../app.js";
import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  validatePhoneNumberLength,
} from "libphonenumber-js";
import { countriesRecord } from "./countryCode.js";
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
const cryptr = new Cryptr(process.env.CRYPTO_SCRET_KEY);
export const createUser = async (req, res) => {
  const {
    emailMobUid: uId,
    userRole,
    password,
    email,
    mobile,
    firstName,
    middleName,
    surName,
    countryCode,
    macAddress,
  } = req.body;
  try {
    if (!!macAddress === false) {
      throw new Error("Please provide the macAddress");
    }
    if (!!mobile === true && !!countryCode === true) {
      let getCountryName = countriesRecord[countryCode];
      if (
        isPossiblePhoneNumber(mobile + "", getCountryName) === false ||
        isValidPhoneNumber(mobile + "", getCountryName) === false
      ) {
        throw new Error(`Please enter the valid mobile number`);
      }
    }
    let userExists = await userModal.findOne({
      $or: [{ email }, { mobile }, { uId }, { role: 1 }],
    });

    if (userExists) {
      if (userExists.userRole == userRole)
        return res.status(409).json({
          message: `Users Already Exists with role Admin`,
          status: false,
        });

      if (userExists.uId == uId)
        return res.status(409).json({
          message: `Users Already Exists with uId ${uId}`,
          status: false,
        });
    }
    const newUser = await userModal.create({
      uId,
      userRole,
      password,
      email: email ? email : null,
      mobile: mobile ? mobile : null,
      firstName: firstName ? firstName : null,
      middleName: middleName ? middleName : null,
      surName: surName ? surName : null,
      countryCode: countryCode ? countryCode : null,
      macAddress: macAddress ? macAddress : null,
      createdOn: new Date().getTime(),
    });

    if (newUser) {
      return res.status(201).json({
        status: true,
        message: "the user successfully created",
        data: newUser,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for admin dashboard all count Api
 * @returns {object}
 * @method Get
 */

export const adminDashboardCountApi = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    let data = {};
    let getSchool = await schoolModal.countDocuments();
    let getCourses = await courseModal.countDocuments();
    let getAssessment = await assessmentModal.countDocuments();
    let getStudent = await learnerModal.countDocuments({ role: "Learner" });
    let getTeachers = await teacherModal.countDocuments({ role: "Teacher" });

    getSchool = !!getSchool === true && getSchool > 0 ? getSchool : 0;
    getCourses = !!getCourses === true && getCourses > 0 ? getCourses : 0;
    getAssessment =
      !!getAssessment === true && getAssessment > 0 ? getAssessment : 0;
    getStudent = !!getStudent === true && getStudent > 0 ? getStudent : 0;
    getTeachers = !!getTeachers === true && getTeachers > 0 ? getTeachers : 0;
    data.schoolCount = getSchool;
    data.coursesCount = getCourses;
    data.studentCount = getStudent;
    data.assessmentCount = getAssessment;
    data.teachersCount = getTeachers;
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.data = data;
    returnObj.message = "All dashboard count Data";
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
 * This function is used for latest courses and latest assessment
 * @returns {object}
 * @method Get
 */

export const getAdminCoursesAndAssessment = async (req, res) => {
  let returnObj = { status: 400, error: true, message: "" };
  try {
    const getCourseDetail = await courseModal
      .find({}, { courseName: 1, coursePicture: 1, createdOn: 1 })
      .sort({ createdOn: -1 })
      .limit(6);
    const getAssessmentDetail = await assessmentModal
      .find({}, { assessmentName: 1, createdOn: 1 })
      .sort({ createdOn: -1 })
      .limit(6);
    returnObj.status = 200;
    returnObj.error = false;
    returnObj.data = { getCourseDetail, getAssessmentDetail };
    returnObj.message = "All dashboard Data";
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
 * This function is used for update admin profile
 * @returns {object}
 * @method Get
 */
export const editAdminProfile = async (req, res) => {
  try {
    const payload = req.body;
    const { userId: id } = req.user;
    const getUserDetail = await userModal.findById(id);
    if (!!getUserDetail === false) {
      throw new Error(`Please provide the valid user id`);
    }
    if (
      !!payload === true &&
      "countryCode" in payload &&
      "mobile" in payload &&
      !!payload["mobile"] === true &&
      !!payload["countryCode"] === true
    ) {
      let getCountryName = countriesRecord[payload.countryCode];
      if (
        isPossiblePhoneNumber(payload["mobile"] + "", getCountryName) ===
          false ||
        isValidPhoneNumber(payload["mobile"] + "", getCountryName) === false
      ) {
        throw new Error(`Please enter the valid mobile number`);
      }
    }
    if (
      !!payload === true &&
      "password" in payload &&
      !!payload["password"] === false
    ) {
      throw new Error(`Password should not empty`);
    }
    if (
      !!payload === true &&
      "email" in payload &&
      !!payload["email"] === false
    ) {
      throw new Error(`Email should not empty`);
    }
    if (
      !!payload === true &&
      "mobile" in payload &&
      !!payload["mobile"] === false
    ) {
      throw new Error(`Mobile should not empty`);
    }

    if (
      !!payload === true &&
      "firstName" in payload &&
      !!payload["firstName"] === false
    ) {
      throw new Error(`FirstName should not empty`);
    }

    if (
      !!payload === true &&
      "middleName" in payload &&
      !!payload["middleName"] === false
    ) {
      throw new Error(`MiddleName should not empty`);
    }
    if (
      !!payload === true &&
      "surName" in payload &&
      !!payload["surName"] === false
    ) {
      throw new Error(`SurName should not empty`);
    }
    if (
      !!payload === true &&
      "countryCode" in payload &&
      !!payload["countryCode"] === false
    ) {
      throw new Error(`CountryCode should not empty`);
    }
    if (
      !!payload === true &&
      "username" in payload &&
      !!payload["username"] === false
    ) {
      throw new Error(`Username should not empty`);
    }

    for await (const iterator of Object.keys(payload)) {
      let valueToUpdate = [
        "password",
        "email",
        "mobile",
        "firstName",
        "middleName",
        "surName",
        "countryCode",
        "username",
        "adminImg",
      ];
      if (valueToUpdate.includes(iterator) === false) {
        throw new Error(`You can only update ${valueToUpdate.join(" ,")}`);
      }
    }

    if (
      !!payload === true &&
      "username" in payload &&
      !!payload["username"] === true
    ) {
      await userModal.updateOne({ _id: id }, { uId: payload["username"] });
      delete payload.username;
    }

    if (
      !!payload === true &&
      "password" in payload &&
      !!payload["password"] === true
    ) {
      const originalText = cryptr.encrypt(payload["password"]);
      await userModal.updateOne({ _id: id }, { password: originalText });
      delete payload.password;
    }
    await userModal.updateOne({ _id: id }, { ...payload });

    return res.status(201).json({
      status: true,
      message: "Admin updated successfully",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * This function is used for update admin profile
 * @returns {object}
 * @method Get
 */
export const getAdminProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const getUserDetail = await userModal
      .findOne(
        { _id: userId },
        {
          email: 1,
          countryCode: 1,
          uId: 1,
          firstName: 1,
          middleName: 1,
          surName: 1,
          mobile: 1,
          adminImg: 1,
          fullName: 1,
        }
      )
      .lean();
    getUserDetail.phone = `${getUserDetail.countryCode}${getUserDetail.mobile}`;
    if (!!getUserDetail === false) {
      throw new Error("No data found");
    }
    return res.status(201).json({
      status: true,
      message: "Profile fetch successfully",
      data: getUserDetail,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadAdminImage = async (req, res) => {
  try {
    const { URL } = process.env;
    const { userId } = req.user;
    if (req.fileValidationError && !req.doesExists) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }

    const getImageDetail = await userModal.findById(userId);
    if (!!getImageDetail === true) {
      if (
        "adminImg" in getImageDetail &&
        getImageDetail["adminImg"]?.length > 0
      ) {
        const checkey = getImageDetail.adminImg.split("client-809/")[1];
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

    if (req.adminExists) {
      return res.status(404).json({ message: req.adminExists, status: false });
    }
    req.adminData.adminImg = URL + req.fileData;
    await req.adminData.save();

    return res.status(200).json({
      data: req.teacherData,
      status: true,
      message: "Admin profile updated",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};
