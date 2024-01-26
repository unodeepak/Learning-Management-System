import multer from "multer";
import fs from "fs";
import { nanoid } from "nanoid";
import learnerModal from "../../modals/learnerModal.js";

let storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let path;
    path = __basedir + `/uploadImage/learner/${req.learnerData.uId}`;
    path = path.replace(/\\/g, "/");

    const filePath = __basedir + `/uploadImage/learner/${req.learnerData.uId}`;

    if (fs.existsSync(filePath)) {
      fs.readdirSync(filePath).forEach((file) => {
        const filePath1 = `${path}/${file}`;
        fs.unlinkSync(filePath1);
      });
    }

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    cb(null, path);
  },
  filename: async (req, file, cb) => {
    const fileId = nanoid();
    let path;
    path = __basedir + `/uploadImage/learner/${req.learnerData.uId}`;
    path = path.replace(/\\/g, "/");
    req.learnerData.learnerImg = `${path}/${fileId}-${file.originalname}`;
    cb(null, `${fileId}-${file.originalname}`);
  },
});

export const uploaderLearnerImage = multer({
  fileFilter: async function (req, file, cb) {
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
      if (!req.body.learnerId) {
        req.doesExists = false;
        req.learnerExists = "please provide learner details";
        return cb(null, false);
      }
      const doesExists = await learnerModal.findById(req.body.learnerId);

      if (!doesExists) {
        req.doesExists = false;
        req.learnerExists = "the learner does not exists";
        return cb(null, false);
      }
      req.doesExists = true;
      req.learnerData = doesExists;

      cb(null, true);
    } else {
      req.fileValidationError =
        "Check Your File type accept only jpg or png format";
      return cb(null, false);
    }
  },
  storage: storage,
});
