import skillModal from "../modals/skillModal.js";
import subSkillModal from "../modals/subSkillModal.js";
import assessmentModal from "../modals/assessmentModal.js";
import fs from "fs";
import csv from "csv-parser";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const createSubSkill = async (req, res) => {
  const { skillId, subSkillName, uId, description, rubricsQts } = req.body;
  try {
    let skillExists = await skillModal.findById(skillId);

    if (!skillExists) {
      return res.status(400).json({
        message: `Skill does not exist`,
        status: false,
      });
    }
    let subSkillExists = await subSkillModal.findOne({
      $or: [{ uId }, { $and: [{ skillId }, { subSkillName }] }],
    });

    if (subSkillExists) {
      if (uId == subSkillExists.uId)
        return res.status(409).json({
          message: `SubSkill already Exists with uid ${uId}`,
          status: false,
        });

      if (subSkillName == subSkillExists.subSkillName)
        return res.status(409).json({
          message: `SubSkill already Exists with subSkillName ${subSkillName}`,
          status: false,
        });
    }
    const newSubSkill = await subSkillModal.create({
      skillId,
      subSkillName,
      uId,
      description,
      rubricsQts,
      createdOn: new Date().getTime(),
    });

    skillExists.subSkills.unshift(newSubSkill._id);
    await skillExists.save();

    if (newSubSkill) {
      return res.status(201).json({
        status: true,
        message: "the subSkill successfully created",
        data: newSubSkill,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllSubSkillBySkillId = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    const { skillId } = req.params;

    let queryObj = { skillId };
    let getSubSkills = [];

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    if (search) {
      queryObj.$or = [
        {
          subSkillName: {
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
      ];
    }

    getSubSkills = subSkillModal.find(queryObj);

    if (pagination) {
      // Pagination

      let pageValue = Number(page) || 1;
      let limitValue = Number(limit) || 10;

      let skip = (pageValue - 1) * limit;

      getSubSkills = getSubSkills
        .sort({ [sortBys]: sortTypes })
        .skip(skip)
        .limit(limitValue);
    }

    const finalSubSkill = await getSubSkills;

    let totalLength = await subSkillModal.countDocuments(queryObj);

    return res.status(200).json({
      data: finalSubSkill,
      status: true,
      message: "SubSkills retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ msg: err.message });
  }
};

export const getAllSubSkillBySkillIdForAssign = async (req, res) => {
  try {
    const { pagination, page, limit, search } = req.query;
    const { skillId } = req.params;

    let queryObj = { skillId };
    let getSubSkills = [];

    if (search) {
      queryObj.$or = [
        {
          subSkillName: {
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
      ];
    }

    getSubSkills = subSkillModal.find(queryObj).select("subSkillName uId");

    if (pagination) {
      // Pagination

      let pageValue = Number(page) || 1;
      let limitValue = Number(limit) || 10;

      let skip = (pageValue - 1) * limit;

      getSubSkills = getSubSkills
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limitValue);
    }

    const finalSubSkill = await getSubSkills;

    let totalLength = await subSkillModal.countDocuments(queryObj);

    return res.status(200).json({
      data: finalSubSkill,
      status: true,
      message: "SubSkills retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ msg: err.message });
  }
};

export const editSubSkill = async (req, res) => {
  const { subSkillId, subSkillName, description, rubricsQts } = req.body;

  function isDataEmpty(item) {
    return Object.keys(item).length === 0 && item.constructor === Object;
  }

  try {
    let subSkillExists = await subSkillModal.findById(subSkillId);
    if (!subSkillExists) {
      return res.status(404).json({
        message: `Subskill does not Exist with subSkillId ${subSkillId}`,
        status: false,
      });
    }
    if (subSkillName) {
      let subSkillNameExists = await subSkillModal.findOne({
        subSkillName,
        skillId: subSkillExists.skillId,
      });
      if (subSkillNameExists) {
        if (
          subSkillNameExists._id.toString() != subSkillExists._id.toString()
        ) {
          return res.status(409).json({
            message: `Sub skill already exists with sub skill name ${subSkillName}`,
            status: false,
          });
        }
      }
    }
    subSkillExists.subSkillName = subSkillName
      ? subSkillName
      : subSkillExists.subSkillName;
    subSkillExists.description = description
      ? description
      : subSkillExists.description;
    subSkillExists.rubricsQts =
      !rubricsQts ||
      rubricsQts?.length == 0 ||
      (rubricsQts.length > 0 && isDataEmpty(rubricsQts[0]))
        ? subSkillExists.rubricsQts
        : rubricsQts;
    await subSkillExists.save();
    if (subSkillExists) {
      return res.status(200).json({
        status: true,
        message: "The sub skill successfully updated",
        data: subSkillExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableSubSkill = async (req, res) => {
  const { subSkillId } = req.params;
  try {
    let subSkillExists = await subSkillModal.findById(subSkillId);

    if (!subSkillExists) {
      return res.status(404).json({
        message: `Subskill does not exist with subSkillId ${subSkillId}`,
        status: false,
      });
    }

    subSkillExists.disable = subSkillExists.disable ? false : true;

    await subSkillExists.save();

    if (subSkillExists) {
      return res.status(200).json({
        status: true,
        message: "The subskill successfully updated",
        data: subSkillExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};
// by delete subskill also be removed from assessment
export const deleteSubSkill = async (req, res) => {
  const { subSkillId } = req.params;
  try {
    let subSkillExists = await subSkillModal.findById(subSkillId);

    await assessmentModal.updateMany(
      {
        subSkillId,
      },
      { subSkillId: null }
    );

    await skillModal.findByIdAndUpdate(
      {
        _id: subSkillExists.skillId,
      },
      {
        $pull: {
          subSkills: subSkillId,
        },
      }
    );
    await subSkillExists.deleteOne();

    if (subSkillExists) {
      return res.status(200).json({
        status: true,
        message: "The subskill successfully deleted",
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidSubSkill = async (req, res) => {
  try {
    let subSkillExists = await subSkillModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!subSkillExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "SUK-1",
      });
    }

    const lastUid = subSkillExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "SUK-" + (uidNumber + 1);

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

export const getSingleSubSkill = async (req, res) => {
  try {
    const { subSkillId } = req.params;
    let subSkillExists = await subSkillModal
      .findById(subSkillId)
      .populate({ path: "skillId", select: "skillName" });

    if (!subSkillExists) {
      return res.status(404).json({
        message: `SubSkill does not Exist with subSkillId ${subSkillId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "the subskill successfully retrieved",
      data: subSkillExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const uploadRubricsQuestions = async (req, res, next) => {
  try {
    const { skillId, subSkillName, uId, description } = req.body;

    if (!req.status && req.message) {
      return res.status(400).json({ message: req.message, status: req.status });
    }

    if (!req.status && !req.message) {
      return res
        .status(400)
        .json({ message: "choose file first", status: false });
    }

    let newData = [];
    let headerIsValid = true;
    let expectedHeaders = ["Question"];
    fs.createReadStream(req.file.path.replace(/\\/g, "/"))
      .pipe(csv())
      .on("headers", (headers) => {
        // Check if the header names match the expected names+
        headerIsValid = headers.every(
          (header, index) => header === expectedHeaders[index]
        );
        if (!headerIsValid) {
          console.log("Error: Incorrect header names in CSV file.");
        }
      })
      .on("data", (data) => newData.push(data))
      .on("end", async () => {
        let subSkill;
        if (headerIsValid) {
          subSkill = await subSkillModal.create({
            uId,
            skillId,
            subSkillName,
            description: description ? description : "",
            rubricsQts: newData.map((question) => ({
              quesDesc: question.Question,
            })),
            createdOn: new Date().getTime(),
          });

          fs.rmdir("./upload/rubricsCsv", { recursive: true }, (err) => {
            if (err) {
              return console.log("error occurred in deleting directory", err);
            }

            console.log("Directory deleted successfully");
          });

          return res.status(200).json({
            message: "SubSkill created successfully",
            status: true,
            data: subSkill,
          });
        } else {
          return res
            .status(400)
            .json({ message: "you selected a wrong file", status: false });
        }
      });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};
