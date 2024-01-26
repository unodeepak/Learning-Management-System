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

const imageFileFilter = (req, file, cb) => {
  // Check if the file is an image (JPEG or PNG)
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "image/bmb",
    "image/tiff",
    "image/webp",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new Error(
        "Only image files (JPEG , PNG,jpg,gif,bmb,tiff,webp) are allowed!"
      ),
      false
    );
  }
};
export let uploaderLearnerFolderS3 = multer({
  storage: multerS3({
    acl: "public-read",
    s3,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { mimetype: file.mimetype });
    },
    key: function (req, file, cb) {
      req.fileData = "images/Learners";
      cb(null, "images/Learners");
    },
  }),
  fileFilter: imageFileFilter,
});
