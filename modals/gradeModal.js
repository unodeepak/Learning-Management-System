import mongoose from "mongoose";

const grade = mongoose.Schema({
  schoolId: { type: mongoose.Types.ObjectId, ref: "School", required: true },
  gradeUid: { type: String, required: true },
  gradeName: { type: String, required: true },
  divisions: [{ type: mongoose.Types.ObjectId, ref: "Division" }],
  courses: [
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      assignedOn: { type: Number, default: new Date().getTime() },
      completion: { type: Boolean, default: false },
      disable: { type: Boolean, default: false },
      expiredOn: { type: Number },
    },
  ],
  assessments: [
    {
      assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
      assignedOn: { type: Number, default: new Date().getTime() },
      disable: { type: Boolean, default: false },
      completion: { type: Boolean, default: false },
    },
  ],
  disable: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

grade.index({ gradeName: "text" });

export default mongoose.model("Grade", grade);
