import mongoose from "mongoose";

const subSkill = mongoose.Schema({
  uId: { type: String, required: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
  subSkillName: { type: String, required: true },
  description: { type: String, required: true },
  rubricsQts: [
    {
      quesDesc: { type: String },
      quesMarks: { type: Number, default: 10 },
    },
  ],
  disable: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

subSkill.index({ subSkillName: "text" });

export default mongoose.model("Subskill", subSkill);
