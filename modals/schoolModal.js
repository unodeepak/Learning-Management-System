import mongoose from "mongoose";

const school = mongoose.Schema({
  schoolUid: { type: String, required: true, unique: true },
  schoolName: { type: String, required: true },
  mobile: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  pinCode: { type: Number, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  grades: [{ type: mongoose.Schema.Types.ObjectId, ref: "Grade" }],
  schoolLogoUrl: { type: String },
  websiteUrl: { type: String },
  countryCode: { type: String, required: false },
  disable: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

school.index({ schoolName: "text" });

export default mongoose.model("School", school);
