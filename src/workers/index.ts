import { Worker } from "bullmq";
import { prisma } from "../lib/db";
import {
  connection,
  PROSPECTING_QUEUE_NAME,
  TRACK_SHOP_JOB_NAME,
  SYNC_SELLER_CHANNEL_JOB_NAME,
  SEND_VERIFICATION_REMINDER_JOB_NAME,
  type ProspectingJobData,
  type ShopWatchJobData,
  type SellerChannelSyncJobData,
  type VerificationReminderJobData,
} from "../lib/queue";
import { MarketplaceRegistry, registerAllConnectors } from "../marketplaces/core/registry";
import { runProductResearch } from "../marketplaces/core/research-pipeline";
import type { MarketplaceId } from "../marketplaces/core/types";
import { sendEmail } from "../lib/send-email";
import { syncSellerChannel } from "../lib/sync-seller-channel";
import { sendVerificationEmail } from "../lib/email-verification";
import { getSnapshotRetentionCutoff } from "../lib/data-retention";

console.log("SellerSalt worker starting, listening on queue:", PROSPECTING_QUEUE_NAME);

async function notifyNewProspects(organizationId: string, searchConfigName: string, count: number) {
  try {
    const members = await prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { email: true } } },
    });
    const appUrl = process.env.NEXTAUTH_URL ?? "";
    await Promise.all(
      members.map((m: (typeof members)[number]) =>
        sendEmail({
          to: m.user.email,
          subject: `SellerSalt: "${searchConfigName}" found ${count} new prospect${count === 1 ? "" : "s"}`,
          html: `
            <p>Your scheduled search <strong>${searchConfigName}</strong> just found ${count} new prospect${count === 1 ? "" : "s"}.</p>
            <p><a href="${appUrl}/prospects">View them in your dashboard</a></p>
          `,
          text: `"${searchConfigName}" found ${count} new prospects: ${appUrl}/prospects`,
        })
      )
    );
  } catch (err) {
    // Never let a notification failure affect the job's own success/failure status.
    console.error("Failed to send new-prospects notification:", err);
  }
}

async function handleProspectingJob(job: { data: ProspectingJobData }) {
  const { organizationId, connectorId, searchConfigId } = job.data;
  let jobId = job.data.jobId;
  const isScheduled = !job.data.jobId;

  if (!jobId) {
    const created = await prisma.job.create({
      data: { organizationId, connectorId, searchConfigId, status: "QUEUED", triggeredBy: "SCHEDULE" },
    });
    jobId = created.id;
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const [connectorRow, searchConfig] = await Promise.all([
      prisma.connector.findUniqueOrThrow({ where: { id: connectorId } }),
      prisma.searchConfig.findUniqueOrThrow({ where: { id: searchConfigId } }),
    ]);

    // Migrated off the old connector registry onto the marketplace-neutral
    // pipeline (src/marketplaces/core/research-pipeline.ts) — ETSY is the
    // only ConnectorType with a real research connector today, so this
    // resolves to exactly the same Etsy search this job always ran; a
    // future connectorRow.type of AMAZON/EBAY/etc. now degrades to a
    // clean UNAVAILABLE/NOT_IMPLEMENTED job failure instead of an
    // unhandled crash.
    const marketplace = connectorRow.type.toLowerCase() as MarketplaceId;
    const research = await runProductResearch({
      marketplace,
      type: "products",
      organizationId,
      keywords: searchConfig.keywords,
      minPrice: searchConfig.minPrice,
      maxPrice: searchConfig.maxPrice,
      minShopAgeMonths: searchConfig.minShopAgeMonths,
      maxShopAgeMonths: searchConfig.maxShopAgeMonths,
      minReviewCount: searchConfig.minReviewCount,
    });

    if (research.status !== "AVAILABLE") {
      throw new Error(research.message || `${marketplace} research is not available (${research.status}).`);
    }

    const results = research.products;

    if (results.length > 0) {
      // Batch 40: shopAgeMonths/reviewCount/activeListings/reviewRatio/
      // reviewVelocity/price all used to default to a fabricated
      // placeholder (0) whenever the connector genuinely didn't observe
      // the field. All six are now nullable — write null, never a guess.
      await prisma.prospect.createMany({
        data: results.map((r) => ({
          organizationId,
          searchConfigId,
          jobId,
          marketplace: connectorRow.type as any,
          keyword: r.keyword ?? "",
          shopExternalId: r.shop?.externalId ?? "",
          listingExternalId: r.externalId,
          shopName: r.shop?.name ?? "",
          shopUrl: r.shop?.url ?? "",
          shopIconUrl: r.shop?.iconUrl,
          shopAgeMonths: r.shop?.ageMonths ?? null,
          reviewCount: r.reviewCount ?? null,
          activeListings: r.shop?.activeListings ?? null,
          reviewRatio: r.shop?.reviewRatio ?? null,
          reviewVelocity: r.shop?.reviewVelocity ?? null,
          totalSales: r.salesCount,
          reviewAverage: r.rating,
          numFavorers: r.favoritesCount,
          avgSellingRatio: r.shop?.avgSellingRatio,
          estDailySales: r.estimatedDemand,
          listingTitle: r.title,
          listingUrl: r.url ?? "",
          listingImageUrl: r.imageUrl,
          price: r.price ?? null,
        })),
      });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "SUCCESS", finishedAt: new Date(), resultCount: results.length },
    });

    // Only notify for scheduled (unattended) runs — a manual "Run now" click
    // means the user is already watching the Jobs page for the result.
    if (isScheduled && results.length > 0) {
      await notifyNewProspects(organizationId, searchConfig.name, results.length);
    }
  } catch (err: any) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: err.message ?? String(err) },
    });
    throw err;
  }
}

async function handleShopWatchJob(job: { data: ShopWatchJobData }) {
  const { shopWatchId, organizationId, connectorId, shopExternalId } = job.data;

  try {
    registerAllConnectors();

    let connectorRow = connectorId
      ? await prisma.connector.findUnique({ where: { id: connectorId } })
      : null;

    if (!connectorRow) {
      connectorRow =
        (await prisma.connector.findFirst({ where: { organizationId, type: "ETSY", status: "ACTIVE" } })) ||
        (await prisma.connector.findFirst({ where: { organizationId: null, type: "ETSY", status: "ACTIVE" } }));
    }

    if (!connectorRow) {
      console.warn(`[SHOP_WATCH_WORKER] No active connector found for org ${organizationId}`);
      return;
    }

    const marketplace = connectorRow.type.toLowerCase() as MarketplaceId;
    const connector = MarketplaceRegistry.tryGetConnector(marketplace);
    if (!connector || !connector.getPublicShopStats) {
      console.warn(`[SHOP_WATCH_WORKER] Connector for ${marketplace} does not support public shop stats`);
      return;
    }

    const stats = await connector.getPublicShopStats(shopExternalId, organizationId);
    if (!stats) return;

    await prisma.shopSnapshot.create({
      data: {
        shopWatchId,
        totalSales: stats.totalSales,
        reviewCount: stats.reviewCount ?? 0,
        reviewAverage: stats.reviewAverage,
        activeListings: stats.activeListings ?? 0,
        numFavorers: stats.numFavorers,
      },
    });

    // Data minimization: prune snapshots outside the widest tracking window
    // any active plan actually sells (see src/lib/data-retention.ts) so
    // Etsy-derived history is never kept longer than the service needs it.
    const retentionCutoff = await getSnapshotRetentionCutoff();
    await prisma.shopSnapshot.deleteMany({
      where: { shopWatchId, capturedAt: { lt: retentionCutoff } },
    }).catch(() => {});

    console.log(`[SHOP_WATCH_WORKER] Captured snapshot for shop ${shopExternalId} (${stats.name}) on ${marketplace}`);
  } catch (err: any) {
    console.error(`[SHOP_WATCH_WORKER_ERROR] Failed shop watch for ${shopExternalId}:`, err.message);
  }
}

async function handleVerificationReminderJob(job: { data: VerificationReminderJobData }) {
  const { userId } = job.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return; // account deleted since the reminder was scheduled
  await sendVerificationEmail(user, { trigger: "reminder" });
}

const worker = new Worker(
  PROSPECTING_QUEUE_NAME,
  async (job) => {
    if (job.name === TRACK_SHOP_JOB_NAME) {
      await handleShopWatchJob(job as { data: ShopWatchJobData });
    } else if (job.name === SYNC_SELLER_CHANNEL_JOB_NAME) {
      const { sellerChannelId } = job.data as SellerChannelSyncJobData;
      await syncSellerChannel(sellerChannelId);
    } else if (job.name === SEND_VERIFICATION_REMINDER_JOB_NAME) {
      await handleVerificationReminderJob(job as { data: VerificationReminderJobData });
    } else {
      await handleProspectingJob(job as { data: ProspectingJobData });
    }
  },
  { connection, concurrency: 3 }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
