import assessmentModal from "../modals/assessmentModal.js";
import subSkillModal from "../modals/subSkillModal.js";
import learnerModal from "../modals/learnerModal.js";
import gradeModal from "../modals/gradeModal.js";
import divisionModal from "../modals/divisionModal.js";
import resultModal from "../modals/resultModal.js";
import mongoose from "mongoose";
import userModal from "../modals/userModal.js";
import teacherModal from "../modals/teacherModal.js";
import { addNotification } from "../controllers/notificationController.js";
import { logger } from "../app.js";
import { sentEmail } from "./emailController.js";

import rabbitMqHelper from "../helpers/rebbitMqHelper.js";
import fs from "fs";
import ejs from "ejs";
import path from "path";
import moment1 from "moment-timezone";
import { log } from "console";
import redisHelper from "../helpers/redis.js";

export const createAssessment = async (req, res) => {
  const { uId, assessmentName, assessmentDesc, subSkillId } = req.body;
  try {
    let subSkillExists = await subSkillModal.findById(subSkillId);
    if (!subSkillExists) {
      return res.status(404).json({
        message: `Subskill does not Exist with subSkillId ${subSkillId}`,
        status: false,
      });
    }
    let assessmentExists = await assessmentModal.findOne({
      $or: [{ uId }, { assessmentName }],
    });

    if (assessmentExists) {
      if (uId == assessmentExists.uId)
        return res.status(409).json({
          message: `assessment already Exists with uid ${uId}`,
          status: false,
        });

      if (assessmentName == assessmentExists.assessmentName)
        return res.status(409).json({
          message: `assessment already Exists with assessment Name ${assessmentName}`,
          status: false,
        });
    }
    const newAssessment = await assessmentModal.create({
      uId,
      assessmentName,
      assessmentDesc,
      subSkillId,
      createdOn: new Date().getTime(),
    });
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAssessmentByTeacherForTeacher",
      "getAllNotAssignedAssessment",
      "getAllAssignedAssessment",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newAssessment) {
      return res.status(201).json({
        status: true,
        message: "the assessment successfully created",
        data: newAssessment,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const editAssessment = async (req, res) => {
  const { assessmentId, assessmentName, assessmentDesc } = req.body;
  try {
    let assessmentExists = await assessmentModal.findById(assessmentId);

    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessment ${assessmentId}`,
        status: false,
      });
    }

    let assessmentNameExists = await assessmentModal.findOne({
      assessmentName,
    });

    if (assessmentNameExists) {
      if (
        assessmentNameExists._id.toString() != assessmentExists._id.toString()
      ) {
        return res.status(409).json({
          message: `Assessment already exists with assessment Name ${assessmentName}`,
          status: false,
        });
      }
    }
    assessmentExists.assessmentName = assessmentName
      ? assessmentName
      : assessmentExists.assessmentName;
    assessmentExists.assessmentDesc = assessmentDesc
      ? assessmentDesc
      : assessmentExists.assessmentDesc;

    await assessmentExists.save();
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllNotAssignedAssessment",
      "getAllAssignedAssessment",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(201).json({
      status: true,
      message: "the assessment successfully updated",
      data: assessmentExists,
    });
  } catch (err) {
    logger.error(`Error from function ${editAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  try {
    let assessmentExists = await assessmentModal.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessment ${assessmentId}`,
        status: false,
      });
    }

    assessmentExists.disable = assessmentExists.disable ? false : true;

    await gradeModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $set: { "assessments.$.disable": assessmentExists.disable } }
    );
    await divisionModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $set: { "assessments.$.disable": assessmentExists.disable } }
    );
    await learnerModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $set: { "assessments.$.disable": assessmentExists.disable } }
    );

    await teacherModal.updateMany(
      { "assessmentsForAssess.assessmentId": assessmentId },
      { $set: { "assessmentsForAssess.$.disable": assessmentExists.disable } }
    );

    await assessmentExists.save();
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllNotAssignedAssessment",
      "getAssessmentByTeacherForTeacher",
      "getAllAssignedAssessment",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "the assessment successfully updated",
      data: assessmentExists,
    });
  } catch (err) {
    logger.error(`Error from function ${disableAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteAssessment = async (req, res) => {
  const { assessmentId, originalAssessmentId } = req.params;
  try {
    let assessmentExists = await assessmentModal.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessment ${assessmentId}`,
        status: false,
      });
    }

    // await resultModal.deleteMany({ assessmentId });
    await gradeModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $pull: { assessments: { assessmentId } } }
    );
    await divisionModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $pull: { assessments: { assessmentId } } }
    );
    await learnerModal.updateMany(
      { "assessments.assessmentId": assessmentId },
      { $pull: { assessments: { assessmentId } } }
    );

    await teacherModal.updateMany(
      { "assessmentsForAssess.assessmentId": assessmentId },
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
    await assessmentModal.deleteOne({ _id: assessmentId });
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllNotAssignedAssessment",
      ,
      "getAssessmentByTeacherForTeacher",
      "getAllAssignedAssessment",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "the assessment successfully deleted",
    });
  } catch (err) {
    logger.error(`Error from function ${deleteAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllNotAssignedAssessmentForAssign = async (req, res) => {
  try {
    const { pagination, page, limit, search } = req.query;
    let queryObj = {
      assigned: false,
      disable: false,
      isDeleted: false,
    };

    let getAssessment = [];

    if (search) {
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          assessmentName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    getAssessment = assessmentModal
      .find(queryObj)
      .select("assessmentName uId subAssessmentCount originalAssessmentId");

    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;

    if (pagination) {
      let skip = (pageValue - 1) * limit;
      getAssessment = getAssessment
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limitValue);
    }

    getAssessment = await getAssessment;

    let totalLength = await assessmentModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getAssessment,
      status: true,
      message: "Assessment retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAllNotAssignedAssessmentForAssign.name}`,
      { stack: err.stack }
    );
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllNotAssignedAssessment = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

    let queryObj = {
      $match: {
        assigned: false,
        isDeleted: false,
      },
    };

    let queryObj2 = {
      assigned: false,
      isDeleted: false,
    };
    let getAssessment = [];

    if (search) {
      queryObj = {
        $match: {
          assigned: false,
          $or: [
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              assessmentName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      };

      queryObj2.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          assessmentName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

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

    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllNotAssignedAssessment`,
      `getAllNotAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      getAssessment = redisData;
    } else {
      getAssessment = await assessmentModal.aggregate([
        queryObj,
        {
          $lookup: {
            from: "subskills",
            localField: "subSkillId",
            foreignField: "_id",
            as: "subSkillData",
          },
        },
        {
          $unwind: { path: "$subSkillData", preserveNullAndEmptyArrays: true },
        },
        {
          $addFields: {
            totalMarks: {
              $sum: "$subSkillData.rubricsQts.quesMarks",
            },
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
            assessmentName: 1,
            createdOn: 1,
            subAssessmentCount: 1,
            originalAssessmentId: 1,
            totalMarks: 1,
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
      await redisHelper.setRedisHash(
        `getAllNotAssignedAssessment`,
        `getAllNotAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`,
        getAssessment
      );
    }
    let totalLength = await assessmentModal.countDocuments(queryObj2);
    return res.status(200).json({
      data: getAssessment,
      status: true,
      message: "Assessment retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllNotAssignedAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllAssignedAssessment = async (req, res) => {
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
    let redisData;
    let matchQuery = {
      $match: {
        assigned: true,
        isDeleted: false,
      },
    };

    let queryObj = {
      assigned: true,
      isDeleted: false,
    };

    let getAssessment = [];

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

    if (search) {
      matchQuery = {
        $match: {
          assigned: true,
          $or: [
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              assessmentName: {
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
          assessmentName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys === "uId" ? "numericPart" : sortBys;
    }

    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
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
          `getAllAssignedAssessment`,
          `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getAssessment = redisData;
        } else {
          getAssessment = await assessmentModal.aggregate([
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
                from: "subskills",
                localField: "subSkillId",
                foreignField: "_id",
                as: "subSkillData",
              },
            },
            {
              $unwind: {
                path: "$subSkillData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                totalMarks: {
                  $sum: "$subSkillData.rubricsQts.quesMarks",
                },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
              },
            },

            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "assessments.assessmentId",
                as: "userData",
              },
            },
            {
              $addFields: {
                assessmentCounts: {
                  $map: {
                    input: "$userData",
                    as: "user",
                    in: {
                      userId: "$$user._id",
                      trueCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", true] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                      falseCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", false] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                    },
                  },
                },
              },
            },

            {
              $addFields: {
                totalTrueCount: { $sum: "$assessmentCounts.trueCount" },
                totalFalseCount: { $sum: "$assessmentCounts.falseCount" },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                status: {
                  $cond: [
                    { $eq: ["$totalTrueCount", "$totalFalseCount"] },
                    true,
                    false,
                  ],
                },
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
          await redisHelper.setRedisHash(
            `getAllAssignedAssessment`,
            `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getAssessment
          );
        }
        break;
      case 2:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedAssessment`,
          `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getAssessment = redisData;
        } else {
          getAssessment = await assessmentModal.aggregate([
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
                from: "subskills",
                localField: "subSkillId",
                foreignField: "_id",
                as: "subSkillData",
              },
            },
            {
              $unwind: {
                path: "$subSkillData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                totalMarks: {
                  $sum: "$subSkillData.rubricsQts.quesMarks",
                },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "assessments.assessmentId",
                as: "userData",
              },
            },
            {
              $addFields: {
                assessmentCounts: {
                  $map: {
                    input: "$userData",
                    as: "user",
                    in: {
                      userId: "$$user._id",
                      trueCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", true] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                      falseCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", false] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                    },
                  },
                },
              },
            },

            {
              $addFields: {
                totalTrueCount: { $sum: "$assessmentCounts.trueCount" },
                totalFalseCount: { $sum: "$assessmentCounts.falseCount" },
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
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                numericPart: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                status: {
                  $cond: [
                    { $eq: ["$totalTrueCount", "$totalFalseCount"] },
                    true,
                    false,
                  ],
                },
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
          await redisHelper.setRedisHash(
            `getAllAssignedAssessment`,
            `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getAssessment
          );
        }
        break;
      case 3:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedAssessment`,
          `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getAssessment = redisData;
        } else {
          getAssessment = await assessmentModal.aggregate([
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
                from: "subskills",
                localField: "subSkillId",
                foreignField: "_id",
                as: "subSkillData",
              },
            },
            {
              $unwind: {
                path: "$subSkillData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                totalMarks: {
                  $sum: "$subSkillData.rubricsQts.quesMarks",
                },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "assessments.assessmentId",
                as: "userData",
              },
            },
            {
              $addFields: {
                assessmentCounts: {
                  $map: {
                    input: "$userData",
                    as: "user",
                    in: {
                      userId: "$$user._id",
                      trueCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", true] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                      falseCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", false] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                    },
                  },
                },
              },
            },

            {
              $addFields: {
                totalTrueCount: { $sum: "$assessmentCounts.trueCount" },
                totalFalseCount: { $sum: "$assessmentCounts.falseCount" },
              },
            },
            {
              $project: {
                _id: 1,
                uId: 1,
                assessmentName: 1,
                assessmentDesc: 1,
                assigned: 1,
                subSkillId: 1,
                disable: 1,
                createdOn: 1,
                updatedOn: 1,
                assignedDivisions: 1,
                assignedGrade: 1,
                totalMarks: 1,
                originalAssessmentId: 1,
                subAssessmentCount: 1,
                status: {
                  $cond: [
                    { $eq: ["$totalTrueCount", "$totalFalseCount"] },
                    true,
                    false,
                  ],
                },
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
          await redisHelper.setRedisHash(
            `getAllAssignedAssessment`,
            `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getAssessment
          );
        }
        break;
      case 4:
        redisData = await redisHelper.getDataFromRedisHash(
          `getAllAssignedAssessment`,
          `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`
        );
        if (Array.isArray(redisData) && redisData != false) {
          getAssessment = redisData;
        } else {
          getAssessment = await assessmentModal.aggregate([
            matchQuery,
            {
              $lookup: {
                from: "subskills",
                localField: "subSkillId",
                foreignField: "_id",
                as: "subSkillData",
              },
            },
            {
              $unwind: {
                path: "$subSkillData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                totalMarks: {
                  $sum: "$subSkillData.rubricsQts.quesMarks",
                },
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
                assessmentName: 1,
                createdOn: 1,
                totalMarks: 1,
                originalAssessmentId: 1,
                numericPart: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "assessments.assessmentId",
                as: "userData",
              },
            },
            {
              $addFields: {
                assessmentCounts: {
                  $map: {
                    input: "$userData",
                    as: "user",
                    in: {
                      userId: "$$user._id",
                      trueCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", true] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                      falseCount: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$$user.assessments",
                              as: "assessment",
                              cond: { $eq: ["$$assessment.completion", false] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", 1] },
                        },
                      },
                    },
                  },
                },
              },
            },

            {
              $addFields: {
                totalTrueCount: { $sum: "$assessmentCounts.trueCount" },
                totalFalseCount: { $sum: "$assessmentCounts.falseCount" },
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
                assessmentName: 1,
                createdOn: 1,
                originalAssessmentId: 1,
                numericPart: 1,
                totalMarks: 1,
                status: {
                  $cond: [
                    { $eq: ["$totalTrueCount", "$totalFalseCount"] },
                    true,
                    false,
                  ],
                },
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
          await redisHelper.setRedisHash(
            `getAllAssignedAssessment`,
            `getAllAssignedAssessment_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${schoolId}_${gradeId}_${divisionId}`,
            getAssessment
          );
        }
    }

    let totalLength = await assessmentModal.countDocuments(queryObj);
    return res.status(200).json({
      data: getAssessment,
      status: true,
      message: "Assessment retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllAssignedAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getUidAssessment = async (req, res) => {
  try {
    let assessmentExists = await assessmentModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!assessmentExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "A-1",
      });
    }

    const lastUid = assessmentExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "A-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    let assessmentExists = await assessmentModal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(assessmentId) } },
      {
        $lookup: {
          from: "subskills",
          localField: "subSkillId",
          foreignField: "_id",
          as: "subSkillData",
        },
      },
      { $unwind: { path: "$subSkillData", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalMarks: {
            $sum: "$subSkillData.rubricsQts.quesMarks",
          },
        },
      },

      {
        $lookup: {
          from: "skills",
          localField: "subSkillData.skillId",
          foreignField: "_id",
          as: "subSkillData.skillData",
        },
      },
      {
        $unwind: {
          path: "$subSkillData.skillData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    if (assessmentExists.length > 0)
      return res.status(200).json({
        status: true,
        message: "The assessment successfully retrieved",
        data: assessmentExists[0],
      });

    return res.status(404).json({
      message: `Assessment does not Exist with assessmentId ${assessmentId}`,
      status: false,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const assignAssessmentToGrade = async (req, res) => {
  try {
    const { assessmentId, gradeId, uId, assessmentName, originalAssessmentId } =
      req.body;

    let assessmentExists = await assessmentModal.findById(assessmentId);

    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessmentId ${assessmentId}`,
        status: false,
      });
    }

    let assessmentNameUIDExists = await assessmentModal.findOne({
      $or: [{ uId }, { assessmentName }],
    });

    if (assessmentNameUIDExists) {
      if (uId == assessmentNameUIDExists.uId)
        return res.status(409).json({
          message: `Assessment already exists with uid ${uId}`,
          status: false,
        });

      if (assessmentName == assessmentNameUIDExists.assessmentName)
        return res.status(409).json({
          message: `Assessment already exists with assessmentName ${assessmentName}`,
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
    const createAssessment = await assessmentModal.create({
      assigned: true,
      assessmentName,
      uId,
      assessmentDesc: assessmentExists.assessmentDesc,
      subSkillId: assessmentExists.subSkillId,
      assignedGrade: gradeExists._id,
      assignedDivisions: gradeExists.divisions,
      originalAssessmentId,
      createdOn: new Date().getTime(),
    });

    gradeExists.assessments.unshift({
      assessmentId: createAssessment._id,
      assignedOn: new Date().getTime(),
    });

    await gradeExists.save();
    await divisionModal.updateMany(
      { gradeId },
      {
        $addToSet: {
          assessments: {
            assessmentId: createAssessment._id,
            assignedOn: new Date().getTime(),
          },
        },
      }
    );
    await learnerModal.updateMany(
      { gradeId },
      {
        $addToSet: {
          assessments: {
            assessmentId: createAssessment._id,
            assignedOn: new Date().getTime(),
          },
        },
      }
    );
    await teacherModal.updateMany(
      { "gradeNdivision.gradeId": gradeId },
      {
        $addToSet: {
          assessmentsForAssess: {
            assessmentId: createAssessment._id,
            assignedOn: new Date().getTime(),
          },
        },
      }
    );
    const getAllLerner = await learnerModal.find({ gradeId: gradeId });

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
        payload.isAssessment = true;
        payload.isCourse = false;
        message.notification = {
          title: "New Assessment",
          body: `Assessment ${assessmentName} has been assigned`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Assessment Assigned",
          assessmentId: new mongoose.Types.ObjectId(createAssessment._id),
        };
        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.assessmentName = assessmentName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/assessmentAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New AssessmentName Assignment ${assessmentName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
    }

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
        payload.isAssessment = true;
        payload.isCourse = false;
        message.notification = {
          title: "New Assessment",
          body: `Assessment ${assessmentName} has been assigned`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Assessment Assigned",
          assessmentId: new mongoose.Types.ObjectId(createAssessment._id),
        };
        addNotification.emit("addNotification", payload);
        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.assessmentName = assessmentName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/assessmentAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New AssessmentName Assignment ${assessmentName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
    }
    const getoldAssessmentCount = await assessmentModal
      .findById(originalAssessmentId)
      .lean();
    if (!!getoldAssessmentCount == true) {
      await assessmentModal.updateOne(
        { _id: originalAssessmentId },
        { subAssessmentCount: getoldAssessmentCount.subAssessmentCount + 1 }
      );
    }
    let deleteRedisHash = [
      "getAllLearner",
      "getAllTeacher",
      "getAllNotAssignedAssessment",
      "getAssessmentByTeacherForTeacher",
      "getAllAssignedAssessment",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res.status(200).json({
      status: true,
      message: "The assessment has been assigned to grade successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${assignAssessmentToGrade.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const assignAssessmentToDivision = async (req, res) => {
  try {
    const {
      assessmentId,
      divisionId,
      uId,
      assessmentName,
      originalAssessmentId,
    } = req.body;

    let assessmentExists = await assessmentModal.findById(assessmentId);

    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessmentId ${assessmentId}`,
        status: false,
      });
    }

    let assessmentNameUIDExists = await assessmentModal.findOne({
      $or: [{ uId }, { assessmentName }],
    });

    if (assessmentNameUIDExists) {
      if (uId == assessmentNameUIDExists.uId)
        return res.status(409).json({
          message: `Assessment already exists with uid ${uId}`,
          status: false,
        });

      if (assessmentName == assessmentNameUIDExists.assessmentName)
        return res.status(409).json({
          message: `Assessment already exists with assessmentName ${assessmentName}`,
          status: false,
        });
    }

    let divisionExists = await divisionModal.findById(divisionId);

    if (!divisionExists) {
      return res.status(404).json({
        message: `Division does not exist with divisionId ${divisionId}`,
        status: false,
      });
    }
    const createAssessment = await assessmentModal.create({
      assigned: true,
      assessmentName,
      uId,
      assessmentDesc: assessmentExists.assessmentDesc,
      subSkillId: assessmentExists.subSkillId,
      assignedDivisions: [divisionId],
      originalAssessmentId,
      createdOn: new Date().getTime(),
    });
    divisionExists.assessments.unshift({
      assessmentId: createAssessment._id,
      assignedOn: new Date().getTime(),
    });

    await divisionExists.save();
    await learnerModal.updateMany(
      { divisionId },
      {
        $addToSet: {
          assessments: {
            assessmentId: createAssessment._id,
            assignedOn: new Date().getTime(),
          },
        },
      }
    );
    await teacherModal.updateMany(
      { "gradeNdivision.divisionId": divisionId },
      {
        $addToSet: {
          assessmentsForAssess: {
            assessmentId: createAssessment._id,
            assignedOn: new Date().getTime(),
          },
        },
      }
    );

    const getAllLerner = await learnerModal.find({
      divisionId: divisionId,
      role: "Learner",
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
        payload.isAssessment = true;
        payload.isCourse = false;
        message.notification = {
          title: "New Assessment",
          body: `Assessment ${assessmentName} has been assigned`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Assessment Assigned",
          assessmentId: new mongoose.Types.ObjectId(createAssessment._id),
        };
        addNotification.emit("addNotification", payload);

        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.assessmentName = assessmentName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/assessmentAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New AssessmentName Assignment ${assessmentName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
    }

    const getAllTeacher = await teacherModal.find({
      "gradeNdivision.divisionId": new mongoose.Types.ObjectId(divisionId),
      role: "Teacher",
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
        payload.isAssessment = true;
        payload.isCourse = false;
        message.notification = {
          title: "New Assessment",
          body: `Assessment ${assessmentName} has been assigned`,
          date: new Date().getTime(),
        };
        message.data = {
          type: "Assessment Assigned",
          assessmentId: new mongoose.Types.ObjectId(createAssessment._id),
        };
        addNotification.emit("addNotification", payload);
        if (process.env.SENTEMAIL === "true") {
          // This point is used to sent email Registration Email
          let registerEmailPayload = {};
          registerEmailPayload.name = iterator.fullName;
          registerEmailPayload.assessmentName = assessmentName;
          registerEmailPayload.createdOn = moment1()
            .tz("Asia/Kolkata")
            .format("DD-MM-YYYY");
          let filePath = path.join(
            process.cwd(),
            "./middleware/emailTemplate/assessmentAssigned.ejs"
          );
          let source = fs.readFileSync(filePath, "utf-8").toString();
          const htmlToSent = ejs.render(source, registerEmailPayload);
          registerEmailPayload.email = iterator?.email;
          registerEmailPayload.subject = `New AssessmentName Assignment ${assessmentName}`;
          registerEmailPayload.html = htmlToSent;
          await rabbitMqHelper.produceQueue(registerEmailPayload);
        }
      }
      const getoldAssessmentCount = await assessmentModal
        .findById(originalAssessmentId)
        .lean();
      if (!!getoldAssessmentCount === true) {
        await assessmentModal.updateOne(
          { _id: originalAssessmentId },
          { subAssessmentCount: getoldAssessmentCount.subAssessmentCount + 1 }
        );
      }
      let deleteRedisHash = [
        "getAllLearner",
        "getAllTeacher",
        "getAssessmentByTeacherForTeacher",
        "getAllNotAssignedAssessment",
        "getAllAssignedAssessment",
      ];
      await redisHelper.delDataFromRedisHash(deleteRedisHash);
      return res.status(200).json({
        status: true,
        message: "The assessment has been assigned to division successfully",
      });
    }
  } catch (err) {
    logger.error(`Error from function ${assignAssessmentToDivision.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const assessLearnerByAnAssessment = async (req, res) => {
  try {
    const { learnerId, assessmentId, rubricsQts, teacherId } = req.body;

    let assessmentExists = await assessmentModal.findById(assessmentId);
    let learnerExists = await learnerModal.findById(learnerId);
    let subSkillExists = await subSkillModal
      .findById(assessmentExists.subSkillId)
      .populate("skillId");

    if (!assessmentExists) {
      return res.status(404).json({
        message: `Assessment does not Exist with assessmentId ${assessmentId}`,
        status: false,
      });
    }

    let resultExists = await resultModal.findOne({
      learnerId,
      assessmentId,
    });
    if (resultExists) {
      return res.status(200).json({
        message: `This learner already assessed`,
        data: resultExists,
        status: false,
      });
    }

    let maxMarks = 0;
    let totalObtainMarks = 0;

    for (let data of rubricsQts) {
      maxMarks += data.quesMarks;
      totalObtainMarks += data.eachObtainMarks;
    }

    await resultModal.create({
      learnerId,
      assessmentId,
      assessmentName: assessmentExists.assessmentName,
      assessmentUId: assessmentExists.uId,
      skillId: subSkillExists.skillId._id,
      subSkillId: subSkillExists._id,
      SkillName: subSkillExists.skillId.skillName,
      subSkillName: subSkillExists.subSkillName,
      maxMarks,
      totalObtainMarks,
      rubricsQts,
      assessedBy: teacherId,
      assessedOn: new Date().getTime(),
    });
    for (let assessmentData of learnerExists.assessments) {
      if (assessmentData.assessmentId.toString() === assessmentId)
        assessmentData.completion = true;
    }

    await learnerExists.save();
    let message = {};
    let payload = { message };
    payload.userId = learnerId;
    payload.deviceToken = learnerExists.deviceToken;
    payload.deviceType = learnerExists.deviceType;
    payload.isLerner = true;
    payload.isAssessment = true;
    payload.isCourse = false;
    message.notification = {
      title: "Result generated",
      body: `Result has been generated for  assessment ${assessmentExists.assessmentName} `,
      date: new Date().getTime(),
    };
    message.data = {
      type: "Result generated",
      assessmentId: new mongoose.Types.ObjectId(assessmentExists._id),
    };
    addNotification.emit("addNotification", payload);

    if (process.env.SENTEMAIL === "true") {
      // This point is used to sent email Registration Email
      let registerEmailPayload = {};
      registerEmailPayload.name = learnerExists.fullName;
      registerEmailPayload.assessmentName = assessmentExists.assessmentName;
      registerEmailPayload.createdOn = moment1()
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY");
      let filePath = path.join(
        process.cwd(),
        "./middleware/emailTemplate/resultGenerated.ejs"
      );
      let source = fs.readFileSync(filePath, "utf-8").toString();
      const htmlToSent = ejs.render(source, registerEmailPayload);
      registerEmailPayload.email = learnerExists?.email;
      registerEmailPayload.subject = `Congratulations on Completing the Assessment ${assessmentExists.assessmentName}`;
      registerEmailPayload.html = htmlToSent;
      await rabbitMqHelper.produceQueue(registerEmailPayload);
    }

    return res.status(200).json({
      status: true,
      message: "The learner successfully assessed",
    });
  } catch (err) {
    logger.error(`Error from function ${assessLearnerByAnAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const divisionStatusByAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const result = await userModal.aggregate([
      {
        $match: {
          "assessments.assessmentId": new mongoose.Types.ObjectId(assessmentId),
        },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessments.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
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
        $unwind: "$division",
      },

      {
        $addFields: {
          completedStudents: {
            $reduce: {
              input: "$assessments",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$$this.assessmentId",
                          new mongoose.Types.ObjectId(assessmentId),
                        ],
                      },
                      { $eq: ["$$this.completion", true] },
                    ],
                  },
                  { $add: ["$$value", 1] },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          signleassessment: {
            $filter: {
              input: "$assessmentData",
              as: "item",
              cond: {
                // Specify your filter condition here
                $eq: ["$$item._id", new mongoose.Types.ObjectId(assessmentId)],
              },
            },
          },
        },
      },
      {
        $unwind: "$signleassessment",
      },
      {
        $group: {
          _id: {
            divisionId: "$divisionId",
          },
          divisionName: { $first: "$division.divisionName" },
          divisionUid: { $first: "$division.divisionUid" },
          schoolId: { $first: "$division.schoolId" },
          totalStudents: { $sum: 1 },
          completedStudents: { $sum: "$completedStudents" },
          assignedOn: { $first: "$signleassessment.createdOn" },
        },
      },

      {
        $lookup: {
          from: "grades",
          localField: "_id.divisionId",
          foreignField: "divisions",
          as: "gradeData",
        },
      },
      { $unwind: "$gradeData" },
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
        $project: {
          _id: 0,
          divisionId: "$_id.divisionId",
          divisionName: 1,
          divisionUid: 1,
          status: {
            $cond: [
              { $eq: ["$totalStudents", "$completedStudents"] },
              true,
              false,
            ],
          },
          totalStudents: 1,
          completedStudents: 1,
          assignedOn: 1,
          gradeName: "$gradeData.gradeName",
          gradeUid: "$gradeData.gradeUid",
          schoolName: "$schoolData.schoolName",
          schoolUid: "$schoolData.schoolUid",
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: `This division status retrieved`,
      data: result,
    });
  } catch (err) {
    logger.error(`Error from function ${divisionStatusByAssessment.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAssessmentByLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    let result;
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
      { $unwind: { path: "$assessments", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "results",
          let: {
            assessmentId: "$assessments.assessmentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$learnerId",
                        new mongoose.Types.ObjectId(learnerId),
                      ],
                    },
                    { $eq: ["$assessmentId", "$$assessmentId"] },
                  ],
                },
              },
            },
          ],
          as: "resultData",
        },
      },
      {
        $unwind: { path: "$resultData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessments.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
        },
      },

      {
        $unwind: { path: "$assessmentData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "subskills",
          localField: "assessmentData.subSkillId",
          foreignField: "_id",
          as: "subskillsData",
        },
      },
      { $unwind: { path: "$subskillsData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "skills",
          localField: "subskillsData.skillId",
          foreignField: "_id",
          as: "skillsData",
        },
      },
      { $unwind: { path: "$skillsData", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$assessmentData.uId", "-"] }, 1],
            },
          },
        },
      },

      { $skip: skip },
      { $limit: limitValue },
      {
        $project: {
          _id: 0,
          _id: "$assessmentData._id",
          uId: "$assessmentData.uId",
          numericPart: 1,
          assessmentName: "$assessmentData.assessmentName",
          assessmentCompletion: "$assessmentData.completion",
          about: "$assessmentData.assessmentDesc",
          subSkillName: "$subskillsData.subSkillName",
          description: "$subskillsData.description",
          skillName: "$skillsData.skillName",
          description: "$skillsData.description",
          totalObtainMarks: "$resultData.totalObtainMarks",
          assessmentId: "$resultData.assessmentId",
          completedOn: "$resultData.assessedOn",
          totalMarks: "$resultData.maxMarks",
          totalMarks: "$resultData.maxMarks",
          // rubricsQts: "$resultData.rubricsQts",
          rubricsQts: "$rubricsQts.rubricsQts",
          status: "$assessments.completion",
          subAssessmentCount: "$assessments.subAssessmentCount",
          originalAssessmentId: "$assessments.originalAssessmentId",
          quesMarks: {
            $sum: "$subskillsData.rubricsQts.quesMarks",
          },
          rubricsQtsLength: {
            $size: { $ifNull: ["$subskillsData.rubricsQts", []] },
          },
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },

    ];
    const learnerDetails = await learnerModal.findById(learnerId).lean();
    if (!learnerDetails) {
      return res.status(404).json({
        message: `learner does not exist with learnerId ${learnerId}`,
        status: false,
      });
    }
    if (!!search === true) {

      pipeline.push({
        $match: {
          $or: [
            {
              assessmentName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    result = await learnerModal.aggregate(pipeline);

    if (!!result === true && Array.isArray(result) && result.length > 0) {
      for await (const iterator of result) {
        if (iterator.quesMarks === 0) {
          delete iterator.quesMarks;
        }
      }
    }
    result = result.filter((element) => {
      return Object.keys(element).length > 3;
    });
    return res.status(200).json({
      message: `This learner status of assessment retrieved`,
      data: result,
      status: true,
      totalLength: learnerDetails.assessments.length,
    });
  } catch (err) {
    logger.error(`Error from function ${getAssessmentByLearner.name}`, {
      stack: err.stack,
    });
  }
};

/**
 * This function is used for get  All assessment or get assessment by search
 * @returns {params}
 * @method Get
 */

export const assessmentByLearnerForLearner = async (req, res) => {
  try {
    const { userId: learnerId } = req.user;
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    let result;
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
      {
        $match: {
          _id: new mongoose.Types.ObjectId(learnerId),
        },
      },

      { $unwind: { path: "$assessments", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "assessments.completion": true,
        },
      },
      {
        $lookup: {
          from: "results",
          let: {
            assessmentId: "$assessments.assessmentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$learnerId",
                        new mongoose.Types.ObjectId(learnerId),
                      ],
                    },
                    { $eq: ["$assessmentId", "$$assessmentId"] },
                  ],
                },
              },
            },
          ],
          as: "resultData",
        },
      },
      {
        $unwind: { path: "$resultData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessments.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
        },
      },

      {
        $unwind: { path: "$assessmentData", preserveNullAndEmptyArrays: true },
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
          uId: "$assessmentData.uId",
          assessmentName: "$assessmentData.assessmentName",
          totalObtainMarks: "$resultData.totalObtainMarks",
          totalMarks: "$resultData.maxMarks",
          assignedOn: "$assessments.assignedOn",
          status: "$assessments.completion",
        },
      },

    ];
    if (!!search === true) {
      pipeline.push({
        $match: {
          $assessmentName: search,
        },
      });
    }
    const learnerDetails = await learnerModal.findById(learnerId).lean();
    if (!learnerDetails) {
      return res.status(404).json({
        message: `learner does not exist with learnerId ${learnerId}`,
        status: false,
      });
    }
    result = await learnerModal.aggregate(pipeline);
    if (!!result === false || result.length <= 0) {
      return res.status(400).json({
        message: "Data not found",
        status: false,
      });
    }
    return res.status(200).json({
      message: `This learner status of assessment retrieved`,
      data: result,
      status: true,
      totalLength: learnerDetails.assessments.length,
    });
  } catch (err) {
    logger.error(`Error from function ${assessmentByLearnerForLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAssessmentByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

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

    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },

      { $unwind: "$assessmentsForAssess" },
      {
        $lookup: {
          from: "users",
          localField: "assessmentsForAssess.assessmentId",
          foreignField: "assessments.assessmentId",
          as: "learnerData",
        },
      },
      {
        $lookup: {
          from: "results",
          let: {
            assessmentId: "$assessmentsForAssess.assessmentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$assessmentId", "$$assessmentId"] }],
                },
              },
            },
          ],
          as: "resultData",
        },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessmentsForAssess.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
        },
      },

      {
        $unwind: { path: "$assessmentData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "subskills",
          localField: "assessmentData.subSkillId",
          foreignField: "_id",
          as: "subSkillData",
        },
      },
      {
        $unwind: {
          path: "$subSkillData",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
      {
        $project: {
          uId: "$assessmentData.uId",
          _id: "$assessmentData._id",
          assessmentName: "$assessmentData.assessmentName",
          totalScore: { $sum: "$subSkillData.rubricsQts.quesMarks" },
          assignedOn: "$assessmentData.createdOn",
          disable: "$assessmentData.disable",
          originalAssessmentId: "$assessmentData.originalAssessmentId",
          subAssessmentCount: "$assessmentData.subAssessmentCount",
          status: {
            $cond: [
              { $eq: [{ $size: "$resultData" }, { $size: "$learnerData" }] },
              true,
              false,
            ],
          },
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
    ];

    let result = await teacherModal.aggregate(pipeline);
    return res.status(200).json({
      message: `This teacher status of assessment retrieved`,
      data: result,
      status: true,
      totalLength: teacherDetails.assessmentsForAssess.length,
    });
  } catch (err) {
    logger.error(`Error from function ${getAssessmentByTeacher.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAssessmentByTeacherForTeacher = async (req, res) => {
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
    let teachers;
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

    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(teacherId),
        },
      },

      {
        $unwind: {
          path: "$assessmentsForAssess",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessmentsForAssess.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
        },
      },
      { $unwind: "$assessmentData" },
      { $match: { "assessmentData.assignedDivisions": { $in: divisionIds } } },

      {
        $lookup: {
          from: "subskills",
          localField: "assessmentData.subSkillId",
          foreignField: "_id",
          as: "subSkillData",
        },
      },
      {
        $unwind: {
          path: "$subSkillData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assessmentsForAssess.assessmentId",
          foreignField: "assessments.assessmentId",
          as: "learnerData",
        },
      },
      {
        $lookup: {
          from: "results",
          let: {
            assessmentId: "$assessmentsForAssess.assessmentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$assessmentId", "$$assessmentId"] }],
                },
              },
            },
          ],
          as: "resultData",
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [
            {
              $project: {
                _id: "$assessmentData._id",
                uId: "$assessmentData.uId",
                assessmentName: "$assessmentData.assessmentName",
                totalScore: { $sum: "$subSkillData.rubricsQts.quesMarks" },
                assignedOn: "$assessmentData.createdOn",
                status: {
                  $cond: [
                    {
                      $eq: [
                        { $size: "$resultData" },
                        { $size: "$learnerData" },
                      ],
                    },
                    true,
                    false,
                  ],
                },
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
              "assessmentData.uId": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "assessmentData.assessmentName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }
    let redisData = await redisHelper.getDataFromRedisHash(
      `getAssessmentByTeacherForTeacher`,
      `getAssessmentByTeacherForTeacher_${teacherId}_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      teachers = redisData;
    } else {
      teachers = await teacherModal.aggregate(pipeline);
      await redisHelper.setRedisHash(
        `getAssessmentByTeacherForTeacher`,
        `getAssessmentByTeacherForTeacher_${teacherId}_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}_${gradeId}_${divisionId}`,
        teachers
      );
    }

    return res.status(200).json({
      status: true,
      message: "The assessment of teacher successfully retrieved",
      data: teachers[0].data,
      totalLength: teachers[0].totalCount[0]?.total || 0,
    });
  } catch (err) {
    logger.error(
      `Error from function ${getAssessmentByTeacherForTeacher.name}`,
      { stack: err.stack }
    );
  }
};

/**
 * This function is used for get assessment result for lerner by lerner id
 * @returns {params}
 * @method Get
 */
export const assessmentForLernerByLernerId = async (req, res) => {
  const returnObj = { error: true, status: 400, message: "" };
  try {
    let { assessmentId, type } = req.body;
    const { userId } = req.user;
    if (
      !!assessmentId === true &&
      mongoose.Types.ObjectId.isValid(assessmentId) === false
    ) {
      throw new Error(`This id is not valid ${assessmentId}`);
    }
    type = type.trim().toUpperCase();
    let validateObj = {};
    validateObj.OVERVIEW = "overview";
    validateObj.RESULT = "result";
    Object.freeze(validateObj);
    const getAssessment = await assessmentModal.findById(assessmentId);
    if (!!getAssessment == false) {
      throw new Error(
        "This assessment id is invalid please provide the correct one"
      );
    }
    if (!!type === true && Object.keys(validateObj).includes(type) === false) {
      throw new Error(
        `${type} is invalid type you have to only select  ${Object.keys(
          validateObj
        ).join(" or ")}`
      );
    }
    let pipeline;
    if ((!!type === true && type === "OVERVIEW") || type === "RESULT") {
      pipeline = [
        {
          $match: {
            $and: [
              { learnerId: new mongoose.Types.ObjectId(userId) },
              { assessmentId: new mongoose.Types.ObjectId(assessmentId) },
            ],
          },
        },
        {
          $lookup: {
            from: "assessments",
            localField: "assessmentId",
            foreignField: "_id",
            as: "assessmentsDetail",
          },
        },
        { $unwind: "$assessmentsDetail" },
        {
          $project: {
            learnerId: 1,
            assessmentId: 1,
            SkillName: 1,
            subSkillName: 1,
            maxMarks: 1,
            totalObtainMarks: 1,
            rubricsQts: 1,
            assessedOn: 1,
            assessmentDesc: "$assessmentsDetail.assessmentDesc",
          },
        },
      ];
    }

    let result = await resultModal.aggregate(pipeline);
    if (!!result === true && result.length > 0) {
      for await (const iterator of result) {
        let { length } = iterator.rubricsQts;
        iterator.RubricsLength = length;
      }
    }

    returnObj.message = `Data found successfully with assessment ${assessmentId}`;
    returnObj.error = false;
    returnObj.status = 200;
    returnObj.data = result;
    return res.status(returnObj.status).json(returnObj);
  } catch (error) {
    logger.error(`Error from function ${assessmentForLernerByLernerId.name}`, {
      stack: error.stack,
    });
    returnObj.error = true;
    returnObj.status = 400;
    returnObj.message = error.message;
    return res.status(returnObj.status).json(returnObj);
  }
};

export const getAssessmentByAssessmentId = async (req, res) => {
  try {
    const { AssessmentID } = req.params;
    const { userId: learnerId } = req.user;
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    let result;
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
      { $unwind: { path: "$assessments", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $and: [
            { _id: new mongoose.Types.ObjectId(learnerId) },
            {
              "assessments.assessmentId": new mongoose.Types.ObjectId(
                AssessmentID
              ),
            },
          ],
        },
      },
      { $unwind: { path: "$assessments", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "results",
          let: {
            assessmentId: "$assessments.assessmentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$learnerId",
                        new mongoose.Types.ObjectId(learnerId),
                      ],
                    },
                    { $eq: ["$assessmentId", "$$assessmentId"] },
                  ],
                },
              },
            },
          ],
          as: "resultData",
        },
      },
      {
        $unwind: { path: "$resultData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessments.assessmentId",
          foreignField: "_id",
          as: "assessmentData",
        },
      },

      {
        $unwind: { path: "$assessmentData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "subskills",
          localField: "assessmentData.subSkillId",
          foreignField: "_id",
          as: "subskillsData",
        },
      },
      { $unwind: { path: "$subskillsData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "skills",
          localField: "subskillsData.skillId",
          foreignField: "_id",
          as: "skillsData",
        },
      },
      { $unwind: { path: "$skillsData", preserveNullAndEmptyArrays: true } },
      {
        $sort: {
          [sortBys]: sortTypes,
        },
      },
      { $skip: skip },
      { $limit: limitValue },
      {
        $project: {
          _id: 0,
          _id: "$assessmentData._id",
          uId: "$assessmentData.uId",
          assessmentName: "$assessmentData.assessmentName",
          assessmentCompletion: "$assessmentData.completion",
          about: "$assessmentData.assessmentDesc",
          subSkillName: "$subskillsData.subSkillName",
          description: "$subskillsData.description",
          skillName: "$skillsData.skillName",
          description: "$skillsData.description",
          totalObtainMarks: "$resultData.totalObtainMarks",
          assessmentId: "$resultData.assessmentId",
          completedOn: "$resultData.assessedOn",
          totalMarks: "$resultData.maxMarks",
          totalMarks: "$resultData.maxMarks",
          rubricsQts: "$resultData.rubricsQts",
          status: "$assessments.completion",
          subAssessmentCount: "$assessments.subAssessmentCount",
          originalAssessmentId: "$assessments.originalAssessmentId",
          quesMarks: {
            $sum: "$subskillsData.rubricsQts.quesMarks",
          },
          rubricsQtsLength: {
            $size: { $ifNull: ["$subskillsData.rubricsQts", []] },
          },
        },
      },
    ];
    const learnerDetails = await learnerModal.findById(learnerId).lean();
    if (!learnerDetails) {
      return res.status(404).json({
        message: `learner does not exist with learnerId ${learnerId}`,
        status: false,
      });
    }
    if (!!search === true) {
      pipeline.push({
        $match: {
          $or: [
            {
              assessmentName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              uId: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    if (!!result === true && Array.isArray(result) && result.length > 0) {
      for await (const iterator of result) {
        if (iterator.quesMarks === 0) {
          delete iterator.quesMarks;
        }
      }
    }
    result = result.filter((element) => {
      return Object.keys(element).length > 3;
    });
    return res.status(200).json({
      message: `This learner status of assessment retrieved`,
      data: result,
      status: true,
      // totalLength: learnerDetails.assessments.length,
    });
  } catch (err) {
    logger.error(`Error from function ${getAssessmentByLearner.name}`, {
      stack: err.stack,
    });
  }
};
