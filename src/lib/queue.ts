import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const PROSPECTING_QUEUE_NAME = "prospecting";
export const RUN_SEARCH_JOB_NAME = "run-search";
export const SCHEDULED_SEARCH_JOB_NAME = "scheduled-search";
export const TRACK_SHOP_JOB_NAME = "track-shop";

export interface ProspectingJobData {
  jobId?: string;
  organizationId: string;
  connectorId: string;
  searchConfigId: string;
}

export interface ShopWatchJobData {
  shopWatchId: string;
  organizationId: string;
  connectorId: string;
  shopExternalId: string;
}

export const prospectingQueue = new Queue<ProspectingJobData | ShopWatchJobData>(
  PROSPECTING_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24 * 7 },
      removeOnFail: { age: 60 * 60 * 24 * 30 },
    },
  }
);

export const SCHEDULE_FREQUENCIES: Record<string, string | null> = {
  MANUAL: null,
  EVERY_6_HOURS: "0 */6 * * *",
  DAILY: "0 6 * * *",
  WEEKLY: "0 6 * * 1",
};

export async function upsertSchedule(params: {
  searchConfigId: string;
  organizationId: string;
  connectorId: string;
  cronPattern: string;
}) {
  await removeSchedule(params.searchConfigId);
  await prospectingQueue.add(
    SCHEDULED_SEARCH_JOB_NAME,
    {
      organizationId: params.organizationId,
      connectorId: params.connectorId,
      searchConfigId: params.searchConfigId,
    },
    { repeat: { pattern: params.cronPattern }, jobId: params.searchConfigId }
  );
}

export async function removeSchedule(searchConfigId: string) {
  const repeatables = await prospectingQueue.getRepeatableJobs();
  const existing = repeatables.filter((r) => r.id === searchConfigId);
  for (const r of existing) {
    await prospectingQueue.removeRepeatableByKey(r.key);
  }
}

const SHOP_WATCH_CRON = "0 7 * * *";

export async function startShopWatch(params: {
  shopWatchId: string;
  organizationId: string;
  connectorId: string;
  shopExternalId: string;
}) {
  await stopShopWatch(params.shopWatchId);
  await prospectingQueue.add(
    TRACK_SHOP_JOB_NAME,
    {
      shopWatchId: params.shopWatchId,
      organizationId: params.organizationId,
      connectorId: params.connectorId,
      shopExternalId: params.shopExternalId,
    },
    { repeat: { pattern: SHOP_WATCH_CRON }, jobId: `watch-${params.shopWatchId}` }
  );
}

export async function stopShopWatch(shopWatchId: string) {
  const repeatables = await prospectingQueue.getRepeatableJobs();
  const existing = repeatables.filter((r) => r.id === `watch-${shopWatchId}`);
  for (const r of existing) {
    await prospectingQueue.removeRepeatableByKey(r.key);
  }
}
