import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Cryptr from "cryptr";
import dotenv from "dotenv";
dotenv.config();
const cryptr = new Cryptr(process.env.CRYPTO_SCRET_KEY);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: false },
    mobile: { type: String, required: false },
    countryCode: { type: String, required: false },
    countryName: { type: String, required: false },
    firstName: { type: String, required: false },
    middleName: { type: String },
    surName: { type: String },
    fullName: { type: String, required: false },
    uId: { type: String, required: true },
    password: { type: String, minlength: 6, select: false },
    disable: { type: Boolean, default: false },
    createdOn: { type: Number, default: null },
    updatedOn: { type: Number, default: null },
    macAddress: { type: String },
    adminImg: { type: String },
    userRole: { type: Number, enum: [1, 2, 3] },
    deviceToken: { type: String, default: null },
    deviceType: { type: String, default: null },
  },
  { discriminatorKey: "role", timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const encryptedData = cryptr.encrypt(this.password);
  this.password = encryptedData;
  next();
});

UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", UserSchema);
