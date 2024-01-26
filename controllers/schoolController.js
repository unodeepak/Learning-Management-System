import schoolModal from "../modals/schoolModal.js";
import gradeModal from "../modals/gradeModal.js";
import divisionModal from "../modals/divisionModal.js";
import mongoose from "mongoose";
import { logger } from "../app.js";
import resultModal from "../modals/resultModal.js";
import teacherModal from "../modals/teacherModal.js";
import learnerModal from "../modals/learnerModal.js";
import aws from "aws-sdk";
import dotenv from "dotenv";
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
export const createSchool = async (req, res) => {
  const {
    schoolUid,
    schoolName,
    mobile,
    email,
    location,
    pinCode,
    city,
    state,
    country,
    websiteUrl,
    countryCode,
  } = req.body;
  try {
    let getCountryName = countriesRecord[countryCode];
    if (
      isPossiblePhoneNumber(mobile + "", getCountryName) === false ||
      isValidPhoneNumber(mobile + "", getCountryName) === false
    ) {
      throw new Error(`Please enter the valid mobile number`);
    }
    let schoolExists = await schoolModal.findOne({
      $or: [{ schoolUid }, { email }, { mobile }],
    });

    if (schoolExists) {
      if (schoolUid == schoolExists.schoolUid)
        return res.status(409).json({
          message: `School Already Exists with uid ${schoolUid}`,
          status: false,
        });

      if (email == schoolExists.email)
        return res.status(409).json({
          message: `School Already Exists with email ${email}`,
          status: false,
        });
      if (mobile == schoolExists.mobile)
        return res.status(409).json({
          message: `School Already Exists with mobile ${mobile}`,
          status: false,
        });
    }
    let schoolNamewithLocationExists = await schoolModal.findOne({
      $and: [{ schoolName }, { location }],
    });

    if (schoolNamewithLocationExists) {
      return res.status(409).json({
        message: `school already exist with schoolName and location`,
        status: false,
      });
    }
    const newSchool = await schoolModal.create({
      schoolUid,
      schoolName,
      mobile,
      email,
      location,
      pinCode,
      city,
      state,
      country,
      websiteUrl,
      countryCode,
      createdOn: new Date().getTime(),
    });
    let deleteRedishash = [
      "getAllSchool",
      "getAllLearner",
      "getLearnerByTeacher",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    if (newSchool) {
      return res.status(201).json({
        status: true,
        message: "the school successfully created",
        data: newSchool,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadSchoolLogo = async (req, res) => {
  try {
    const { URL } = process.env;
    if (req.fileValidationError && !req.doesExists) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }
    const getImageDetail = await schoolModal.findById(req.body.schoolId);
    if (!!getImageDetail === true) {
      if (
        "schoolLogoUrl" in getImageDetail &&
        getImageDetail["schoolLogoUrl"]?.length > 0
      ) {
        const checkey = getImageDetail.schoolLogoUrl.split("client-809/")[1];
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

    if (req.schoolExists) {
      return res.status(404).json({ message: req.schoolExists, status: false });
    }
    req.schoolData.schoolLogoUrl = URL + req.fileData;
    await req.schoolData.save();
    let deleteRedisHash = [
      "getAllSchool",
      "getAllLearner",
      "getLearnerByTeacher",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      data: req.schoolData,
      status: true,
      message: "the school has been updated",
    });
  } catch (err) {
    logger.error(`Error from function ${uploadSchoolLogo.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllSchool = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

    let queryObj = {};
    let getSchools = [];

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "schoolUid" ? "numericPart" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    let pipeline = [
      {
        $lookup: {
          from: "grades",
          localField: "_id",
          foreignField: "schoolId",
          as: "grades",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "_id",
          foreignField: "schoolId",
          as: "divisions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "schoolId",
          as: "usersData",
        },
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$schoolUid", "-"] }, 1],
            },
          },
          gradeCount: { $size: "$grades" },
          teacherCount: {
            $size: {
              $filter: {
                input: "$usersData",
                as: "usersData",
                cond: { $eq: ["$$usersData.role", "Teacher"] },
              },
            },
          },
          learnerCount: {
            $size: {
              $filter: {
                input: "$usersData",
                as: "usersData",
                cond: { $eq: ["$$usersData.role", "Learner"] },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          schoolUid: 1,
          schoolName: 1,
          location: 1,
          mobile: 1,
          email: 1,
          pinCode: 1,
          city: 1,
          state: 1,
          country: 1,
          countryCode: 1,
          divisionCount: 1,
          gradeCount: 1,
          usersData: 1,
          divisionCount: { $size: "$divisions" },
          usersData: { $size: "$usersData" },
          learnerCount: 1,
          disable: 1,
          createdOn: 1,
          updatedOn: 1,
          numericPart: 1,
          teacherCount: 1,
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
    ];

    if (search) {
      pipeline.unshift({
        $match: {
          $or: [
            {
              schoolUid: {
                $regex: search,
                $options: "i",
              },
            },
            {
              schoolName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
      queryObj.$or = [
        {
          schoolUid: {
            $regex: search,
            $options: "i",
          },
        },
        {
          schoolName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllSchool`,
      `getAllSchool_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      getSchools = redisData;
    } else {
      getSchools = await schoolModal.aggregate(pipeline);
      for (const iterator of getSchools) {
        if (
          !!iterator == true &&
          !!iterator.countryCode === true &&
          !!iterator.mobile === true
        ) {
          iterator.mobile = `${iterator.countryCode}${iterator.mobile}`;
        }
      }

      await redisHelper.setRedisHash(
        `getAllSchool`,
        `getAllSchool_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`,
        getSchools
      );
    }
    let totalLength = await schoolModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getSchools,
      status: true,
      message: "School retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllSchoolForDropDown = async (req, res) => {
  try {
    let schoolExists = await schoolModal
      .find({})
      .select("schoolName schoolUid");

    return res.status(200).json({
      status: true,
      message: "the school successfully retrieved",
      data: schoolExists,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllSchoolForDropDown.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editSchool = async (req, res) => {
  const {
    schoolId,
    schoolName,
    email,
    mobile,
    pinCode,
    city,
    state,
    country,
    location,
    websiteUrl,
    countryCode,
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
    let schoolExists = await schoolModal.findById(schoolId);

    if (!schoolExists) {
      return res.status(404).json({
        message: `school does not Exist with schoolId ${schoolId}`,
        status: false,
      });
    }

    if (!!email === true) {
      let schoolEmailExist = await schoolModal.findOne({ email: email });
      if (
        !!schoolEmailExist === true &&
        schoolEmailExist._id + "".substring(0) != schoolId
      ) {
        throw new Error("This email is already exist");
      }
    }
    if (!!mobile === true) {
      let schoolMobileExist = await schoolModal.findOne({ mobile: mobile });
      if (
        !!schoolMobileExist === true &&
        schoolMobileExist._id + "".substring(0) != schoolId
      ) {
        throw new Error("This mobile is already exist");
      }
    }

    if (schoolName || location) {
      let schoolNamewithLocationExists = await schoolModal.findOne({
        $and: [
          { schoolName: schoolName ? schoolName : schoolExists.schoolName },
          { location: location ? location : schoolExists.location },
        ],
      });

      if (schoolNamewithLocationExists) {
        if (
          schoolNamewithLocationExists._id.toString() !=
          schoolExists._id.toString()
        )
          return res.status(409).json({
            message: `school already exist with schoolName and location`,
            status: false,
          });
      }
    }
    schoolExists.schoolName = schoolName ? schoolName : schoolExists.schoolName;
    schoolExists.pinCode = pinCode ? pinCode : schoolExists.pinCode;
    schoolExists.city = city ? city : schoolExists.city;
    schoolExists.state = state ? state : schoolExists.state;
    schoolExists.country = country ? country : schoolExists.country;
    schoolExists.email = email ? email : schoolExists.email;
    schoolExists.mobile = mobile ? mobile : schoolExists.mobile;
    schoolExists.location = location ? location : schoolExists.location;
    schoolExists.websiteUrl = websiteUrl ? websiteUrl : schoolExists.websiteUrl;
    schoolExists.updatedOn = new Date().getTime();

    await schoolExists.save();
    let deleteRedishash = [
      "getAllSchool",
      "getAllLearner",
      "getLearnerByTeacher",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    if (schoolExists) {
      return res.status(200).json({
        status: true,
        message: "the school successfully updated",
        data: schoolExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableSchool = async (req, res) => {
  const { schoolId } = req.params;
  try {
    let schoolExists = await schoolModal.findById(schoolId);

    if (!schoolExists) {
      return res.status(404).json({
        message: `School does not Exist with schoolId ${schoolId}`,
        status: false,
      });
    }

    schoolExists.disable = schoolExists.disable ? false : true;
    await gradeModal.updateMany(
      { schoolId },
      { disable: schoolExists.disable ? true : false }
    );

    await divisionModal.updateMany(
      { schoolId },
      { disable: schoolExists.disable ? true : false }
    );

    await teacherModal.updateMany(
      { schoolId },
      { disable: schoolExists.disable ? true : false }
    );
    await learnerModal.updateMany(
      { schoolId },
      { disable: schoolExists.disable ? true : false }
    );
    await schoolExists.save();

    if (schoolExists) {
      return res.status(200).json({
        status: true,
        message: "the school successfully updated",
        data: schoolExists,
      });
    }
    let deleteRedishash = [
      "getAllSchool",
      "getAllLearner",
      "getLearnerByTeacher",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
  } catch (err) {
    logger.error(`Error from function ${disableSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteSchool = async (req, res) => {
  const { schoolIds } = req.body;
  try {
    for await (let schoolId of schoolIds) {
      if (!!mongoose.Types.ObjectId.isValid(schoolId) === false) {
        throw new Error(`Please provide the valid school id ${schoolId}`);
      }
      let schoolExists = await schoolModal.findById(schoolId);

      if (!schoolExists) {
        return res.status(404).json({
          message: `School does not Exist with schoolId ${schoolId}`,
          status: false,
        });
      }
      const learnerData = await learnerModal.find({ schoolId }).lean();
      let learnerIds = [];
      for (let learner of learnerData) {
        learnerIds.push(learner._id);
      }
      await gradeModal.deleteMany({ schoolId });
      await divisionModal.deleteMany({ schoolId });
      await resultModal.deleteMany({ learnerId: { $in: learnerIds } });
      await learnerModal.deleteMany({ schoolId });
      await teacherModal.deleteMany({ schoolId });
      await schoolExists.deleteOne();
    }
    let deleteRedishash = [
      "getAllSchool",
      "getAllLearner",
      "getLearnerByTeacher",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    return res.status(200).json({
      status: true,
      message: "the school successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidSchool = async (req, res) => {
  try {
    let schoolExists = await schoolModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!schoolExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "SCH-1",
      });
    }

    const lastUid = schoolExists.schoolUid;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "SCH-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    let schoolExists = await schoolModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(schoolId) } },
      {
        $lookup: {
          from: "grades",
          localField: "_id",
          foreignField: "schoolId",
          as: "grades",
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "_id",
          foreignField: "schoolId",
          as: "divisions",
        },
      },
      {
        $lookup: {
          from: "learners",
          localField: "_id",
          foreignField: "schoolId",
          as: "learners",
        },
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "schoolId",
          as: "teachers",
        },
      },
      {
        $project: {
          _id: 1,
          schoolUid: 1,
          schoolName: 1,
          location: 1,
          mobile: 1,
          email: 1,
          pinCode: 1,
          city: 1,
          state: 1,
          country: 1,
          schoolLogoUrl: 1,
          countryCode: 1,
          divisionCount: { $size: "$divisions" },
          gradeCount: { $size: "$grades" },
          teacherCount: { $size: "$teachers" },
          learnerCount: { $size: "$learners" },
          assessmentsCount: {
            $reduce: {
              input: "$divisions",
              initialValue: 0,
              in: {
                $add: ["$$value", { $size: "$$this.assessments" }],
              },
            },
          },

          coursesCount: {
            $reduce: {
              input: "$divisions",
              initialValue: 0,
              in: {
                $add: ["$$value", { $size: "$$this.courses" }],
              },
            },
          },
          websiteUrl: 1,
          disable: 1,
          createdOn: 1,
          updatedOn: 1,
        },
      },
    ]);
    schoolExists[0].phone = `${schoolExists[0].countryCode}${schoolExists[0].mobile}`;
    if (!!schoolExists === true) {
      let getLearnerCount = await learnerModal.countDocuments({
        schoolId: schoolId,
        role: "Learner",
        userRole: 3,
      });
      let getTeacherCount = await teacherModal.countDocuments({
        schoolId: schoolId,
        role: "Teacher",
        userRole: 2,
      });
      schoolExists[0].learnerCount = getLearnerCount;
      schoolExists[0].teacherCount = getTeacherCount;
    }
    if (schoolExists.length > 0)
      return res.status(200).json({
        status: true,
        message: "The school successfully retrieved",
        data: schoolExists[0],
      });

    return res.status(404).json({
      status: false,
      message: `School does not Exist with schoolId ${schoolId}`,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleSchool.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
