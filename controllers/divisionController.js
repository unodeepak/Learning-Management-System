import assessmentModal from "../modals/assessmentModal.js";
import divisionModal from "../modals/divisionModal.js";
import gradeModal from "../modals/gradeModal.js";
import learnerModal from "../modals/learnerModal.js";
import resultModal from "../modals/resultModal.js";
import teacherModal from "../modals/teacherModal.js";
import mongoose from "mongoose";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const createDivision = async (req, res) => {
  const { gradeId, divisionName, divisionUid } = req.body;
  try {
    let gradeExists = await gradeModal.findById(gradeId);

    if (!gradeExists) {
      return res.status(400).json({
        message: `Grade does not exist`,
        status: false,
      });
    }

    let divisionExists = await divisionModal.findOne({
      $or: [{ divisionUid }, { $and: [{ gradeId }, { divisionName }] }],
    });

    if (divisionExists) {
      if (divisionUid == divisionExists.divisionUid)
        return res.status(409).json({
          message: `Division Already Exists with divisionUid ${divisionUid}`,
          status: false,
        });

      if (divisionName == divisionExists.divisionName)
        return res.status(409).json({
          message: `Division Already Exists with divisionName ${divisionName}`,
          status: false,
        });
    }

    const gradeDetails = await gradeModal.findById(gradeId).lean();

    const newDivision = await divisionModal.create({
      schoolId: gradeDetails.schoolId,
      gradeId,
      divisionName,
      divisionUid,
      createdOn: new Date().getTime(),
    });

    gradeExists.divisions.unshift(newDivision._id);
    await gradeExists.save();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newDivision) {
      return res.status(201).json({
        status: true,
        message: "the division successfully created",
        data: newDivision,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editDivision = async (req, res) => {
  const { divisionId, divisionName } = req.body;
  try {
    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(404).json({
        message: `division does not exist with divisionId ${divisionId}`,
        status: false,
      });
    }

    let divisionNameExists = await divisionModal.findOne({
      $and: [{ gradeId: divisionExists.gradeId }, { divisionName }],
    });

    if (divisionNameExists) {
      if (divisionNameExists._id.toString() != divisionExists._id.toString()) {
        return res.status(409).json({
          message: `Division already exists with division name ${divisionName}`,
          status: false,
        });
      }
    }

    divisionExists.divisionName = divisionName;
    divisionExists.updatedOn = new Date().getTime();

    await divisionExists.save();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (divisionExists) {
      return res.status(200).json({
        status: true,
        message: "the division successfully updated",
        data: divisionExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllDivisionByGradeId = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    const { gradeId } = req.params;

    let queryObj = { gradeId };

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "divisionUid" ? "numericPart" : sortBys;
      sortBys = sortBys == "courses" ? "coursesCount" : sortBys;
      sortBys = sortBys == "assessments" ? "assessmentsCount" : sortBys;
    }

    let matchQuery = {
      $match: { gradeId: new mongoose.Types.ObjectId(gradeId) },
    };
    let getDivisions = [];

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
          gradeId: new mongoose.Types.ObjectId(gradeId),
          $or: [
            {
              divisionName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              divisionUid: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };
      queryObj.$or = [
        {
          divisionName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          divisionUid: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getDivisions = await divisionModal.aggregate([
      matchQuery,
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeNdivision.divisionId",
          as: "teachers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "divisionId",
          as: "learners",
        },
      },
      {
        $addFields: {
          assessmentsLength: { $size: "$assessments" },
          coursesLength: { $size: "$courses" },
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$divisionUid", "-"] }, 1],
            },
          },
        },
      },
      {
        $project: {
          divisionUid: 1,
          divisionName: 1,
          disable: 1,
          teacherCount: { $size: "$teachers" },
          learnerCount: { $size: "$learners" },
          createdOn: 1,
          assessmentsLength: 1,
          coursesLength: 1,
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
    ]);

    let totalLength = await divisionModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getDivisions,
      status: true,
      message: "Division retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllDivisionByGradeId.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ msg: err.message });
  }
};

export const getAllDivisionByGradeIdForDropDown = async (req, res) => {
  try {
    const { gradeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gradeId)) {
      return res.status(400).json({
        status: false,
        message: "Please provide correct grade details",
      });
    }
    let divisionExists = await divisionModal
      .find({ gradeId })
      .select("divisionName divisionUid");

    return res.status(200).json({
      status: true,
      message: "the division successfully retrieved",
      data: divisionExists,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllDivisionByGradeIdForDropDown.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableDivision = async (req, res) => {
  const { divisionId } = req.params;
  try {
    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(404).json({
        message: `Division does not Exist with divisionId ${divisionId}`,
        status: false,
      });
    }

    divisionExists.disable = divisionExists.disable ? false : true;

    await teacherModal.updateMany(
      { "gradeNdivision.divisionId": divisionId },
      { disable: divisionExists.disable ? true : false }
    );
    await learnerModal.updateMany(
      { divisionId },
      { disable: divisionExists.disable ? true : false }
    );
    await divisionExists.save();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (divisionExists) {
      return res.status(200).json({
        status: true,
        message: "the division successfully updated",
        data: divisionExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteDivision = async (req, res) => {
  const { divisionId } = req.params;
  try {
    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(404).json({
        message: `Division does not Exist with divisionId ${divisionId}`,
        status: false,
      });
    }
    const learnerData = await learnerModal.find({ divisionId }).lean();
    let learnerIds = [];
    for (let learner of learnerData) {
      learnerIds.push(learner._id);
    }
    await resultModal.deleteMany({ learnerId: { $in: learnerIds } });

    let gradeExists = await gradeModal.findById(divisionExists.gradeId);

    await teacherModal.deleteMany({ "gradeNdivision.divisionId": divisionId });
    await learnerModal.deleteMany({ divisionId });

    const index = gradeExists.divisions.indexOf(divisionId);
    if (index > -1) {
      //when element does not match it returns -1
      gradeExists.divisions.splice(index, 1);
    }

    await gradeExists.save();
    await divisionExists.deleteOne();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "the division successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidDivision = async (req, res) => {
  try {
    let divisionExists = await divisionModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!divisionExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "D-1",
      });
    }

    const lastUid = divisionExists.divisionUid;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "D-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleDivision = async (req, res) => {
  try {
    const { divisionId } = req.params;

    let divisionExists = await divisionModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(divisionId) } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "divisionId",
          as: "learners",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "gradeNdivision.divisionId",
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
      {
        $lookup: {
          from: "grades",
          localField: "gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      { $unwind: "$schoolData" },
      { $unwind: "$gradeData" },

      {
        $project: {
          _id: 1,
          schoolId: 1,
          schoolUid: "$schoolData.schoolUid",
          schoolName: "$schoolData.schoolName",
          location: "$schoolData.location",
          gradeId: 1,
          gradeUid: "$gradeData.gradeUid",
          gradeName: "$gradeData.gradeName",
          divisionUid: 1,
          divisionName: 1,
          teacherCount: { $size: "$teachers" },
          learnerCount: { $size: "$learners" },
          coursesCount: { $size: "$courses" },
          assessmentsCount: { $size: "$assessments" },

          disable: 1,
          createdOn: 1,
          updatedOn: 1,
        },
      },
    ]);

    if (divisionExists.length > 0)
      return res.status(200).json({
        status: true,
        message: "The division successfully retrieved",
        data: divisionExists[0],
      });

    return res.status(404).json({
      status: false,
      message: `Division does not Exist with divisionId ${divisionId}`,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getDivisionByTeacher = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

    const { teacherId } = req.params;

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
    const teacherDetails = await teacherModal.findById(teacherId).lean();
    if (!teacherDetails) {
      return res.status(404).json({
        message: `teacher does not exist with teacherId ${teacherId}`,
        status: false,
      });
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    const result = await teacherModal.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },
      {
        $unwind: { path: "$gradeNdivision", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: {
            divisionId: "$gradeNdivision.divisionId",
          },
          gradeId: { $first: "$gradeNdivision.gradeId" },
        },
      },
      {
        $project: {
          _id: 0,
          gradeId: "$gradeId",
          divisionId: "$_id.divisionId",
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
      { $unwind: "$divisionData" },
      {
        $lookup: {
          from: "grades",
          localField: "gradeId",
          foreignField: "_id",
          as: "gradeData",
        },
      },
      { $unwind: "$gradeData" },
      {
        $lookup: {
          from: "users",
          localField: "divisionData._id",
          foreignField: "divisionId",
          as: "learnerData",
        },
      },
      {
        $project: {
          uId: "$divisionData.divisionUid",
          divisionId: "$divisionData._id",
          gradeName: "$gradeData.gradeName",
          divisionName: "$divisionData.divisionName",
          learnerCount: { $size: "$learnerData" },
          courses: { $size: "$divisionData.courses" },
          assessments: { $size: "$divisionData.assessments" },
          disable: "$divisionData.disable",
        },
      },
      {
        $sort: {
          [sortBys]: sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
    ]);

    return res.status(200).json({
      message: `the division retrived`,
      data: result,
      status: true,
      totalLength: teacherDetails.gradeNdivision.length,
    });
  } catch (err) {
    logger.error(`Error from function ${getDivisionByTeacher.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ msg: err.message });
  }
};

export const removeDivisionFromAssessment = async (req, res) => {
  try {
    const { divisionId, assessmentId, originalAssessmentId } = req.body;

    let assessmentExists = await assessmentModal.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessmentId ${assessmentId}`,
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

    const divisionIndex =
      assessmentExists.assignedDivisions.indexOf(divisionId);
    if (divisionIndex > -1) {
      //when element does not match it returns -1
      assessmentExists.assignedDivisions.splice(divisionIndex, 1);
    }

    const assessmentIndex = divisionExists.assessments.findIndex(
      (assessment) => assessment.assessmentId.toString() === assessmentId
    );
    if (assessmentIndex > -1) {
      //when element does not match it returns -1
      divisionExists.assessments.splice(assessmentIndex, 1);
    }
    await learnerModal.updateMany(
      { divisionId: divisionId, "assessments.assessmentId": assessmentId },
      { $pull: { assessments: { assessmentId } } }
    );
    await teacherModal.updateMany(
      {
        "gradeNdivision.divisionId": divisionId,
        "assessmentsForAssess.assessmentId": assessmentId,
      },
      { $pull: { assessmentsForAssess: { assessmentId } } }
    );

    const getoldAssessmentCount = await assessmentModal
      .findById(originalAssessmentId)
      .lean();
    if (!!getoldAssessmentCount === true) {
      await assessmentModal.updateOne(
        { _id: originalAssessmentId },
        { subAssessmentCount: getoldAssessmentCount.subAssessmentCount - 1 }
      );
    }
    await assessmentExists.save();
    await divisionExists.save();
    let deleteRedisHash = ["getAllLearner", "getLearnerByTeacher"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "The division has been removed successfully from assessment",
    });
  } catch (err) {
    logger.error(`Error from function ${removeDivisionFromAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
