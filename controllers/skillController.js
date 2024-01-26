import mongoose from "mongoose";
import assessmentModal from "../modals/assessmentModal.js";
import resultModal from "../modals/resultModal.js";
import skillModal from "../modals/skillModal.js";
import subSkillModal from "../modals/subSkillModal.js";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const createSkill = async (req, res) => {
  const { uId, skillName, description } = req.body;
  try {
    let skillExists = await skillModal.findOne({
      $or: [{ uId }, { skillName }],
    });

    if (skillExists) {
      if (uId == skillExists.uId)
        return res.status(409).json({
          message: `skill already Exists with uid ${uId}`,
          status: false,
        });

      if (skillName == skillExists.skillName)
        return res.status(409).json({
          message: `skill already Exists with skill Name ${skillName}`,
          status: false,
        });
    }
    const newSkill = await skillModal.create({
      uId,
      skillName,
      description,
      createdOn: new Date().getTime(),
    });
    let deleteRedisHash = ["finalSkill"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newSkill) {
      return res.status(201).json({
        status: true,
        message: "the skill successfully created",
        data: newSkill,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createSkill.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllSkill = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;
    let finalSkill, pipeline;
    let skip = (pageValue - 1) * limit;
    let queryObj = {};
    let getSkill = [];

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys;
      sortBys = sortBys == "subSkills" ? "subSkillsLength" : sortBys;
    }

    pipeline = [
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
          skillName: 1,
          createdOn: 1,
          subSkills: 1,
          numericPart: 1,
          subSkillsLength: { $size: "$subSkills" },
          // subFolder:0
        },
      },
      {
        $sort: {
          [sortBys]: +sortTypes,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limitValue,
      },
    ];

    if (search) {
      queryObj.$or = [
        {
          uId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          skillName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
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
              skillName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    let redisData = await redisHelper.getDataFromRedisHash(
      `finalSkill`,
      `finalSkill_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      finalSkill = redisData;
    } else {
      finalSkill = await skillModal.aggregate(pipeline);
      await redisHelper.setRedisHash(
        `finalSkill`,
        `finalSkill_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`,
        finalSkill
      );
    }
    let totalLength = await skillModal.countDocuments(queryObj);

    return res.status(200).json({
      data: finalSkill,
      status: true,
      message: "Skill retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllSkill.name}`, {
      stack: err.stack,
    });

    return res.status(500).json({ message: err.message, status: false });
  }
};

export const getAllSkillForAssign = async (req, res) => {
  try {
    let queryObj = {
      disable: false,
    };
    let getSkill = [];

    getSkill = skillModal
      .find(queryObj)
      .select("skillName uId")
      .sort({ _id: -1 });

    const finalSkill = await getSkill;

    return res.status(200).json({
      data: finalSkill,
      status: true,
      message: "Skill retrieved successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${getAllSkillForAssign.name}`, {
      stack: err.stack,
    });

    return res.status(500).json({ message: err.message, status: false });
  }
};

export const editSkill = async (req, res) => {
  const { skillId, skillName, description } = req.body;
  try {
    let skillExists = await skillModal.findById(skillId);

    if (!skillExists) {
      return res.status(404).json({
        message: `Skill does not Exist with skillId ${skillId}`,
        status: false,
      });
    }
    if (skillName) {
      let skillNameExists = await skillModal.findOne({ skillName });
      if (skillNameExists) {
        if (skillNameExists.skillName !== skillExists.skillName) {
          return res.status(409).json({
            message: `Skill already exists with skillName ${skillName}`,
            status: false,
          });
        }
      }
    }

    skillExists.skillName = skillName ? skillName : skillExists.skillName;
    skillExists.description = description
      ? description
      : skillExists.description;

    await skillExists.save();
    let deleteRedisHash = ["finalSkill"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (skillExists) {
      return res.status(200).json({
        status: true,
        message: "The skill successfully updated",
        data: skillExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editSkill.name}`, { stack: err.stack });

    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableSkill = async (req, res) => {
  const { skillId } = req.params;
  try {
    let skillExists = await skillModal.findById(skillId);

    if (!skillExists) {
      return res.status(404).json({
        message: `Skill does not Exist with skillId ${skillId}`,
        status: false,
      });
    }

    skillExists.disable = skillExists.disable ? false : true;

    await subSkillModal.updateMany(
      { skillId },
      { disable: skillExists.disable ? true : false }
    );

    await skillExists.save();
    let deleteRedisHash = ["finalSkill"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (skillExists) {
      return res.status(200).json({
        status: true,
        message: "The skill successfully updated",
        data: skillExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableSkill.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
//by delete skill, its subskill also be deleted and remove its subskill from assessment
export const deleteSkill = async (req, res) => {
  const { skillId } = req.params;
  try {
    let skillExists = await skillModal.findById(skillId);

    if (!skillExists) {
      return res.status(404).json({
        message: `Skill does not Exist with skillId ${skillId}`,
        status: false,
      });
    }
    for (let subSkillId of skillExists.subSkills) {
      await assessmentModal.updateMany(
        {
          subSkillId,
        },
        { subSkillId: null }
      );
    }

    await subSkillModal.deleteMany({ skillId });

    await skillExists.deleteOne();
    let deleteRedisHash = ["finalSkill"];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (skillExists) {
      return res.status(200).json({
        status: true,
        message: "The skill successfully deleted",
      });
    }
  } catch (err) {
    logger.error(`Error from function ${deleteSkill.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidSkill = async (req, res) => {
  try {
    let skillExists = await skillModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!skillExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "SK-1",
      });
    }

    const lastUid = skillExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "SK-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error`, { stack: err.stack });

    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    let skillExists = await skillModal.findById(skillId);

    if (!skillExists) {
      return res.status(404).json({
        message: `Skill does not Exist with skillId ${skillId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "the skill successfully retrieved",
      data: skillExists,
    });
  } catch (err) {
    logger.error(`Error`, { stack: err.stack });

    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSkillReportByLearner = async (req, res) => {
  try {
    let queryObj = {};
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

    const { learnerId } = req.params;
    let getSkill = [];

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
      { $match: { learnerId: new mongoose.Types.ObjectId(learnerId) } },
      {
        $group: {
          _id: {
            skillId: "$skillId",
            SkillName: "$SkillName",
          },
          maxMarks: { $sum: "$maxMarks" },
          totalObtainMarks: { $sum: "$totalObtainMarks" },
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

    if (search) {
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
              SkillName: {
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
          SkillName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    getSkill = await resultModal.aggregate(pipeline);
    for await (const iterator of getSkill) {
      let getSubSkillById = getSkill[0]._id.skillId.toString().substring(0);
      let getSkillById = await skillModal.findById(getSubSkillById);
      if (!!getSkillById == true) {
        iterator.skillUid = getSkillById.uId;
      }
    }

    return res.status(200).json({
      data: getSkill,
      // totalLength,
      status: true,
      message: "Skill retrieved successfully",
    });
  } catch (err) {
    logger.error(`Error`, { stack: err.stack });

    return res.status(500).json({ message: err.message, status: false });
  }
};
