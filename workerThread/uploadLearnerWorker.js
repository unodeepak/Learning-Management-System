import { parentPort } from "worker_threads";
import randomstring from "randomstring";
import Cryptr from "cryptr";
import dotenv from "dotenv";
const cryptr = new Cryptr(process.env.CRYPTO_SCRET_KEY);
import aws from "aws-sdk";
import path from "path";
import fs from "fs";
import rabbitMqHelper from "../helpers/rebbitMqHelper.js";
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
parentPort.on("message", async (message) => {
  let addArray = [];
  for await (const iterator of message.array) {
    let password = await randomstring.generate({
      length: 12,
      charset: "alphanumeric",
    });
    let addObject = {
      firstName: iterator.firstName,
      middleName: iterator.middleName,
      surName: iterator.surName,
      fullName:
        iterator.firstName && iterator.middleName && iterator.surName
          ? `${iterator.firstName} ${iterator.middleName} ${iterator.surName}`
          : iterator.firstName && iterator.middleName
          ? `${iterator.firstName} ${iterator.middleName}`
          : iterator.firstName,
      dob: iterator.dob || "",
      enrollmentDate: iterator.enrollmentDate || "",
      gender: iterator.gender,
      email: iterator.email,
      mobile: iterator.mobile,
      userRole: 3,
      role: "Learner",
      schoolId: message?.payloadObj?.schoolId,
      gradeId: message?.payloadObj?.gradeId,
      divisionId: message?.payloadObj?.divisionId,
      password: cryptr.encrypt(password),
      createdOn: new Date().getTime(),
    };
    if (Array.isArray(addArray) && addArray.length <= 0) {
      addObject.uId = message?.payloadObj?.newUid;
    } else {
      let getLastIndex = await addArray[addArray.length - 1].uId;
      const uidNumber = parseInt(getLastIndex.split("-")[1]);
      let newUid = "S-" + (uidNumber + 1);
      addObject.uId = newUid;
    }
    addArray.push(addObject);
    if (process.env.SENTEMAIL === "true") {
      // This point is used to sent email Registration Email
      let registerEmailPayload = {};
      registerEmailPayload.name = addObject.fullName;
      let filePath = path.join(
        process.cwd(),
        "./middleware/emailTemplate/learnerSignUp.ejs"
      );
      let source = fs.readFileSync(filePath, "utf-8").toString();
      const htmlToSent = ejs.render(source, registerEmailPayload);
      registerEmailPayload.email = addObject.email;
      registerEmailPayload.subject = `Welcome to Brainstorm International!`;
      registerEmailPayload.html = htmlToSent;
      await rabbitMqHelper.produceQueue(registerEmailPayload);

      //This point is used to sent log in credentials for learner
      let logInPayload = {};
      logInPayload.name = addObject.fullName;
      logInPayload.uId = addObject.uId;
      logInPayload.password = password;
      logInPayload.subject = `Login details of students!`;
      logInPayload.email = addObject.email;
      let filePathCredential = path.join(
        process.cwd(),
        "./middleware/emailTemplate/learnerSignUpCredential.ejs"
      );
      let sourceCredential = fs
        .readFileSync(filePathCredential, "utf-8")
        .toString();
      const htmlToSentCredential = ejs.render(sourceCredential, logInPayload);
      logInPayload.html = htmlToSentCredential;
      await rabbitMqHelper.produceQueue(logInPayload);
    }
  }
  parentPort.postMessage(addArray);
});
