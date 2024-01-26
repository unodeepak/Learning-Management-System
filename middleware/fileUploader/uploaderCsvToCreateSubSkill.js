import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import skillModal from "../../modals/skillModal.js";
import subSkillModal from "../../modals/subSkillModal.js";

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let path;
    path = __basedir + `/upload/rubricsCsv`;
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
    path = __basedir + `/upload/rubricsCsv`;
    path = path.replace(/\\/g, "/");

    cb(null, `${file.originalname}`);
  },
});

export const uploaderCsvToCreateSubSkill = multer({
  fileFilter: async function (req, file, cb) {
    const { skillId, subSkillName, uId } = req.body;

    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      if (!mongoose.Types.ObjectId.isValid(skillId)) {
        req.status = false;
        req.message = "please provide skill Id";
        return cb(null, false);
      }

      let skillExists = await skillModal.findById(skillId);

      if (!skillExists) {
        req.status = false;
        req.message = `skill does not exist with skillId ${skillId}`;
        return cb(null, false);
      }
      let subSkillExists = await subSkillModal.findOne({
        $or: [{ uId }, { $and: [{ skillId }, { subSkillName }] }],
      });

      if (subSkillExists) {
        if (uId == subSkillExists.uId) {
          req.status = false;
          req.message = `SubSkill already Exists with uid ${uId}`;
          return cb(null, false);
        }

        if (subSkillName == subSkillExists.subSkillName) {
          req.status = false;
          req.message = `SubSkill already Exists with subSkillName ${subSkillName}`;
          return cb(null, false);
        }
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
