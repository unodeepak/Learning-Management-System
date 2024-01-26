import folderModal from "../modals/folderModal.js";
import subFolderModal from "../modals/subFolderModal.js";
import subFolderTrackModel from "../modals/subFolderTrackModel.js";
import userModal from "../modals/userModal.js";
import courseModal from "../modals/courseModal.js";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
export const createSubFolder = async (req, res) => {
  const { subFolderName, uId, folderId } = req.body;
  try {
    const folderExists = await folderModal.findById(folderId);
    if (!folderExists) {
      return res.status(400).json({
        message: `Folder does not Exist`,
        status: false,
      });
    }
    let subFolderExists = await subFolderModal.findOne({
      $or: [{ uId }, { $and: [{ subFolderName }, { folderId }] }],
    });

    if (subFolderExists) {
      if (uId == subFolderExists.uId)
        return res.status(409).json({
          message: `subFolder Already Exists with uid ${uId}`,
          status: false,
        });

      if (subFolderName == subFolderExists.subFolderName)
        return res.status(409).json({
          message: `subFolder Already Exists with subFolderName ${subFolderName}`,
          status: false,
        });
    }

    const newSubFolder = await subFolderModal.create({
      folderId,
      subFolderName,
      uId,
      createdOn: new Date().getTime(),
    });

    folderExists.subFolder.push(newSubFolder._id);
    folderExists.save();
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (newSubFolder) {
      return res.status(201).json({
        status: true,
        message: "the subFolder successfully  created",
        data: newSubFolder,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};

export const getAllSubFolderByFolderId = async (req, res) => {
  const { folderId } = req.params;
  try {
    const { pagination, page, limit, search, sortBy, sortType } = req.query;

    let sortBys = "_id";
    let sortTypes = -1;

    if (sortBy && sortType) {
      sortBys = sortBy;
      sortTypes = Number(sortType);
    }

    let FolderExists = await folderModal.findById(folderId);

    if (!FolderExists) {
      return res.status(404).json({
        message: `Folder does not Exists with id ${folderId}`,
        status: false,
      });
    }
    let queryObj = { folderId };
    let getSubFolders = [];

    if (search) {
      queryObj.$or = [
        {
          subFolderName: {
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

    getSubFolders = subFolderModal.find(queryObj);

    if (pagination) {
      // Pagination

      let pageValue = Number(page) || 1;
      let limitValue = Number(limit) || 10;

      let skip = (pageValue - 1) * limit;

      getSubFolders = getSubFolders
        .sort({ [sortBys]: sortTypes })
        .skip(skip)
        .limit(limitValue);
    }

    const finalFolder = await getSubFolders;

    let totalLength = await subFolderModal.countDocuments(queryObj);

    return res.status(200).json({
      data: finalFolder,
      status: true,
      message: "folder retrieved successfully",
      totalLength,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ msg: err.message });
  }
};

export const renameSubFolder = async (req, res) => {
  const { subFolderId, subFolderName } = req.body;
  try {
    let subFolderExists = await subFolderModal.findById(subFolderId);

    if (!subFolderExists) {
      return res.status(404).json({
        message: `SubfolderId does not Exists with subfolderId ${subFolderId}`,
        status: false,
      });
    }

    let subFolderNameExists = await subFolderModal.findOne({
      $and: [{ subFolderName }, { folderId: subFolderExists.folderId }],
    });

    if (subFolderNameExists) {
      if (
        subFolderNameExists._id.toString() != subFolderExists._id.toString()
      ) {
        return res.status(409).json({
          message: `subFolder Already Exists with subFolderName ${subFolderName}`,
          status: false,
        });
      }
    }
    subFolderExists.subFolderName = subFolderName;

    await subFolderExists.save();

    if (subFolderExists) {
      return res.status(201).json({
        status: true,
        message: "the subfolder successfully updated",
        data: subFolderExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};

export const disableSubFolder = async (req, res) => {
  const { subFolderId } = req.params;
  try {
    let subFolderExists = await subFolderModal.findById(subFolderId);

    if (!subFolderExists) {
      return res.status(404).json({
        message: `SubfolderId does not Exists with subfolderId ${subFolderId}`,
        status: false,
      });
    }
    subFolderExists.disable = subFolderExists.disable ? false : true;

    await subFolderExists.save();
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (subFolderExists) {
      return res.status(201).json({
        status: true,
        message: "the subfolder successfully updated",
        data: subFolderExists,
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};

export const deleteSubFolder = async (req, res) => {
  const { subFolderId } = req.params;

  try {
    let subFolderExists = await subFolderModal.findOneAndDelete({
      _id: subFolderId,
    });

    if (!subFolderExists) {
      return res.status(404).json({
        message: `SubfolderId does not Exists with subfolderId ${subFolderId}`,
        status: false,
      });
    }

    await folderModal.findByIdAndUpdate(
      {
        _id: subFolderExists.folderId,
      },
      {
        $pull: {
          subFolder: subFolderId,
        },
      }
    );
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    if (subFolderExists) {
      return res.status(201).json({
        status: true,
        message: "the subfolder successfully deleted",
      });
    }
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};

export const getUidSubFolder = async (req, res) => {
  try {
    let subFolderExists = await subFolderModal.findOne(
      {}, //Query Criteria
      {}, //Projection Criteria
      { sort: { _id: -1 } }
    );

    if (!subFolderExists) {
      return res.status(200).json({
        status: true,
        message: "The uid successfully retrieved",
        data: "SF-1",
      });
    }

    const lastUid = subFolderExists.uId;
    const uidNumber = parseInt(lastUid.split("-")[1]);
    const newUid = "SF-" + (uidNumber + 1);

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

export const getSingleSubFolder = async (req, res) => {
  try {
    const { subFolderId } = req.params;
    let subFolderExists = await subFolderModal.findById(subFolderId);

    if (!subFolderExists) {
      return res.status(404).json({
        message: `Subfolder does not Exist with subFolderId ${subFolderId}`,
        status: false,
      });
    }

    return res.status(200).json({
      status: true,
      message: "the subFolder successfully retrieved",
      data: subFolderExists,
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

export const updateSubFolderTrack = async (req, res) => {
  try {
    const { userId, courseId, subFolderId } = req.body;

    const userIdExists = await userModal.findById(userId);
    if (!userIdExists) {
      return res
        .status(400)
        .json({ message: "The userId does not exist", status: false });
    }
    const courseIdExists = await courseModal.findById(courseId);
    if (!courseIdExists) {
      return res
        .status(400)
        .json({ message: "The courseId does not exist", status: false });
    }
    const subFolderIdExists = await subFolderModal.findById(subFolderId);
    if (!subFolderIdExists) {
      return res
        .status(400)
        .json({ message: "The subFolderId does not exist", status: false });
    }
    const subFolderTrackExists = await subFolderTrackModel.findOne({
      userId,
      courseId,
      subFolderId,
    });
    if (!subFolderTrackExists) {
      await subFolderTrackModel.create({
        userId,
        courseId,
        subFolderId,
        completion: true,
        accessibility: 1,
        createdOn: new Date().getTime(),
      });
      return res
        .status(201)
        .json({ message: "The track record created ", status: true });
    }

    subFolderTrackExists.accessibility = subFolderTrackExists.accessibility + 1;
    subFolderTrackExists.updatedOn = new Date().getTime();
    await subFolderTrackExists.save();
    let deleteRedisHash = [
      `getAllCourseWithTrackRecordOfTeacherForTeach_${userId}`,
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res
      .status(200)
      .json({ message: "The track record updated ", status: true });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};

export const unlockSubFolderTrack = async (req, res) => {
  try {
    const { userId, courseId, subFolderId } = req.body;

    const userIdExists = await userModal.findById(userId);
    if (!userIdExists) {
      return res
        .status(400)
        .json({ message: "The userId does not exist", status: false });
    }
    const courseIdExists = await courseModal.findById(courseId);
    if (!courseIdExists) {
      return res
        .status(400)
        .json({ message: "The courseId does not exist", status: false });
    }
    const subFolderIdExists = await subFolderModal.findById(subFolderId);
    if (!subFolderIdExists) {
      return res
        .status(400)
        .json({ message: "The subFolderId does not exist", status: false });
    }
    const subFolderTrackExists = await subFolderTrackModel.findOne({
      userId,
      courseId,
      subFolderId,
    });
    if (!subFolderTrackExists) {
      await subFolderTrackModel.create({
        userId,
        courseId,
        subFolderId,
        completion: true,
        accessibility: 0,
        createdOn: new Date().getTime(),
      });
      return res
        .status(201)
        .json({ message: "The track record created ", status: true });
    }

    subFolderTrackExists.accessibility = 0;
    subFolderTrackExists.updatedOn = new Date().getTime();
    await subFolderTrackExists.save();
    let deleteRedisHash = [
      "getAllFolder",
      "getAllCourseWithTrackRecordOfTeacherForTeach",
    ];
    await redisHelper.delDataFromRedisHash(deleteRedisHash);
    return res
      .status(200)
      .json({ message: "The track record updated ", status: true });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};
