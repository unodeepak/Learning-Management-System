import mongoose from "mongoose";

const subfoldertrack = mongoose.Schema({
  subFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subfolder",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  accessibility: { type: Number, default: 0 },
  accessLimit: { type: Number, default: 5 },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

export default mongoose.model("SubfolderTrack", subfoldertrack);
