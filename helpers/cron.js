import courseModal from "../modals/courseModal.js";
import notificationTimingModel from "../modals/notificationTiming.js";
import cron from "node-cron";
import moment from "moment";
import userModal from "../modals/userModal.js";
import mongoose from "mongoose";
import { addNotification } from "../controllers/notificationController.js";
import jioMeetModel from "../modals/jioMeetModel.js";
class scheduleCrone {
  shaduleCroneFun = () => {
    try {
      cron.schedule("0 12 * * *", async () => {
        let notificationTiming = await notificationTimingModel
          .find({ dayHourMonth: { $in: ["DAYS", "MONTHS"] } })
          .lean();
        if (
          !!notificationTiming === true &&
          Array.isArray(notificationTiming) &&
          notificationTiming.length > 0
        ) {
          for await (const iterator of notificationTiming) {
            if (
              !!iterator === true &&
              "dayHourMonth" in iterator &&
              iterator?.dayHourMonth.length > 0
            ) {
              if (iterator?.dayHourMonth === "DAYS") {
                let startDate = moment()
                  .add(+iterator.duration, "days")
                  .startOf("day")
                  .unix();
                let endDAte = moment()
                  .add(+iterator.duration, "days")
                  .endOf("day")
                  .unix();
                let getCourseDetail = await courseModal.find(
                  { expiredOn: { $gte: startDate, $lte: endDAte } },
                  { _id: 1, courseName: 1 }
                );
                if (
                  !!getCourseDetail === true &&
                  Array.isArray(getCourseDetail) &&
                  getCourseDetail.length > 0
                ) {
                  for await (const iterator1 of getCourseDetail) {
                    let getUserDetail = await userModal
                      .find({
                        $or: [
                          { "courses.courseId": { $in: [iterator1._id] } },
                          {
                            "coursesForLearn.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                          {
                            "coursesForTeach.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                        ],
                      })
                      .lean();
                    for await (const iterator2 of getUserDetail) {
                      const courseName = iterator1.courseName;
                      const endDate = new Date(endDAte * 1000).getDate();
                      let message = {
                        notification: {
                          title: "Course Expire",
                          body: `You Course ${courseName} is about to finish ${new Date(
                            endDate
                          ).getDate()} days`,
                          date: new Date().getTime(),
                        },
                        data: {
                          type: "Course Expire",
                          courseId: new mongoose.Types.ObjectId(iterator1._id),
                          coursePicture: getCourseDetail?.coursePicture,
                        },
                      };
                      let payload = { message };
                      payload.userId = iterator2._id;
                      payload.deviceToken = iterator2.deviceToken || "";
                      payload.deviceType = iterator2.deviceType || "";
                      payload.isTeacher =
                        iterator2?.role === "Teacher" ? true : false;
                      payload.isLearner =
                        iterator2?.role === "Learner" ? true : false;
                      payload.isCourse = true;
                      payload.isAssessment = false;
                      addNotification.emit("addNotification", payload);
                    }
                  }
                }
              }

              if (iterator?.dayHourMonth === "MONTHS") {
                let startDate = moment()
                  .add(+iterator.duration, "month")
                  .startOf("day")
                  .unix();
                let endDAte = moment()
                  .add(+iterator.duration, "month")
                  .endOf("day")
                  .unix();
                let getCourseDetail = await courseModal.find(
                  { expiredOn: { $gte: startDate, $lte: endDAte } },
                  { _id: 1, courseName: 1 }
                );
                if (
                  !!getCourseDetail === true &&
                  Array.isArray(getCourseDetail) &&
                  getCourseDetail.length > 0
                ) {
                  for await (const iterator1 of getCourseDetail) {
                    let getUserDetail = await userModal
                      .find({
                        $or: [
                          { "courses.courseId": { $in: [iterator1._id] } },
                          {
                            "coursesForLearn.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                          {
                            "coursesForTeach.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                        ],
                      })
                      .lean();
                    for await (const iterator2 of getUserDetail) {
                      const courseName = iterator1.courseName;
                      const endDate = new Date(endDAte * 1000).getDate();
                      let message = {
                        notification: {
                          title: "Course Expire",
                          body: `You Course ${courseName} is about to finish ${new Date(
                            endDate
                          ).getDate()} months`,
                          date: new Date().getTime(),
                        },
                        data: {
                          type: "Course Expire",
                          courseId: new mongoose.Types.ObjectId(iterator1._id),
                          coursePicture: getCourseDetail?.coursePicture,
                        },
                      };
                      let payload = { message };
                      payload.userId = iterator2._id;
                      payload.deviceToken = iterator2.deviceToken || "";
                      payload.deviceType = iterator2.deviceType || "";
                      payload.isTeacher =
                        iterator2?.role === "Teacher" ? true : false;
                      payload.isLearner =
                        iterator2?.role === "Learner" ? true : false;
                      payload.isCourse = true;
                      payload.isAssessment = false;
                      addNotification.emit("addNotification", payload);
                    }
                  }
                }
              }
            }
          }
        }
      });

      cron.schedule("0 * * * *", async () => {
        let notificationTiming = await notificationTimingModel
          .find({ dayHourMonth: { $in: ["HOURS"] } })
          .lean();
        if (
          !!notificationTiming === true &&
          Array.isArray(notificationTiming) &&
          notificationTiming.length > 0
        ) {
          for await (const iterator of notificationTiming) {
            if (
              !!iterator === true &&
              "dayHourMonth" in iterator &&
              iterator?.dayHourMonth.length > 0
            ) {
              if (iterator?.dayHourMonth === "HOURS") {
                let startDate = moment()
                  .add(+iterator.duration, "hour")
                  .startOf("hour")
                  .unix();
                let endDAte = moment()
                  .add(+iterator.duration, "hour")
                  .endOf("hour")
                  .unix();
                let getCourseDetail = await courseModal.find(
                  { expiredOn: { $gte: startDate, $lte: endDAte } },
                  { _id: 1, courseName: 1 }
                );
                if (
                  !!getCourseDetail === true &&
                  Array.isArray(getCourseDetail) &&
                  getCourseDetail.length > 0
                ) {
                  for await (const iterator1 of getCourseDetail) {
                    let getUserDetail = await userModal
                      .find({
                        $or: [
                          { "courses.courseId": { $in: [iterator1._id] } },
                          {
                            "coursesForLearn.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                          {
                            "coursesForTeach.courseId": {
                              $in: [iterator1._id],
                            },
                          },
                        ],
                      })
                      .lean();
                    for await (const iterator2 of getUserDetail) {
                      const courseName = iterator1.courseName;
                      const endDate = new Date(endDAte * 1000).getDate();
                      let message = {
                        notification: {
                          title: "Course Expire",
                          body: `You Course ${courseName} is about to finish ${new Date(
                            endDate
                          ).getDate()} hour`,
                          date: new Date().getTime(),
                        },
                        data: {
                          type: "Course Expire",
                          courseId: new mongoose.Types.ObjectId(iterator1._id),
                          coursePicture: getCourseDetail?.coursePicture,
                        },
                      };
                      let payload = { message };
                      payload.userId = iterator2._id;
                      payload.deviceToken = iterator2.deviceToken || "";
                      payload.deviceType = iterator2.deviceType || "";
                      payload.isTeacher =
                        iterator2?.role === "Teacher" ? true : false;
                      payload.isLerner =
                        iterator2?.role === "Learner" ? true : false;
                      payload.isCourse = true;
                      payload.isAssessment = false;
                      addNotification.emit("addNotification", payload);
                    }
                  }
                }
              }
            }
          }
        }
      });

      cron.schedule("* * * * *", async function () {
        const currentDate = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(currentDate.getTime() + istOffset);
        // Format the date in the desired ISO 8601 format
        const formattedDateString = istDate
          .toISOString()
          .replace(/\.\d{3}Z$/, "Z");
        const { error } = await jioMeetModel.updateMany(
          {
            $and: [
              { startDateAndTime: { $lte: formattedDateString } },
              { meetingCompletedStatus: false },
            ],
          },
          { $set: { meetingCompletedStatus: true } }
        );
        if (!!error === true) {
          throw new Error(error);
        }
      });
    } catch (error) {
      logger.error(`Error from function shaduleCroneFun`, {
        stack: error.stack,
      });
    }
  };
}
let cronShadule = new scheduleCrone();
export default cronShadule;
