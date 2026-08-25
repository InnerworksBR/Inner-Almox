import { Queue } from "bullmq";
import Redis from "ioredis";
import type { QueuePublisher, ValidationJobInput } from "../types/context";

export const FOUNDATION_QUEUE = "foundation-validation";

export class RedisQueuePublisher implements QueuePublisher {
  private readonly connection: Redis;
  private readonly queue: Queue<ValidationJobInput>;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    this.queue = new Queue<ValidationJobInput>(FOUNDATION_QUEUE, { connection: this.connection });
  }

  async publishValidation(input: ValidationJobInput): Promise<string> {
    const job = await this.queue.add("validate-foundation", input, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 500
    });
    return String(job.id);
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
