import amqp from "amqplib";
import dotenv from "dotenv";
import { logger } from "../app.js";
import { sentEmail } from "../controllers/emailController.js";
dotenv.config();

class rabbitMqConnection {
  #connection;
  #channel;

  #queueName;
  constructor() {
    this.rebbitMqConnection();
  }
  rebbitMqConnection = async () => {
    this.#connection = await amqp.connect(
      `amqp://${process.env.REBBIT_USER_NAME}:${process.env.REBBIT_USER_PASSWORD}@${process.env.REBBIT_USER_IP}:${process.env.REBBIT_USER_PORT}`
    );
    this.#channel = await this.#connection.createChannel();
  };
  produceQueue = async (payload) => {
    try {
      this.#queueName = "sent_email";
      await this.#channel.assertQueue(this.#queueName, { durable: true });
      let { error } = await this.#channel.sendToQueue(
        this.#queueName,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );
      if (!!error === true) {
        logger.error(`Error from function ${produceQueue}`, {
          stack: err.stack,
        });
        throw new Error(error);
      }
      await this.#channel.prefetch(1);
      await this.#channel.consume(this.#queueName, (message) => {
        let registerEmailPayload = JSON.parse(message.content.toString());
        sentEmail.emit("sentEmail", registerEmailPayload);
        this.#channel.ack(message);
      });
    } catch (error) {
      logger.error(`Error from function produceQueue`, { stack: error.stack });
    }
  };
}
const rabbitMqHelper = new rabbitMqConnection();
export default rabbitMqHelper;
