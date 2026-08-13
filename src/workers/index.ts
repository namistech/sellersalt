import { Worker } from "bullmq";
import { prisma } from "../lib/db";
import {
  connection,
  PROSPECTING_QUEUE_NAME,
  TRACK_SHOP_JOB_NAME,
  SYNC_SELLER_CHANNEL_JOB_NAME,
  type ProspectingJobData,
  type ShopWatchJobData,
  type SellerChannelSyncJobData,
} from "../lib/queue";
import { decrypt } from "../lib/encryption";
import { getConnector } from "../connectors/registry";
import { sendEmail } from "../lib/send-email";
import { syncSellerChannel } from "../lib/sync-seller-channel";

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

    const connector = getConnector(connectorRow.type);
    const credentials = JSON.parse(decrypt(connectorRow.encryptedCredentials));

    const results = await connector.runSearch(credentials, {
      keywords: searchConfig.keywords,
      minPrice: searchConfig.minPrice,
      maxPrice: searchConfig.maxPrice,
      minShopAgeMonths: searchConfig.minShopAgeMonths,
      maxShopAgeMonths: searchConfig.maxShopAgeMonths,
      minReviewCount: searchConfig.minReviewCount,
    });

    if (results.length > 0) {
      await prisma.prospect.createMany({
        data: results.map((r) => ({
          organizationId,
          searchConfigId,
          jobId,
          marketplace: connectorRow.type as any,
          keyword: r.keyword,
          shopExternalId: r.shopExternalId,
          listingExternalId: r.listingExternalId,
          shopName: r.shopName,
          shopUrl: r.shopUrl,
          shopIconUrl: r.shopIconUrl,
          shopAgeMonths: r.shopAgeMonths,
          reviewCount: r.reviewCount,
          activeListings: r.activeListings,
          reviewRatio: r.reviewRatio,
          reviewVelocity: r.reviewVelocity,
          totalSales: r.totalSales,
          reviewAverage: r.reviewAverage,
          numFavorers: r.numFavorers,
          avgSellingRatio: r.avgSellingRatio,
          estDailySales: r.estDailySales,
          listingTitle: r.listingTitle,
          listingUrl: r.listingUrl,
          listingImageUrl: r.listingImageUrl,
          price: r.price,
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
  const { shopWatchId, connectorId, shopExternalId } = job.data;

  const connectorRow = await prisma.connector.findUniqueOrThrow({ where: { id: connectorId } });
  const connector = getConnector(connectorRow.type);
  if (!connector.getShopStats) return;

  const credentials = JSON.parse(decrypt(connectorRow.encryptedCredentials));
  const stats = await connector.getShopStats(credentials, shopExternalId);
  if (!stats) return;

  await prisma.shopSnapshot.create({
    data: {
      shopWatchId,
      totalSales: stats.totalSales,
      reviewCount: stats.reviewCount,
      reviewAverage: stats.reviewAverage,
      activeListings: stats.activeListings,
      numFavorers: stats.numFavorers,
    },
  });
}

const worker = new Worker(
  PROSPECTING_QUEUE_NAME,
  async (job) => {
    if (job.name === TRACK_SHOP_JOB_NAME) {
      await handleShopWatchJob(job as { data: ShopWatchJobData });
    } else if (job.name === SYNC_SELLER_CHANNEL_JOB_NAME) {
      const { sellerChannelId } = job.data as SellerChannelSyncJobData;
      await syncSellerChannel(sellerChannelId);
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
