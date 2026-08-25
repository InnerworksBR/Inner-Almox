import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { loadWorkerEnv } from "./config/env";
import { processFoundationJob } from "./processors/foundation";
import { FOUNDATION_QUEUE, type ValidationJobInput } from "./queues/foundation";
import { NOTIFICATION_QUEUE,type NotificationJobInput } from "./queues/notifications";
import { createNotificationProcessor } from "./processors/notifications";
import { ALERT_REFRESH_QUEUE,type AlertRefreshJobInput } from "./queues/alerts";
import { createAlertRefreshProcessor } from "./processors/alerts";

const env = loadWorkerEnv();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const worker = new Worker<ValidationJobInput>(FOUNDATION_QUEUE, processFoundationJob, {
  connection,
  concurrency: 2
});
const notificationWorker=new Worker<NotificationJobInput>(NOTIFICATION_QUEUE,createNotificationProcessor({supabaseUrl:env.SUPABASE_URL,serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,smtp:env.SMTP_HOST&&env.SMTP_PORT&&env.SMTP_FROM?{host:env.SMTP_HOST,port:env.SMTP_PORT,user:env.SMTP_USER,password:env.SMTP_PASSWORD,from:env.SMTP_FROM}:undefined}),{connection,concurrency:5});
const alertQueue=new Queue<AlertRefreshJobInput>(ALERT_REFRESH_QUEUE,{connection});
await alertQueue.upsertJobScheduler("hourly-alert-refresh",{every:60*60*1000},{name:"refresh-all-tenants",data:{requestedAt:new Date().toISOString()}});
const alertWorker=new Worker<AlertRefreshJobInput>(ALERT_REFRESH_QUEUE,createAlertRefreshProcessor({supabaseUrl:env.SUPABASE_URL,serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY}),{connection,concurrency:1});

worker.on("completed", (job) => {
  console.info(JSON.stringify({ event: "job.completed", queue: FOUNDATION_QUEUE, jobId: job.id }));
});

worker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "job.failed",
    queue: FOUNDATION_QUEUE,
    jobId: job?.id,
    error: error.message
  }));
});
notificationWorker.on("completed",job=>{console.info(JSON.stringify({event:"job.completed",queue:NOTIFICATION_QUEUE,jobId:job.id}));});
notificationWorker.on("failed",(job,error)=>{console.error(JSON.stringify({event:"job.failed",queue:NOTIFICATION_QUEUE,jobId:job?.id,error:error.message}));});
alertWorker.on("completed",job=>{console.info(JSON.stringify({event:"job.completed",queue:ALERT_REFRESH_QUEUE,jobId:job.id}));});
alertWorker.on("failed",(job,error)=>{console.error(JSON.stringify({event:"job.failed",queue:ALERT_REFRESH_QUEUE,jobId:job?.id,error:error.message}));});

async function shutdown(signal: string) {
  console.info(JSON.stringify({ event: "worker.shutdown", signal }));
  await worker.close();
  await notificationWorker.close();
  await alertWorker.close();
  await alertQueue.close();
  await connection.quit();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).then(() => { process.exitCode = 0; });
  });
}
