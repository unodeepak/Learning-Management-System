import mongoose from "mongoose";

const notification = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: {},
  data: {},
  isLerner: { type: Boolean, default: false },
  isTeacher: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  status: { type: Boolean, default: false },
  isCourse: { type: Boolean, default: false },
  isAssessment: { type: Boolean, default: false },
  isLibrary: { type: Boolean, default: false },
  isMeeting: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

notification.index({ userId: -1 }, { background: true });
export default mongoose.model("notification", notification);
