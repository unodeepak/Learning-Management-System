import mongoose from "mongoose";
import userModal from "./userModal.js";

const teacher = mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  surName: { type: String },
  fullName: { type: String, required: false },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  teacherImg: { type: String },
  enrollmentDate: { type: String, required: true },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  gradeNdivision: [
    {
      divisionId: { type: mongoose.Schema.Types.ObjectId, ref: "Division" },
      gradeId: { type: mongoose.Schema.Types.ObjectId, ref: "Grade" },
      devisionStatus: { type: Boolean, default: false },
      assignedOn: { type: Number, default: null },
      disable: { type: Boolean, default: false },
    },
  ],
  coursesForLearn: [
    //not in use we use for teach libry from course assignedTeacher
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      assignedOn: { type: Number, default: null },
      disable: { type: Boolean, default: false },
      expiredOn: { type: Number },
    },
  ],
  coursesForTeach: [
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      assignedOn: { type: Number, default: null },
      disable: { type: Boolean, default: false },
      expiredOn: { type: Number },
    },
  ],
  assessmentsForAssess: [
    {
      assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
      assignedOn: { type: Number, default: null },
      completion: { type: Boolean, default: false },
      disable: { type: Boolean, default: false },
    },
  ],
});

teacher.index({ fullName: "text" });

export default userModal.discriminator("Teacher", teacher);
