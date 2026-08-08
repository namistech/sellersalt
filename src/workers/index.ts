import { Worker } from "bullmq";
import { prisma } from "../lib/db";
import {
  connection,
  PROSPECTING_QUEUE_NAME,
  TRACK_SHOP_JOB_NAME,
  type ProspectingJobData,
  type ShopWatchJobData,
} from "../lib/queue";
import { decrypt } from "../lib/encryption";
import { getConnector } from "../connectors/registry";

console.log("Anadash worker starting, listening on queue:", PROSPECTING_QUEUE_NAME);

async function handleProspectingJob(job: { data: ProspectingJobData }) {
  const { organizationId, connectorId, searchConfigId } = job.data;
  let jobId = job.data.jobId;

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
