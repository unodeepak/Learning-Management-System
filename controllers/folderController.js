import folderModal from "../modals/folderModal.js";
import subFolderModal from "../modals/subFolderModal.js";
import courseModal from "../modals/courseModal.js";
import redisHelper from "../helpers/redis.js";

import { logger } from "../app.js";
export const createFolder = async (req, res) => {
  const { folderName, uId, description } = req.body;
  try {
    let folderExists = await folderModal.findOne({
      $or: [{ uId }, { folderName }],
    });

    if (folderExists) {
      if (uId == folderExists.uId)
        return res.status(409).json({
          message: `Folder Already Exists with uid ${uId}`,
          status: false,
        });

      if (folderName == folderExists.folderName)
        return res.status(409).json({
          message: `Folder Already Exists with folderName ${folderName}`,
          status: false,
        });
    }
    const newFolder = await folderModal.create({
      folderName,
      uId,
      description: description ? description : "",
      createdOn: new Date().getTime(),
    });
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newFolder) {
      return res.status(201).json({
        status: true,
        message: "the folder successfully created",
        data: newFolder,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${createFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllFolder = async (req, res) => {
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;
    let queryObj = {};

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
      sortBys = sortBys == "uId" ? "numericPart" : sortBys;
      sortBys = sortBys == "subFolder" ? "subfolderLength" : sortBys;
    }

    let finalFolder, pipeline;
    let pageValue = Number(page) || 1;
    let limitValue = Number(limit) || 10;

    let skip = (pageValue - 1) * limit;
    // getFolders = folderModal.find(queryObj, { uId: 1, folderName: 1, createdOn: 1, subFolder: 1 }).lean();

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
          folderName: 1,
          createdOn: 1,
          subFolder: 1,
          numericPart: 1,
          subfolderLength: { $size: "$subFolder" },
          // subFolder:0
        },
      },
      {
        $sort: {
          [sortBys]: sortTypes,
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
          folderName: {
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

      pipeline.unshift({
        $match: {
          $or: [
            {
              folderName: {
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

    let totalLength = await folderModal.countDocuments(queryObj);
    let redisData = await redisHelper.getDataFromRedisHash(
      `getAllFolder`,
      `getAllFolder_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`
    );
    if (Array.isArray(redisData) && redisData != false) {
      finalFolder = redisData;
    } else {
      finalFolder = await folderModal.aggregate(pipeline);
      await redisHelper.setRedisHash(
        `getAllFolder`,
        `getAllFolder_${limitValue}_${skip}_${sortBys}_${sortTypes}_${pagination}_${search}`,
        finalFolder
      );
    }
    return res.status(200).json({
      data: finalFolder,
      status: true,
      message: "folder retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error from function ${getAllFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ msg: err.message });
  }
};

export const editFolder = async (req, res) => {
  const { folderName, folderId, description } = req.body;
  try {
    let folderExists = await folderModal.findById(folderId);

    if (!folderExists) {
      return res.status(404).json({
        message: `Folder does not Exist with folderId ${folderId}`,
        status: false,
      });
    }

    let folderNameExists = await folderModal.findOne({ folderName });

    if (folderNameExists) {
      if (folderNameExists._id.toString() != folderExists._id.toString()) {
        return res.status(409).json({
          message: `Folder already Exist with folder Name ${folderName}`,
          status: false,
        });
      }
    }

    folderExists.folderName = folderName;
    folderExists.description = description
      ? description
      : folderExists.description;
    await folderExists.save();
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (folderExists) {
      return res.status(200).json({
        status: true,
        message: "the folder successfully updated",
        data: folderExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${editFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const disableFolder = async (req, res) => {
  const { folderId } = req.params;
  try {
    let folderExists = await folderModal.findById(folderId);

    if (!folderExists) {
      return res.status(404).json({
        message: `Folder does not Exist with folderId ${folderId}`,
        status: false,
      });
    }

    folderExists.disable = folderExists.disable ? false : true;
    let subFolderExists = await subFolderModal.updateMany(
      { folderId },
      { disable: folderExists.disable ? true : false }
    );
    await folderExists.save();
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (folderExists) {
      return res.status(200).json({
        status: true,
        message: "the folder successfully updated",
        data: folderExists,
      });
    }
  } catch (err) {
    logger.error(`Error from function ${disableFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteFolder = async (req, res) => {
  const { folderId } = req.params;
  try {
    let folderExists = await folderModal.findOneAndDelete({ _id: folderId });
    await subFolderModal.deleteMany({ folderId });
    await courseModal.updateMany(
      { contentFolder: folderId },
      { contentFolder: null }
    );
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (folderExists) {
      return res.status(200).json({
        status: true,
        message: "the folder successfully deleted",
      });
    }
  } catch (err) {
    logger.error(`Error from function ${deleteFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getUidFolder = async (req, res) => {
  try {
    let folderExists = await folderModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!folderExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "F-1",
      });
    }

    const lastUid = folderExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "F-" + (uidNumber + 1);

    return res.status(200).json({
      status: true,
      message: "The uid successfully retrieved",
      data: newUid,
    });
  } catch (err) {
    logger.error(`Error from function ${getUidFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const getSingleFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    let folderExists = await folderModal.findById(folderId);

    if (!folderExists) {
      return res.status(404).json({
        message: `Folder does not exist with folderId ${folderId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "The folder successfully retrieved",
      data: folderExists,
    });
  } catch (err) {
    logger.error(`Error from function ${getSingleFolder.name}`, {
      stack: err.stack,
    });
    return res.status(500).json({ status: false, message: err.message });
  }
};
