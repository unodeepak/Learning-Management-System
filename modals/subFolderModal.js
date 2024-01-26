import mongoose from "mongoose";

const subfolder = mongoose.Schema({
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    required: true,
  },
  uId: { type: String, required: true },
  subFolderName: { type: String, required: true },
  pdfThumbnail: { type: String },
  pdfUrl: { type: String },
  flipBookStatus: { type: String },
  s3PdfLink: { type: String },
  heyzineUrl: { type: String },
  disable: { type: Boolean, default: false },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
});

export default mongoose.model("Subfolder", subfolder);
