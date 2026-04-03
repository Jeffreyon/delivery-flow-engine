const IORedis = require("ioredis");
const { Queue } = require("bullmq");

const DEFAULT_BULLMQ_PREFIX = "delivery-flow-engine";
const DEFAULT_WORKER_CONCURRENCY = 5;

function parseWorkerConcurrency(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_WORKER_CONCURRENCY;
  }

  return parsed;
}

function getQueueConfig({ requireRedis = false } = {}) {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  const bullmqPrefix = String(process.env.BULLMQ_PREFIX || DEFAULT_BULLMQ_PREFIX).trim()
    || DEFAULT_BULLMQ_PREFIX;
  const workerConcurrency = parseWorkerConcurrency(process.env.WORKER_CONCURRENCY);

  if (requireRedis && !redisUrl) {
    throw new Error(
      "REDIS_URL is required to boot the async worker or create BullMQ queues"
    );
  }

  return {
    redisUrl: redisUrl || null,
    bullmqPrefix,
    workerConcurrency,
  };
}

function createRedisConnection({ requireRedis = false } = {}) {
  const { redisUrl } = getQueueConfig({ requireRedis });

  if (!redisUrl) {
    return null;
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function createQueue(queueName, options = {}) {
  const connection = options.connection || createRedisConnection({ requireRedis: true });
  const { bullmqPrefix } = getQueueConfig({ requireRedis: true });

  return new Queue(queueName, {
    connection,
    prefix: bullmqPrefix,
    defaultJobOptions: options.defaultJobOptions,
  });
}

async function closeRedisConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
}

module.exports = {
  DEFAULT_BULLMQ_PREFIX,
  DEFAULT_WORKER_CONCURRENCY,
  closeRedisConnection,
  createQueue,
  createRedisConnection,
  getQueueConfig,
};
