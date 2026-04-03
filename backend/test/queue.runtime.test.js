const {
  DEFAULT_BULLMQ_PREFIX,
  DEFAULT_WORKER_CONCURRENCY,
  getQueueConfig,
} = require("../src/core/queue");

describe("queue runtime config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.BULLMQ_PREFIX;
    delete process.env.WORKER_CONCURRENCY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns safe defaults when redis is optional", () => {
    expect(getQueueConfig()).toEqual({
      redisUrl: null,
      bullmqPrefix: DEFAULT_BULLMQ_PREFIX,
      workerConcurrency: DEFAULT_WORKER_CONCURRENCY,
    });
  });

  test("throws when redis is required but missing", () => {
    expect(() => getQueueConfig({ requireRedis: true })).toThrow(
      "REDIS_URL is required to boot the async worker or create BullMQ queues"
    );
  });

  test("normalizes the configured env contract", () => {
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    process.env.BULLMQ_PREFIX = "delivery-flow-engine-staging";
    process.env.WORKER_CONCURRENCY = "9";

    expect(getQueueConfig({ requireRedis: true })).toEqual({
      redisUrl: "redis://127.0.0.1:6379",
      bullmqPrefix: "delivery-flow-engine-staging",
      workerConcurrency: 9,
    });
  });

  test("falls back to the default worker concurrency on invalid input", () => {
    process.env.WORKER_CONCURRENCY = "0";

    expect(getQueueConfig()).toEqual({
      redisUrl: null,
      bullmqPrefix: DEFAULT_BULLMQ_PREFIX,
      workerConcurrency: DEFAULT_WORKER_CONCURRENCY,
    });
  });
});
