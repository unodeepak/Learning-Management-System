import mongoose from "mongoose";
//If Already Result Generate and
// we delete subSkill or mainSkill
// that we need to consist
// skillName and skillSubSkill
const result = mongoose.Schema({
  learnerId: { type: mongoose.Types.ObjectId, ref: "Learner" },
  assessmentId: { type: mongoose.Types.ObjectId },
  assessmentName: { type: String },
  assessmentUId: { type: String },
  skillId: { type: mongoose.Types.ObjectId },
  subSkillId: { type: mongoose.Types.ObjectId },
  SkillName: { type: String },
  subSkillName: { type: String },
  maxMarks: { type: Number },
  totalObtainMarks: { type: Number },
  rubricsQts: { type: Array },
  // Structure of rubricsQts>array should be like:
  //   [{
  //     "quesDesc": "Jump at least once",
  //     "quesMarks": 20,
  //     "eachObtainMarks": 10,
  //     "1(Beginner)-2(Progressing)-3(Proficient)-4(Advanced)
  // }],
  assessedBy: { type: mongoose.Types.ObjectId },
  assessedOn: { type: Number, default: null },
});

export default mongoose.model("Result", result);
