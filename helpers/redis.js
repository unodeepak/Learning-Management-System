import { createClient } from "redis";
import { logger } from "../app.js";
dotenv.config();
import dotenv from "dotenv";
class redis {
  #client;
  constructor() {
    this.redisConnection();
  }
  async redisConnection() {
    let { error } = (this.#client = createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    }));
    await this.#client.connect();
    if (!!error === true) {
      logger.error(`Error from function redisConnection`, {
        stack: error.stack,
      });
      throw new Error(error);
    }
  }
  async setRedisHash(hash, key, value) {
    if (!!hash === false)
      throw new Error(`Please provide hash name for setting the hash`);
    if (!!key === false)
      throw new Error(`Please provide key name for setting the key`);
    if (!!value === false)
      throw new Error(`Please provide value  for setting the value`);
    const { error } = await this.#client.hSet(hash, key, JSON.stringify(value));
    if (!!error === true) {
      logger.error(`Error from function setRedisHash`, { stack: error.stack });
      throw new Error(error);
    }
  }

  async getDataFromRedisHash(hash, key) {
    if (!!hash === false)
      throw new Error(`Please provide hash name for getting the hash`);
    if (!!key === false)
      throw new Error(`Please provide key name for getting the key`);
    let result = await this.#client.hGet(hash, key);
    if (result === null) {
      return false;
    }
    result = JSON.parse(result);
    if (
      result !== null &&
      !!result === true &&
      Array.isArray(result) &&
      result.length > 0
    ) {
      return result;
    } else {
      return false;
    }
  }

  async delDataFromRedisHash(object) {
    if (!!object === false)
      throw new Error(`Please provide hash name for deleting the hash`);
    for (const iterator of object) {
      const { error } = await this.#client.del(iterator, `*${iterator}`);
      if (!!error === true) {
        logger.error(`Error from function setRedisHash`, {
          stack: error.stack,
        });
        throw new Error(error);
      }
    }
  }
}
const redisHelper = new redis();
export default redisHelper;
