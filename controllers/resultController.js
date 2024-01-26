import assessmentModal from "../modals/assessmentModal.js";
import learnerModal from "../modals/learnerModal.js";
import divisionModal from "../modals/divisionModal.js";
import resultModal from "../modals/resultModal.js";
import mongoose from "mongoose";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const getResultOfAssessmentByDivision = async (req, res) => {
  try {
    const { divisionId, assessmentId, pagination, page, limit } = req.body;

    let pageValue = 1;
    let limitValue = 10;
    let skip = (pageValue - 1) * limitValue;
    let sortBys = "_id";
    let sortTypes = -1;
    sortBys = sortBys == "uId" ? "numericPart" : sortBys;
    if (pagination) {
      pageValue = Number(page) || 1;
      limitValue = Number(limit) || 10;
      skip = (pageValue - 1) * limitValue;
    }

    const divisionExists = await divisionModal.findById(divisionId);
    if (!divisionExists) {
      return res.status(400).json({
        status: false,
        message: `the division does not exist with divisionId ${divisionId}`,
      });
    }

    const assessmentExists = await assessmentModal.findById(assessmentId);
    if (!assessmentExists) {
      return res.status(400).json({
        status: false,
        message: `the assessment does not exist with assessmentId ${assessmentId}`,
      });
    }

    const result = await learnerModal.aggregate([
      {
        $match: {
          divisionId: new mongoose.Types.ObjectId(divisionId),
          "assessments.assessmentId": new mongoose.Types.ObjectId(assessmentId),
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "SchoolDetail",
        },
      },
      { $unwind: "$SchoolDetail" },
      {
        $lookup: {
          from: "grades",
          localField: "gradeId",
          foreignField: "_id",
          as: "GradeDetail",
        },
      },
      { $unwind: "$GradeDetail" },
      {
        $lookup: {
          from: "divisions",
          localField: "divisionId",
          foreignField: "_id",
          as: "divisionDetail",
        },
      },
      { $unwind: "$divisionDetail" },
      {
        $lookup: {
          from: "results",
          let: {
            learnerId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$assessmentId",
                        new mongoose.Types.ObjectId(assessmentId),
                      ],
                    },
                    { $eq: ["$learnerId", "$$learnerId"] },
                  ],
                },
              },
            },
          ],
          as: "resultData",
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
          fullName: 1,
          numericPart: 1,
          gender: 1,
          uId: 1,
          disable: 1,
          createdOn: 1,
          updatedOn: 1,
          role: 1,
          learnerImg: 1,
          schoolName: "$SchoolDetail.schoolName",
          gradeName: "$GradeDetail.gradeName",
          divisionName: "$divisionDetail.divisionName",
          completedOn: { $arrayElemAt: ["$resultData.assessedOn", 0] },
          status: {
            $cond: {
              if: { $gt: [{ $size: "$resultData" }, 0] },
              then: true,
              else: false,
            },
          },
          totalQuesMarks: {
            $reduce: {
              input: "$resultData",
              initialValue: 0,
              in: {
                $add: ["$$value", { $sum: "$$this.rubricsQts.quesMarks" }],
              },
            },
          },
          totalObtainMarks: {
            $reduce: {
              input: "$resultData",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  { $sum: "$$this.rubricsQts.eachObtainMarks" },
                ],
              },
            },
          },
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

    let totalLength = await learnerModal.countDocuments({
      divisionId,
      "assessments.assessmentId": assessmentId,
    });

    return res.status(200).json({
      status: true,
      message: "the result retrieved succussfully",
      data: result,
      totalLength,
    });
  } catch (error) {
    logger.error(
      `Error from function ${getResultOfAssessmentByDivision.name}`,
      { stack: error.stack }
    );
    return res.status(500).json({ message: error.message, status: false });
  }
};

export const getSingleResultByLearner = async (req, res) => {
  try {
    const { learnerId, assessmentId } = req.params;
    let resultExists = await resultModal
      .findOne({ learnerId, assessmentId })
      .populate({
        path: "learnerId",
        select: "fullName uId",

        populate: {
          path: "divisionId gradeId schoolId",
          select: "divisionUId divisionName gradeName schoolName",
        },
      });

    if (!resultExists) {
      return res.status(404).json({
        message: `This learner does not have result yet`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "the result of successfully retrieved",
      data: resultExists,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleResultByLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllResultByLearner = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const { page, limit, search } = req.query;

    let queryObj = {
      learnerId,
    };
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

    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;
    let skip = (pageValue - 1) * limitValue;

    const totalLength = await resultModal.countDocuments(queryObj);

    let resultExists = await resultModal
      .find(queryObj)
      .populate({
        path: "learnerId",
        select: "fullName uId",

        populate: {
          path: "divisionId gradeId schoolId",
          select: "divisionUId divisionName gradeName schoolName",
        },
      })
      .skip(skip)
      .limit(limitValue)
      .lean();

    if (!resultExists) {
      return res.status(404).json({
        message: `This learner does not have result yet`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "the result of successfully retrieved",
      data: resultExists,
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllResultByLearner.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
