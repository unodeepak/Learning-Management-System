import multer from "multer";
import fs from "fs";
import { nanoid } from "nanoid";
import teacherModal from "../../modals/teacherModal.js";
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

export let uploaderTeacherImage = multer({
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
        "/Teacher/" +
        req.teacherData.uId +
        "/" +
        unID +
        "-" +
        file.originalname;
      cb(
        null,
        "Teacher/" + req.teacherData.uId + "/" + unID + "-" + file.originalname
      );
    },
  }),

  fileFilter: async function (req, file, cb) {
    if (!!req.body.teacherId === false) {
      req.doesExists = false;
      return cb(null, false, req.doesExists);
    }

    const doesExists = await teacherModal.findById(req.body.teacherId);

    req.doesExists = true;
    if (!doesExists) {
      req.doesExists = false;
      req.teacherExists = "the teacher does not exists";
      return cb(null, false);
    }
    req.doesExists = true;
    req.teacherData = doesExists;

    cb(null, true);
  },
  // limits: { fileSize: 1024 * 1024 * 300 },
});
