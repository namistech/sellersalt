import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const PROSPECTING_QUEUE_NAME = "prospecting";
export const RUN_SEARCH_JOB_NAME = "run-search";
export const SCHEDULED_SEARCH_JOB_NAME = "scheduled-search";
export const TRACK_SHOP_JOB_NAME = "track-shop";
export const SYNC_SELLER_CHANNEL_JOB_NAME = "sync-seller-channel";
export const SEND_VERIFICATION_REMINDER_JOB_NAME = "send-verification-reminder";

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

export interface SellerChannelSyncJobData {
  sellerChannelId: string;
}

export interface VerificationReminderJobData {
  userId: string;
}

export const prospectingQueue = new Queue<
  ProspectingJobData | ShopWatchJobData | SellerChannelSyncJobData | VerificationReminderJobData
>(
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

export async function triggerScrapeJob(
  organizationId: string,
  searchConfigId: string,
  connectorId: string
) {
  const { prisma } = await import("@/lib/db");
  const job = await prisma.job.create({
    data: {
      organizationId,
      connectorId,
      searchConfigId,
      status: "QUEUED",
      triggeredBy: "USER",
    },
  });

  await prospectingQueue.add(
    RUN_SEARCH_JOB_NAME,
    {
      jobId: job.id,
      organizationId,
      connectorId,
      searchConfigId,
    },
    { jobId: job.id }
  );

  return job;
}

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

// Offset from SHOP_WATCH_CRON (7am) so both daily jobs don't compete for the
// same minute across every customer at once.
const SELLER_CHANNEL_SYNC_CRON = "0 8 * * *";

export async function startSellerChannelSync(sellerChannelId: string) {
  await stopSellerChannelSync(sellerChannelId);
  await prospectingQueue.add(
    SYNC_SELLER_CHANNEL_JOB_NAME,
    { sellerChannelId },
    { repeat: { pattern: SELLER_CHANNEL_SYNC_CRON }, jobId: `sync-${sellerChannelId}` }
  );
}

export async function stopSellerChannelSync(sellerChannelId: string) {
  const repeatables = await prospectingQueue.getRepeatableJobs();
  const existing = repeatables.filter((r) => r.id === `sync-${sellerChannelId}`);
  for (const r of existing) {
    await prospectingQueue.removeRepeatableByKey(r.key);
  }
}

// Completes the capped 3-email sequence started at signup: the immediate
// send happens inline in /api/signup, this schedules the remaining two
// (~6h, ~18h later). Each delayed job re-checks verification status and the
// shared rate-limit counters before sending, so it's a no-op if the user
// already verified or a manual resend already used up the cap.
export async function scheduleVerificationReminders(userId: string) {
  await prospectingQueue.add(
    SEND_VERIFICATION_REMINDER_JOB_NAME,
    { userId },
    { delay: 6 * 60 * 60 * 1000, jobId: `verify-reminder-${userId}-2` }
  );
  await prospectingQueue.add(
    SEND_VERIFICATION_REMINDER_JOB_NAME,
    { userId },
    { delay: 18 * 60 * 60 * 1000, jobId: `verify-reminder-${userId}-3` }
  );
}
