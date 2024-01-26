import mongoose from "mongoose";

const notificationTiming = mongoose.Schema({
  duration: { type: String, default: null },
  dayHourMonth: {
    type: String,
    enum: ["DAYS", "HOURS", "MONTHS"],
    default: null,
  },
  notificationTime: { type: Number, default: null },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

export default mongoose.model("notificationTiming", notificationTiming);
