import events from "events";
const event = new events.EventEmitter();
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import { logger } from "../app.js";
import redisHelper from "../helpers/redis.js";

export const sentEmail = event.on("sentEmail", async (payload) => {
  try {
    if (!!payload === false) {
      throw new Error(`Payload is required for sending email`);
    }

    const transport = await nodemailer.createTransport({
      host: process.env.HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.PASSWORD,
      },
    });
    let emailOptions = new Object();
    emailOptions.from = process.env.FROM_EMAIL;
    emailOptions.to = payload.email;
    emailOptions.subject = payload.subject;
    emailOptions.html = payload.html;
    let { error } = await transport.sendMail(emailOptions);
    if (error === true) {
      logger.error(`Error from function sentEmail event`, {
        stack: error.stack,
      });
      throw new Error(error);
    }
  } catch (error) {
    logger.error(`Error from function sentEmail event`, { stack: error.stack });
    throw new Error(error);
  }
});
