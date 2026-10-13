import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { loadWorkerEnv } from "./config/env";
import { processFoundationJob } from "./processors/foundation";
import { createNotificationProcessor } from "./processors/notifications";
import { createAlertRefreshProcessor } from "./processors/alerts";
import { FOUNDATION_QUEUE, type ValidationJobInput } from "./queues/foundation";
import { NOTIFICATION_QUEUE, type NotificationJobInput } from "./queues/notifications";
import { ALERT_REFRESH_QUEUE, type AlertRefreshJobInput } from "./queues/alerts";
import { attachJobEvents } from "./services/job-events";
import { NoopJobRegistry, SupabaseJobRegistry, type JobRegistry } from "./services/job-registry";

const env = loadWorkerEnv();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const jobRegistry: JobRegistry = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? new SupabaseJobRegistry(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : new NoopJobRegistry();

const worker = new Worker<ValidationJobInput>(FOUNDATION_QUEUE, processFoundationJob, {
  connection,
  concurrency: 2
});
const notificationWorker = new Worker<NotificationJobInput>(
  NOTIFICATION_QUEUE,
  createNotificationProcessor({
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    smtp: env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM
      ? { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.SMTP_FROM }
      : undefined
  }),
  { connection, concurrency: 5 }
);
const notificationQueue = new Queue<NotificationJobInput>(NOTIFICATION_QUEUE, { connection });
const alertQueue = new Queue<AlertRefreshJobInput>(ALERT_REFRESH_QUEUE, { connection });
await alertQueue.upsertJobScheduler(
  "hourly-alert-refresh",
  { every: 60 * 60 * 1000 },
  { name: "refresh-all-tenants", data: { requestedAt: new Date().toISOString() } }
);
const alertWorker = new Worker<AlertRefreshJobInput>(
  ALERT_REFRESH_QUEUE,
  createAlertRefreshProcessor({
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    jobRegistry,
    publishNotification: async (input) => {
      const job = await notificationQueue.add("email-alert", input, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 100,
        removeOnFail: 500
      });
      return String(job.id);
    }
  }),
  { connection, concurrency: 1 }
);

attachJobEvents(worker, FOUNDATION_QUEUE, jobRegistry);
attachJobEvents(notificationWorker, NOTIFICATION_QUEUE, jobRegistry);
attachJobEvents(alertWorker, ALERT_REFRESH_QUEUE, jobRegistry);

worker.on("completed", (job) => {
  console.info(JSON.stringify({ event: "job.completed", queue: FOUNDATION_QUEUE, jobId: job.id }));
});
worker.on("failed", (job, error) => {
  console.error(JSON.stringify({ event: "job.failed", queue: FOUNDATION_QUEUE, jobId: job?.id, error: error.message }));
});
notificationWorker.on("completed", (job) => {
  console.info(JSON.stringify({ event: "job.completed", queue: NOTIFICATION_QUEUE, jobId: job.id }));
});
notificationWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({ event: "job.failed", queue: NOTIFICATION_QUEUE, jobId: job?.id, error: error.message }));
});
alertWorker.on("completed", (job) => {
  console.info(JSON.stringify({ event: "job.completed", queue: ALERT_REFRESH_QUEUE, jobId: job.id }));
});
alertWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({ event: "job.failed", queue: ALERT_REFRESH_QUEUE, jobId: job?.id, error: error.message }));
});

async function shutdown(signal: string) {
  console.info(JSON.stringify({ event: "worker.shutdown", signal }));
  await worker.close();
  await notificationWorker.close();
  await notificationQueue.close();
  await alertWorker.close();
  await alertQueue.close();
  await connection.quit();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).then(() => { process.exitCode = 0; });
  });
}
