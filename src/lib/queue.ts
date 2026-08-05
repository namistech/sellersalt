import { Queue } from "bullmq";
import IORedis from "ioredis";

// Single Redis connection reused for queue + (in the worker process) the worker itself.
export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const PROSPECTING_QUEUE_NAME = "prospecting";

export interface ProspectingJobData {
  jobId: string; // Prisma Job.id — worker updates this row as it progresses
  organizationId: string;
  connectorId: string;
  searchConfigId: string;
}

export const prospectingQueue = new Queue<ProspectingJobData>(PROSPECTING_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep 7 days
    removeOnFail: { age: 60 * 60 * 24 * 30 },
  },
});
