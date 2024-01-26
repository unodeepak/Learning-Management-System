import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import { nanoid } from "nanoid";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import dotenv from "dotenv";
import cron from "node-cron";
import subFolderModal from "../modals/subFolderModal.js";
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";
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
export const uploadPdfHeyzine = async (req, res) => {
  try {
    const { heyzineKey } = process.env;
    let link = req.pdfLink;
    const { URL } = process.env;
    link = URL + link;
    if (req.fileValidationError) {
      return res
        .status(404)
        .json({ message: req.fileValidationError, status: false });
    }

    if (req.subfolderExists) {
      return res
        .status(404)
        .json({ message: req.subfolderExists, status: false });
    }
    if (!req.doesExists || !link) {
      return res
        .status(404)
        .json({ message: "something went wrong", status: false });
    }
    const response = await fetch(
      ` https://heyzine.com/api1/async?pdf=${link}&k=${heyzineKey}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const resJson = await response.json();

    if (
      "state" in resJson &&
      resJson.state === true &&
      resJson.state === "processed"
    ) {
      const { error } = await s3
        .deleteObject({ Bucket: BUCKET_NAME, Key: req.pdfLink.substr(1) })
        .promise();
      if (!!error === true) {
        return res.status(400).json({
          status: true,
          message: error,
        });
      }
    }

    req.subFolderData.pdfThumbnail = resJson.thumbnail;
    req.subFolderData.pdfUrl = resJson.url;
    req.subFolderData.updatedOn = new Date().getTime();
    req.subFolderData.heyzineUrl = response.url;
    req.subFolderData.flipBookStatus = resJson.state;
    req.subFolderData.s3PdfLink = link;
    await req.subFolderData.save();
    return res.status(200).json({
      data: req.subFolderData,
      status: true,
      message: "the flipbook has been generated",
    });
  } catch (err) {
    logger.error(`Error `, { stack: err.stack });
    return res.status(500).json({ status: false, message: err.message });
  }
};

cron.schedule("*/5 * * * * *", async () => {
  let checkingStatus = await subFolderModal.find({ flipBookStatus: "started" });
  if (
    !!checkingStatus === true &&
    checkingStatus.length > 0 &&
    Array.isArray(checkingStatus) &&
    checkingStatus instanceof Array
  ) {
    for await (const iterator of checkingStatus) {
      if ("flipBookStatus" in iterator && !!iterator.flipBookStatus === true) {
        const response = await fetch(`${iterator.heyzineUrl}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        let res = await response.json();
        if (!!res === true && "state" in res && res.state === "processed") {
          await subFolderModal.updateOne(
            { _id: iterator._id },
            { flipBookStatus: res.state }
          );
          const { error } = await s3
            .deleteObject({
              Bucket: BUCKET_NAME,
              Key: iterator.s3PdfLink.split("client-809/")[1],
            })
            .promise();
          if (!!error === true) {
            return res.status(400).json({
              status: true,
              message: error,
            });
          }
        }
      }
    }
  }
});
