import { app } from "./app.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cronShadule from "./helpers/cron.js";
import redisHelper from "./helpers/redis.js";
dotenv.config();
import cluster from "node:cluster";
import http from "node:http";
import { cpus } from "node:os";
import process from "node:process";
const numCPUs = cpus().length;
const PORT = process.env.PORT || 8000;
cronShadule.shaduleCroneFun();
redisHelper.redisConnection();
// createCluster()
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Mongo DB successfully Connected");
  })
  .then(() => {
    let timeout;
    if (cluster.isPrimary) {
      for (let index = 0; index < numCPUs; index++) {
        cluster.fork();
      }
      cluster.on("exit", (worker, code, signal) => {
        console.log(
          `Worker ${worker.process.pid} died with code ${code} and signal ${signal}`
        );
        const newWorker = cluster.fork();

        newWorker.on("listening", (address) => {
          console.log(
            `Worker is listening ${newWorker.process.pid} is listening on address ${address}`
          );
          worker.send("shutdown");
          worker.disconnect();
          timeout = setTimeout(() => {
            worker.kill();
          }, 2000);
        });
        worker.on("disconnect", () => {
          clearTimeout(timeout);
        });
      });
    } else {
      app.listen(PORT, () => {
        console.clear();
        console.log(`server is running at port ${PORT}`);
        console.log(`Worker ${process.pid} started`);
      });
    }
  })
  .catch((err) => {
    console.log(`Error from mongo connection`, err.message);
  });
