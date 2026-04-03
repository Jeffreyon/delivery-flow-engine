const dotenv = require("dotenv");
const logger = require("./src/core/logger");
const {
  closeRedisConnection,
  createRedisConnection,
  getQueueConfig,
} = require("./src/core/queue");

async function startWorker() {
  dotenv.config();

  const config = getQueueConfig({ requireRedis: true });
  const connection = createRedisConnection({ requireRedis: true });

  connection.on("error", (error) => {
    logger.error("worker_redis_error", { message: error.message });
  });

  await connection.ping();

  logger.info("worker_booted", {
    bullmqPrefix: config.bullmqPrefix,
    workerConcurrency: config.workerConcurrency,
    status: "idle",
  });
  logger.info("worker_ready_for_jobs", {
    message: "No BullMQ processors are registered yet",
  });

  const shutdown = async (signal) => {
    logger.info("worker_shutdown_started", { signal });
    await closeRedisConnection(connection);
    logger.info("worker_shutdown_complete", { signal });
  };

  process.once("SIGINT", async () => {
    await shutdown("SIGINT");
    process.exit(0);
  });

  process.once("SIGTERM", async () => {
    await shutdown("SIGTERM");
    process.exit(0);
  });

  return { connection, config };
}

if (require.main === module) {
  startWorker().catch((error) => {
    logger.error("worker_boot_failed", { message: error.message });
    process.exit(1);
  });
}

module.exports = {
  startWorker,
};
