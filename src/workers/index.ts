// Standalone worker process. Deployed as its own Coolify service (see SETUP.md),
// separate from the Next.js web app, so a slow/failed scrape run never blocks or
// slows down the dashboard.

import { Worker } from "bullmq";
import { prisma } from "../lib/db";
import { connection, PROSPECTING_QUEUE_NAME, type ProspectingJobData } from "../lib/queue";
import { decrypt } from "../lib/encryption";
import { getConnector } from "../connectors/registry";

console.log("Anadash worker starting, listening on queue:", PROSPECTING_QUEUE_NAME);

const worker = new Worker<ProspectingJobData>(
  PROSPECTING_QUEUE_NAME,
  async (job) => {
    const { jobId, organizationId, connectorId, searchConfigId } = job.data;

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
            marketplace: connectorRow.type as any,
            keyword: r.keyword,
            shopName: r.shopName,
            shopUrl: r.shopUrl,
            shopAgeMonths: r.shopAgeMonths,
            reviewCount: r.reviewCount,
            activeListings: r.activeListings,
            reviewRatio: r.reviewRatio,
            reviewVelocity: r.reviewVelocity,
            listingTitle: r.listingTitle,
            listingUrl: r.listingUrl,
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
      throw err; // let BullMQ record it as a failed job too
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
