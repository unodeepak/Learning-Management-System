import gradeModal from "../modals/gradeModal.js";
import schoolModal from "../modals/schoolModal.js";
import divisionModal from "../modals/divisionModal.js";
import learnerModal from "../modals/learnerModal.js";
import teacherModal from "../modals/teacherModal.js";
import resultModal from "../modals/resultModal.js";
import mongoose from "mongoose";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const createGrade = async (req, res) => {
  const { schoolId, gradeName, gradeUid } = req.body;
  try {
    let schoolExists = await schoolModal.findById(schoolId);
    if (!schoolExists) {
      return res.status(400).json({
        message: `School does not exist`,
        status: false,
      });
    }
    let gradeExists = await gradeModal.findOne({
      $or: [{ gradeUid }, { $and: [{ schoolId }, { gradeName }] }],
    });

    if (gradeExists) {
      if (gradeUid == gradeExists.gradeUid)
        return res.status(409).json({
          message: `Grade Already Exists with uid ${gradeUid}`,
          status: false,
        });

      if (gradeName == gradeExists.gradeName)
        return res.status(409).json({
          message: `Grade Already Exists with gradeName ${gradeName}`,
          status: false,
        });
    }

    const newGrade = await gradeModal.create({
      schoolId,
      gradeName,
      gradeUid,
      createdOn: new Date().getTime(),
    });

    schoolExists.grades.unshift(newGrade._id);
    await schoolExists.save();
    let deleteRedishash = ["getAllSchool", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    if (newGrade) {
      return res.status(201).json({
        status: true,
        message: "the grade successfully created",
        data: newGrade,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllGradeBySchoolId = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    const { schoolId } = req.params;

    let sortBys = "_id";
    let sortTypes = 1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "gradeUid" ? "numericPart" : sortBys;
      sortBys = sortBys == "courses" ? "coursesLength" : sortBys;
      sortBys = sortBys == "assessments" ? "assessmentsLength" : sortBys;
    }

    let queryObj = { schoolId };
    let matchQuery = {
      $match: { schoolId: new mongoose.Types.ObjectId(schoolId) },
    };
    let getGrades = [];

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    if (search) {
      matchQuery = {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          $or: [
            {
              gradeName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              gradeUid: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };
      queryObj.$or = [
        {
          gradeName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          gradeUid: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getGrades = await gradeModal.aggregate([
      matchQuery,
      {
        $lookup: {
          from: "divisions",
          localField: "_id",
          foreignField: "gradeId",
          as: "divisions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeNdivision.gradeId",
          as: "teachers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeId",
          as: "learners",
        },
      },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$gradeUid", "-"] }, 1],
            },
          },
          assessmentsLength: { $size: "$assessments" },
          coursesLength: { $size: "$courses" },
        },
      },
      {
        $project: {
          _id: 1,
          schoolId: 1,
          gradeName: 1,
          gradeUid: 1,
          assessmentsLength: 1,
          coursesLength: 1,
          numericPart: 1,
          divisionCount: { $size: "$divisions" },
          teacherCount: { $size: "$teachers" },
          learnerCount: { $size: "$learners" },
          createdOn: 1,
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
    let totalLength = await gradeModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getGrades,
      status: true,
      message: "Grade retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllGradeBySchoolId.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ msg: err.message });
  }
};

export const getAllGradeBySchoolIdForDropDown = async (req, res) => {
  try {
    const { schoolId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        status: false,
        message: "Please provide correct school details",
      });
    }
    let gradeExists = await gradeModal
      .find({ schoolId })
      .select("gradeName gradeUid");

    return res.status(200).json({
      status: true,
      message: "the grade successfully retrieved",
      data: gradeExists,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllGradeBySchoolIdForDropDown.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editGrade = async (req, res) => {
  const { gradeId, gradeName } = req.body;
  try {
    let gradeExists = await gradeModal.findById(gradeId);

    if (!gradeExists) {
      return res.status(404).json({
        message: `grade does not exist with gradeId ${gradeId}`,
        status: false,
      });
    }

    let gradeNameExists = await gradeModal.findOne({
      $and: [{ schoolId: gradeExists.schoolId }, { gradeName }],
    });

    if (gradeNameExists) {
      if (gradeNameExists._id.toString() != gradeExists._id.toString()) {
        return res.status(409).json({
          message: `Grade already exists with grade name ${gradeName}`,
          status: false,
        });
      }
    }

    gradeExists.gradeName = gradeName;
    gradeExists.updatedOn = new Date().getTime();

    await gradeExists.save();
    let deleteRedishash = ["getAllSchool", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    if (gradeExists) {
      return res.status(200).json({
        status: true,
        message: "the grade successfully updated",
        data: gradeExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editGrade.name}`, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableGrade = async (req, res) => {
  const { gradeId } = req.params;
  try {
    let gradeExists = await gradeModal.findById(gradeId);

    if (!gradeExists) {
      return res.status(404).json({
        message: `Grade does not Exist with gradeId ${gradeId}`,
        status: false,
      });
    }

    gradeExists.disable = gradeExists.disable ? false : true;

    await divisionModal.updateMany(
      { gradeId },
      { disable: gradeExists.disable ? true : false }
    );

    await teacherModal.updateMany(
      { "gradeNdivision.gradeId": gradeId },
      { disable: gradeExists.disable ? true : false }
    );
    await learnerModal.updateMany(
      { gradeId },
      { disable: gradeExists.disable ? true : false }
    );
    await gradeExists.save();
    let deleteRedishash = ["getAllSchool", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    if (gradeExists) {
      return res.status(200).json({
        status: true,
        message: "the grade successfully updated",
        data: gradeExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteGrade = async (req, res) => {
  const { gradeId } = req.params;
  try {
    let gradeExists = await gradeModal.findById(gradeId);

    if (!gradeExists) {
      return res.status(404).json({
        message: `Grade does not Exist with gradeId ${gradeId}`,
        status: false,
      });
    }
    const learnerData = await learnerModal.find({ gradeId }).lean();
    let learnerIds = [];
    for (let learner of learnerData) {
      learnerIds.push(learner._id);
    }
    await divisionModal.deleteMany({ gradeId });
    await resultModal.deleteMany({ learnerId: { $in: learnerIds } });
    await teacherModal.deleteMany({ "gradeNdivision.gradeId": gradeId });
    await learnerModal.deleteMany({ gradeId });

    await gradeExists.deleteOne();
    let deleteRedishash = ["getAllSchool", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedishash);
    return res.status(200).json({
      status: true,
      message: "the grade successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidGrade = async (req, res) => {
  try {
    let gradeExists = await gradeModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!gradeExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "G-1",
      });
    }

    const lastUid = gradeExists.gradeUid;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "G-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleGrade = async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { sortBy, sortType } = req.query;
    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    let gradeExists = await gradeModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(gradeId) } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeId",
          as: "learners",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeNdivision.gradeId",
          as: "teachers",
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
      { $unwind: "$schoolData" },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$gradeUid", "-"] }, 1],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          schoolId: 1,
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          location: "$schoolData.location",
          gradeUid: 1,
          gradeName: 1,
          mobile: 1,
          email: 1,
          pinCode: 1,
          city: 1,
          state: 1,
          country: 1,
          divisionCount: { $size: "$divisions" },
          teacherCount: { $size: "$teachers" },
          learnerCount: { $size: "$learners" },
          coursesCount: { $size: "$courses" },
          assessmentsCount: { $size: "$assessments" },
          disable: 1,
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
    ]);

    if (gradeExists.length > 0)
      return res.status(200).json({
        status: true,
        message: "The grade successfully retrieved",
        data: gradeExists[0],
      });

    return res.status(404).json({
      status: false,
      message: `School does not Exist with schoolId ${schoolId}`,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
