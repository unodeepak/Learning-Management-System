import multer from "multer";
import fs from "fs";
import { nanoid } from "nanoid";
import schoolModal from "../../modals/schoolModal.js";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import dotenv from "dotenv";
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

export let uploaderSchoolLogo = multer({
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
        "/School/" +
        req.schoolData.schoolUid +
        "/" +
        unID +
        "-" +
        file.originalname;
      cb(
        null,
        "School/" +
          req.schoolData.schoolUid +
          "/" +
          unID +
          "-" +
          file.originalname
      );
    },
  }),
  fileFilter: async function (req, file, cb) {
    if (!!req.body.schoolId === false) {
      req.doesExists = false;
      return cb(null, false, req.doesExists);
    }
    const doesExists = await schoolModal.findById(req.body.schoolId);
    req.doesExists = true;
    if (!doesExists) {
      req.doesExists = false;
      req.schoolExists = "the school does not exists";
      return cb(null, false);
    }
    req.doesExists = true;
    req.schoolData = doesExists;

    cb(null, true);
  },
  // limits: { fileSize: 1024 * 1024 * 300 },
});
