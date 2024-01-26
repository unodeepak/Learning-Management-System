import mongoose from "mongoose";

const course = mongoose.Schema({
  uId: { type: String, required: true },
  courseName: { type: String, required: true },
  about: { type: String, required: true },
  assigned: { type: Boolean, required: true, default: false },
  courseDuration: {
    duration: { type: Number, required: true },
    slot: { type: String, required: true },
  },
  coursePicture: { type: String },
  subCourseCount: { type: Number, default: 0 },
  originalCourseId: { type: mongoose.Schema.Types.ObjectId, default: null },
  contentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    required: true,
  },
  assignedGrade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Grade",
    default: null,
  },
  assignedDivisions: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Division" },
  ],
  assignedLearners: [{ type: mongoose.Schema.Types.ObjectId, ref: "Learner" }],
  assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
  disable: { type: Boolean, default: false },
  startedOn: { type: Number, default: new Date().getTime() },
  expiredOn: { type: Number },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

course.index({ courseName: "text" });

export default mongoose.model("Course", course);
