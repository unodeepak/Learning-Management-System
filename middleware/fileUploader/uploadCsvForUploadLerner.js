import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import skillModal from "../../modals/skillModal.js";
import subSkillModal from "../../modals/subSkillModal.js";
import gradeModal from "../../modals/gradeModal.js";
import divisionModal from "../../modals/divisionModal.js";
import schoolModel from "../../modals/schoolModal.js";

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let path;
    path = __basedir + `/upload/lernerCsv`;
    path = path.replace(/\\/g, "/");

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    cb(null, path);
  },
  filename: async (req, file, cb) => {
    // const name = nanoid();
    // If the user keeps on re-uploading file then we want to replace the old one's and not create a new file.
    let path;
    path = __basedir + `/upload/lernerCsv`;
    path = path.replace(/\\/g, "/");
    cb(null, `${file.originalname}`);
  },
});

export const csvForUploadLerner = multer({
  fileFilter: async function (req, file, cb) {
    let { schoolId, gradeId, divisionId } = req.body;
    let varifyPayload;
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      if (
        !!schoolId === true &&
        mongoose.Types.ObjectId.isValid(schoolId) === false
      ) {
        req.status = false;
        req.message = `This school id is not valid  ${schoolId}`;
        return cb(null, false);
      }
      if (
        !!gradeId === true &&
        mongoose.Types.ObjectId.isValid(gradeId) === false
      ) {
        req.status = false;
        req.message = `This grade id is not valid  ${gradeId}`;
        return cb(null, false);
      }
      if (
        !!divisionId === true &&
        mongoose.Types.ObjectId.isValid(divisionId) === false
      ) {
        req.status = false;
        req.message = `This division id is not valid  ${divisionId}`;
        return cb(null, false);
      }
      varifyPayload = await schoolModel.findById(schoolId).lean();
      if (!!varifyPayload === false) {
        req.status = false;
        req.message = `Please provide the valid school id`;
        return cb(null, false);
      }
      varifyPayload = await gradeModal.findById(gradeId).lean();
      if (!!varifyPayload === false) {
        req.status = false;
        req.message = `Please provide the valid grade id`;
        return cb(null, false);
      }
      varifyPayload = await divisionModal.findById(divisionId).lean();
      if (!!varifyPayload === false) {
        req.status = false;
        req.message = `Please provide the valid division id`;
        return cb(null, false);
      }
      req.status = true;
      cb(null, true);
    } else {
      req.status = false;
      req.message = "Check Your File type accept only csv or xlsx format";
      return cb(null, false);
    }
  },
  storage: storage,
});
