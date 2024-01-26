import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { dirname } from "path";
import admin from "firebase-admin";
import winston from "winston";
import process from "node:process";

import { fileURLToPath } from "url";
import { authRoute } from "./routes/authRoute.js";
import { userRoute } from "./routes/userRoute.js";
import { folderRoute } from "./routes/folderRoute.js ";
import { subFolderRoute } from "./routes/subFolderRoute.js";
import { schoolRoute } from "./routes/schoolRoute.js";
import { gradeRoute } from "./routes/gradeRoute.js";
import { divisionRoute } from "./routes/divisionRoute.js";
import { learnerRoute } from "./routes/learnerRoute.js";
import { uploadFileRoute } from "./routes/uploadFileRoute.js";
import { teacherRoute } from "./routes/teacherRoute.js";
import { skillRoute } from "./routes/skillRoute.js";
import { subSkillRoute } from "./routes/subSkillRoute.js";
import { assessmentRoute } from "./routes/assessmentRoute.js";
import { courseRoute } from "./routes/courseRoute.js";
import { resultRoute } from "./routes/resultRoute.js";
import { jioMeetRoutes } from "./routes/jioMeetRoute.js";
import { notificationRoute } from "./routes/notificationRoute.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // it enables Cross-Origin Resource Sharing (CORS) for the application.
app.use(morgan("dev")); //It is a middleware that logs HTTP requests and responses.
app.use(helmet()); //It is a middleware that helps secure the application by setting various HTTP headers.

app.use("/upload", express.static("./upload")); // upload for the pdfs
app.use("/uploadImage", express.static("./uploadImage")); //upload Images of learner/teacher/school/course

//This one is used to save our logs
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      if (stack) {
        // Include the stack trace for error logs
        return `${timestamp} | ${level}: ${message}\n${stack}`;
      }
      return `${timestamp} | ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});
app.use((req, res, next) => {
  console.log(`Request handled by worker is ${process.pid}`);
  next();
});

app.use("/assessment", assessmentRoute);
app.use("/auth", authRoute);
app.use("/course", courseRoute);
app.use("/division", divisionRoute);
app.use("/folder", folderRoute);
app.use("/grade", gradeRoute);
app.use("/learner", learnerRoute);
app.use("/result", resultRoute);
app.use("/school", schoolRoute);
app.use("/skill", skillRoute);
app.use("/subFolder", subFolderRoute);
app.use("/subSkill", subSkillRoute);
app.use("/teacher", teacherRoute);
app.use("/user", userRoute);
app.use("/file", uploadFileRoute);
app.use("/jioMeet", jioMeetRoutes);
app.use("/notification", notificationRoute);

global.__basedir = dirname(fileURLToPath(import.meta.url)); // Get access to current directory

export { app };