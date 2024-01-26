import multer from "multer";
import fs from "fs";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
import learnerModal from "../../modals/learnerModal.js";
dotenv.config();

const { AWS_ENDPOINT, BUCKET_NAME, AWS_ACCESS_KEY, AWS_SECRET_KEY } =
  process.env;

let s3 = new aws.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: "ap-south-mum-1",
  endpoint: AWS_ENDPOINT,
  s3ForcePathStyle: true,
});

export let uploaderLearnerImageS3 = multer({
  storage: multerS3({
    acl: "public-read",
    s3,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { mimetype: file.mimetype });
    },

    key: function (req, file, cb) {
      const unID = nanoid();
      req.fileData =
        "/Learner/" +
        req.learnerData.uId +
        "/" +
        unID +
        "-" +
        file.originalname;
      cb(
        null,
        "Learner/" + req.learnerData.uId + "/" + unID + "-" + file.originalname
      );
    },
  }),
  fileFilter: async function (req, file, cb) {
    if (!!req.body.learnerId === false) {
      req.doesExists = false;
      return cb(null, false, req.doesExists);
    }

    const doesExists = await learnerModal.findById(req.body.learnerId);
    req.doesExists = true;
    if (!doesExists) {
      req.doesExists = false;
      req.learnerExists = "the learner does not exists";
      return cb(null, false);
    }
    req.doesExists = true;
    req.learnerData = doesExists;

    cb(null, true);
  },
  // limits: { fileSize: 1024 * 1024 * 300 },
});
