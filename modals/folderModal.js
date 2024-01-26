import mongoose from "mongoose";

export const folder = mongoose.Schema({
  uId: { type: String, required: true, unique: true },
  folderName: { type: String, required: true, unique: true },
  isAssigned: { type: Boolean },
  description: { type: String },
  subFolder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subfolder" }],
  disable: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

export default mongoose.model("Folder", folder);
