import axios from "axios";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  EtsyExecutionOperation,
  EtsyExecutionStatus,
  ListingDraftStatus,
  PlannerItemStatus,
} from "@prisma/client";
import { executeWithRetry } from "@/connectors/etsy/client";
import { refreshEtsySellerToken, type EtsyCredentials } from "@/seller-channels/etsy-seller";
import { mapDraftToEtsyPayload, validateEtsyListingPayload } from "./mapper";

const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

export interface ExecutionServiceResult {
  success: boolean;
  operationType: EtsyExecutionOperation;
  etsyListingId?: string;
  etsyDraftUrl?: string;
  statusCode?: number;
  errorMessage?: string;
  executionLogId?: string;
  idempotencyKey: string;
}

/**
 * Resolves active Etsy Seller Channel for an organization.
 */
async function resolveChannelCredentials(
  organizationId: string,
  sellerChannelId?: string
): Promise<{ channelId: string; creds: EtsyCredentials; clientId: string }> {
  const channel = await prisma.sellerChannel.findFirst({
    where: {
      organizationId,
      platform: "ETSY_SELLER",
      status: "ACTIVE",
      ...(sellerChannelId ? { id: sellerChannelId } : {}),
    },
  });

  if (!channel || !channel.encryptedCredentials) {
    throw new Error(
      "No active Etsy seller channel connected. Please connect your Etsy store under Settings -> Channels."
    );
  }

  let creds: EtsyCredentials;
  try {
    const decrypted = decrypt(channel.encryptedCredentials);
    creds = JSON.parse(decrypted);
  } catch (err: any) {
    throw new Error(`Failed to decrypt Etsy seller credentials: ${err.message}`);
  }

  const clientId = process.env.ETSY_SELLER_CLIENT_ID || process.env.ETSY_API_KEY || creds.apiKey;
  if (!clientId) {
    throw new Error("Etsy seller client ID is missing from environment configuration.");
  }

  return { channelId: channel.id, creds, clientId };
}

/**
 * Creates an Etsy Draft Listing from an APPROVED SellerSalt ListingDraft.
 * Enforces Human Review Gate, Validation Gate, Idempotency, and Multi-Tenant Isolation.
 */
export async function createEtsyDraftListing(params: {
  organizationId: string;
  userId?: string;
  listingDraftId: string;
  sellerChannelId?: string;
  customIdempotencyKey?: string;
}): Promise<ExecutionServiceResult> {
  const { organizationId, userId, listingDraftId, sellerChannelId, customIdempotencyKey } = params;

  // 1. Fetch draft with strict tenant isolation
  const draft = await prisma.listingDraft.findFirst({
    where: { id: listingDraftId, organizationId },
    include: { plannerItem: true },
  });

  if (!draft) {
    throw new Error("Listing draft not found or unauthorized access.");
  }

  // 2. Human Review Gate: Reject unapproved drafts
  if (draft.status !== ListingDraftStatus.APPROVED && draft.status !== ListingDraftStatus.PUSHED_TO_ETSY) {
    throw new Error(
      `Listing draft must be in APPROVED status before pushing to Etsy. Current status: ${draft.status}. Please approve the draft first.`
    );
  }

  // 3. Pre-flight Validation Gate
  const validation = validateEtsyListingPayload({
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    materials: draft.materials,
    price: draft.price,
    quantity: draft.quantity,
    taxonomyId: draft.taxonomyId,
    whoMade: draft.whoMade,
    whenMade: draft.whenMade,
    state: "draft",
  });

  if (!validation.isValid) {
    const errorDetails = validation.issues.map((i) => `${i.field}: ${i.message}`).join("; ");
    throw new Error(`Pre-flight validation failed: ${errorDetails}`);
  }

  // 4. Resolve Channel & Credentials
  const { channelId, creds, clientId } = await resolveChannelCredentials(organizationId, sellerChannelId);

  // 5. Idempotency Check
  const idempotencyKey = customIdempotencyKey || `create_draft_${listingDraftId}_${draft.updatedAt.getTime()}`;
  const existingLog = await prisma.etsyExecutionLog.findUnique({
    where: { idempotencyKey },
  });

  if (existingLog && existingLog.status === EtsyExecutionStatus.SUCCESS) {
    return {
      success: true,
      operationType: EtsyExecutionOperation.CREATE_DRAFT_LISTING,
      etsyListingId: existingLog.etsyResourceId || undefined,
      statusCode: existingLog.responseStatusCode || 200,
      executionLogId: existingLog.id,
      idempotencyKey,
    };
  }

  // 6. Map Outgoing Payload (Sanitized)
  const outgoingPayload = mapDraftToEtsyPayload({
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    materials: draft.materials,
    price: draft.price,
    quantity: draft.quantity,
    taxonomyId: draft.taxonomyId,
    whoMade: draft.whoMade,
    whenMade: draft.whenMade,
    isSupply: draft.isSupply,
    isCustomizable: draft.isCustomizable,
    state: "draft",
  });

  // 7. Create Execution Log Record (IN_PROGRESS)
  const executionLog = await prisma.etsyExecutionLog.create({
    data: {
      organizationId,
      userId: userId || null,
      sellerChannelId: channelId,
      listingDraftId: draft.id,
      operationType: EtsyExecutionOperation.CREATE_DRAFT_LISTING,
      entityType: "LISTING",
      entityId: draft.id,
      idempotencyKey,
      requestPayload: outgoingPayload as any,
      status: EtsyExecutionStatus.IN_PROGRESS,
    },
  });

  // 8. Execute Etsy API Call with Retry and Token Refresh
  try {
    const validCreds = await refreshEtsySellerToken(channelId, creds, clientId);
    const path = `/shops/${validCreds.shopId}/listings`;

    const { data: responseResult } = await executeWithRetry<{ data: any; status: number }>(
      async () => {
        const res = await axios.post(`${ETSY_API_BASE}${path}`, outgoingPayload, {
          headers: {
            Authorization: `Bearer ${validCreds.accessToken}`,
            "x-api-key": validCreds.apiKey || clientId,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        });
        return { data: res.data, status: res.status };
      },
      path,
      3
    );

    const data = responseResult.data;
    const status = responseResult.status;

    const etsyListingId = String(data?.listing_id || data?.results?.[0]?.listing_id || "");
    const etsyUrl = data?.url || data?.results?.[0]?.url || `https://www.etsy.com/listing/${etsyListingId}`;

    // 9. Post-Execution Verification: Update Execution Log to SUCCESS
    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.SUCCESS,
        responseStatusCode: status || 201,
        etsyResourceId: etsyListingId,
        responsePayload: data as any,
      },
    });

    // 10. Update ListingDraft State
    await prisma.listingDraft.update({
      where: { id: draft.id },
      data: {
        status: ListingDraftStatus.PUSHED_TO_ETSY,
        etsyListingId: etsyListingId || draft.etsyListingId,
        etsyDraftUrl: etsyUrl,
        lastPushedAt: new Date(),
        sellerChannelId: channelId,
      },
    });

    // 11. Synchronize PlannerItem State
    if (draft.plannerItemId) {
      await prisma.plannerItem.update({
        where: { id: draft.plannerItemId },
        data: {
          status: PlannerItemStatus.PUBLISHED_TO_ETSY,
        },
      });
    }

    return {
      success: true,
      operationType: EtsyExecutionOperation.CREATE_DRAFT_LISTING,
      etsyListingId,
      etsyDraftUrl: etsyUrl,
      statusCode: status || 201,
      executionLogId: executionLog.id,
      idempotencyKey,
    };
  } catch (err: any) {
    const statusCode = err.response?.status || 500;
    const errorMsg = err.response?.data?.error || err.message || "Failed to create Etsy draft listing.";

    // Record FAILED state in Execution Log
    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.FAILED,
        responseStatusCode: statusCode,
        errorMessage: errorMsg,
        responsePayload: err.response?.data ? (err.response.data as any) : null,
      },
    });

    throw new Error(`Etsy execution error (${statusCode}): ${errorMsg}`);
  }
}

/**
 * Updates an existing Etsy Listing with approved changes.
 */
export async function updateEtsyListing(params: {
  organizationId: string;
  userId?: string;
  listingDraftId: string;
  sellerChannelId?: string;
}): Promise<ExecutionServiceResult> {
  const { organizationId, userId, listingDraftId, sellerChannelId } = params;

  const draft = await prisma.listingDraft.findFirst({
    where: { id: listingDraftId, organizationId },
  });

  if (!draft || !draft.etsyListingId) {
    throw new Error("Draft has no external Etsy listing ID to update.");
  }

  const { channelId, creds, clientId } = await resolveChannelCredentials(
    organizationId,
    sellerChannelId || draft.sellerChannelId || undefined
  );

  const idempotencyKey = `update_listing_${draft.id}_${draft.etsyListingId}_${Date.now()}`;

  const outgoingPayload = {
    title: draft.title.trim().slice(0, 140),
    description: draft.description,
    materials: draft.materials,
    price: draft.price,
    quantity: draft.quantity,
  };

  const executionLog = await prisma.etsyExecutionLog.create({
    data: {
      organizationId,
      userId: userId || null,
      sellerChannelId: channelId,
      listingDraftId: draft.id,
      operationType: EtsyExecutionOperation.UPDATE_LISTING,
      entityType: "LISTING",
      entityId: draft.id,
      etsyResourceId: draft.etsyListingId,
      idempotencyKey,
      requestPayload: outgoingPayload as any,
      status: EtsyExecutionStatus.IN_PROGRESS,
    },
  });

  try {
    const validCreds = await refreshEtsySellerToken(channelId, creds, clientId);
    const path = `/shops/${validCreds.shopId}/listings/${draft.etsyListingId}`;

    const { data: responseResult } = await executeWithRetry<{ data: any; status: number }>(
      async () => {
        const res = await axios.patch(`${ETSY_API_BASE}${path}`, outgoingPayload, {
          headers: {
            Authorization: `Bearer ${validCreds.accessToken}`,
            "x-api-key": validCreds.apiKey || clientId,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        });
        return { data: res.data, status: res.status };
      },
      path,
      3
    );

    const data = responseResult.data;
    const status = responseResult.status;

    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.SUCCESS,
        responseStatusCode: status || 200,
        responsePayload: data as any,
      },
    });

    await prisma.listingDraft.update({
      where: { id: draft.id },
      data: {
        status: ListingDraftStatus.PUSHED_TO_ETSY,
        lastPushedAt: new Date(),
      },
    });

    return {
      success: true,
      operationType: EtsyExecutionOperation.UPDATE_LISTING,
      etsyListingId: draft.etsyListingId,
      statusCode: status || 200,
      executionLogId: executionLog.id,
      idempotencyKey,
    };
  } catch (err: any) {
    const statusCode = err.response?.status || 500;
    const errorMsg = err.response?.data?.error || err.message || "Failed to update Etsy listing.";

    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.FAILED,
        responseStatusCode: statusCode,
        errorMessage: errorMsg,
        responsePayload: err.response?.data ? (err.response.data as any) : null,
      },
    });

    throw new Error(`Etsy update error (${statusCode}): ${errorMsg}`);
  }
}

/**
 * Explicitly Publishes an Etsy Listing to active status.
 * Requires user confirmation and an existing Etsy Listing ID.
 */
export async function publishEtsyListing(params: {
  organizationId: string;
  userId?: string;
  listingDraftId: string;
  sellerChannelId?: string;
}): Promise<ExecutionServiceResult> {
  const { organizationId, userId, listingDraftId, sellerChannelId } = params;

  const draft = await prisma.listingDraft.findFirst({
    where: { id: listingDraftId, organizationId },
    include: { plannerItem: true },
  });

  if (!draft || !draft.etsyListingId) {
    throw new Error("Listing draft must be pushed to Etsy as a draft first before publishing.");
  }

  const { channelId, creds, clientId } = await resolveChannelCredentials(
    organizationId,
    sellerChannelId || draft.sellerChannelId || undefined
  );

  const idempotencyKey = `publish_listing_${draft.id}_${draft.etsyListingId}_${Date.now()}`;

  const executionLog = await prisma.etsyExecutionLog.create({
    data: {
      organizationId,
      userId: userId || null,
      sellerChannelId: channelId,
      listingDraftId: draft.id,
      operationType: EtsyExecutionOperation.PUBLISH_LISTING,
      entityType: "LISTING",
      entityId: draft.id,
      etsyResourceId: draft.etsyListingId,
      idempotencyKey,
      requestPayload: { state: "active" },
      status: EtsyExecutionStatus.IN_PROGRESS,
    },
  });

  try {
    const validCreds = await refreshEtsySellerToken(channelId, creds, clientId);
    const path = `/shops/${validCreds.shopId}/listings/${draft.etsyListingId}`;

    const { data: responseResult } = await executeWithRetry<{ data: any; status: number }>(
      async () => {
        const res = await axios.patch(
          `${ETSY_API_BASE}${path}`,
          { state: "active" },
          {
            headers: {
              Authorization: `Bearer ${validCreds.accessToken}`,
              "x-api-key": validCreds.apiKey || clientId,
              "Content-Type": "application/json",
            },
            timeout: 20000,
          }
        );
        return { data: res.data, status: res.status };
      },
      path,
      3
    );

    const data = responseResult.data;
    const status = responseResult.status;

    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.SUCCESS,
        responseStatusCode: status || 200,
        responsePayload: data as any,
      },
    });

    await prisma.listingDraft.update({
      where: { id: draft.id },
      data: {
        state: "active",
        status: ListingDraftStatus.PUSHED_TO_ETSY,
        lastPushedAt: new Date(),
      },
    });

    if (draft.plannerItemId) {
      await prisma.plannerItem.update({
        where: { id: draft.plannerItemId },
        data: {
          status: PlannerItemStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      operationType: EtsyExecutionOperation.PUBLISH_LISTING,
      etsyListingId: draft.etsyListingId,
      statusCode: status || 200,
      executionLogId: executionLog.id,
      idempotencyKey,
    };
  } catch (err: any) {
    const statusCode = err.response?.status || 500;
    const errorMsg = err.response?.data?.error || err.message || "Failed to publish Etsy listing.";

    await prisma.etsyExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: EtsyExecutionStatus.FAILED,
        responseStatusCode: statusCode,
        errorMessage: errorMsg,
        responsePayload: err.response?.data ? (err.response.data as any) : null,
      },
    });

    throw new Error(`Etsy publish error (${statusCode}): ${errorMsg}`);
  }
}

/**
 * Fetches execution audit logs for a specific draft and organization.
 */
export async function getDraftExecutionLogs(
  organizationId: string,
  listingDraftId?: string
) {
  return prisma.etsyExecutionLog.findMany({
    where: {
      organizationId,
      ...(listingDraftId ? { listingDraftId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
