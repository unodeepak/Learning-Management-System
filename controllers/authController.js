import userModal from "../modals/userModal.js";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import Cryptr from "cryptr";
import dotenv from "dotenv";
import getMAC, { isMAC } from "getmac";
import mongoose from "mongoose";
import os from "os";
import { logger } from "../app.js";
import { log } from "console";
import redisHelper from "../helpers/redis.js";
dotenv.config();
const cryptr = new Cryptr(process.env.CRYPTO_SECRET_KEY);

export const login = async (req, res) => {
  try {
    const {
      emailMobUid,
      password,
      userRole,
      deviceToken = "",
      deviceType = "",
      macAddress,
    } = req.body;
    if (!!emailMobUid === false && emailMobUid.length <= 0) {
      return res.status(401).json({
        message: "Uid is required !",
        status: false,
      });
    }
    if (!!password === false && password.length <= 0) {
      return res.status(401).json({
        message: "Password  is required !",
        status: false,
      });
    }

    if (!!macAddress === false && macAddress.length <= 0) {
      return res.status(401).json({
        message: "Mac Address  is required !",
        status: false,
      });
    }
    let userExists = await userModal
      .findOne({
        uId: emailMobUid,
      })
      .select("+password");
    if (!!userExists === false || userExists.length <= 0) {
      return res.status(401).json({
        message: "Please enter correct uid or password",
        status: false,
      });
    }
    if (
      !!userExists === true &&
      !!userRole === true &&
      userExists?.userRole != userRole
    ) {
      return res.status(401).json({
        message: "Please enter correct uid or password",
        status: false,
      });
    }
    if (userExists.access === 0) {
      return res.status(401).json({
        message:
          "Your access has been blocked, please contact the administrator ",
        status: false,
      });
    }

    const originalText = cryptr.decrypt(userExists?.password);
    if (
      !!originalText === true &&
      !!password === true &&
      "password" in userExists &&
      password.trim() !== originalText.trim()
    ) {
      return res.status(401).json({
        message: "The password you entered is incorrect",
        status: false,
      });
    }
    let token = jwt.sign(
      { userId: userExists._id, userRole: userExists.userRole },
      process.env.jwtKey
    );
    await userModal.updateOne(
      { _id: new mongoose.Types.ObjectId(userExists._id) },
      {
        macAddress: macAddress,
        deviceToken: deviceToken,
        deviceType: deviceType,
      }
    );
    return res.status(200).json({
      status: true,
      message: "Login Successful",
      userId: userExists._id,
      userRole: userExists.userRole,
      token: token,
    });
  } catch (e) {
    logger.error(`Error from function ${login.name}`, { stack: e.stack });
    return res.status(500).status({ message: "Server Error", status: false });
  }
};

/**
 * This function is used to logout because we need to make condition like if user already exist with other device so he should logged out from first device
 * @returns {object}
 * @payload N/A
 * @method Post
 */

export const logOut = async (req, res) => {
  try {
    const { userId } = req.user;
    const userExist = await userModal.findById(userId);
    if (
      !!userExist === true &&
      "macAddress" in userExist &&
      !!userExist?.macAddress === true
    ) {
      const { error } = await userModal.updateOne(
        { _id: userId },
        { $unset: { macAddress: 1, deviceToken: 1, deviceType: 1 } }
      );
      if (!!error === true) {
        throw new Error(error);
      }
    }
    return res.status(201).json({
      status: true,
      message: "You are logged out successfully",
    });
  } catch (err) {
    logger.error(`Error from function ${logOut.name}`, { stack: err.stack });
    return res.status(500).json({ message: err.message });
  }
};
