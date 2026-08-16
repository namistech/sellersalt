import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processDeterministicIntent, isLikelyOnTopic, OUT_OF_SCOPE_MESSAGE } from "@/services/assistant/intent-engine";
import { multiProviderLLM } from "@/services/assistant/llm-provider";
import type { AssistantMessage } from "@/services/assistant/types";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!session || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, history } = (await req.json()) as {
      query?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    // 1. Gather live workspace context
    const [shop, savedCount, trackedCount, pendingPlannerCount] = await Promise.all([
      prisma.sellerChannel.findFirst({
        where: { organizationId, platform: "ETSY_SELLER" },
        select: { label: true },
      }),
      prisma.prospect.count({ where: { organizationId, isFavorite: true } }),
      prisma.shopWatch.count({ where: { organizationId, isActive: true } }),
      prisma.plannerItem.count({ where: { organizationId, status: "BACKLOG" } }),
    ]);

    const context = {
      organizationId,
      userId: (session.user as any)?.id,
      userRole: (session.user as any)?.role || "OWNER",
      connectedShop: {
        isConnected: Boolean(shop),
        shopName: shop?.label,
      },
      connectedShopName: shop?.label || null,
      savedProspectCount: savedCount,
      trackedShopCount: trackedCount,
      pendingPlannerItemCount: pendingPlannerCount,
    };

    // 2. First evaluate deterministic intent engine (Zero LLM token cost when unambiguous)
    const deterministicMessage = await processDeterministicIntent(trimmedQuery, organizationId);

    // If deterministic recognized an explicit domain tool/intent or out-of-scope, return immediately
    if (deterministicMessage.intent !== "UNKNOWN" && deterministicMessage.intent !== "HELP") {
      return NextResponse.json({ message: deterministicMessage });
    }

    // Hard guardrail: genuinely off-topic queries never reach LLM providers
    if (deterministicMessage.intent === "UNKNOWN" && !isLikelyOnTopic(trimmedQuery)) {
      const offTopicMessage: AssistantMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        intent: "OUT_OF_SCOPE",
        timestamp: new Date().toISOString(),
        isDeterministic: true,
        text: OUT_OF_SCOPE_MESSAGE,
        actions: [
          { label: "Find top opportunities", actionKey: "Find my top opportunities", variant: "primary" },
          { label: "Fastest growing competitors", actionKey: "Show my fastest-growing competitors", variant: "secondary" },
          { label: "Explore keywords", actionKey: "Find keywords for planners", variant: "outline" },
        ],
      };
      return NextResponse.json({ message: offTopicMessage });
    }

    // 3. Invoke Multi-Provider LLM Fallback (OpenRouter -> NVIDIA -> Gemini -> OpenAI)
    const llmResponse = await multiProviderLLM.generateResponse(trimmedQuery, context, history);

    if (llmResponse) {
      return NextResponse.json({ message: llmResponse });
    }

    // 4. Fallback to deterministic message (e.g. Help cards)
    return NextResponse.json({ message: deterministicMessage });
  } catch (error: any) {
    console.error("Assistant chat error:", error);
    return NextResponse.json(
      {
        message: {
          id: `err-${Date.now()}`,
          sender: "assistant",
          intent: "HELP",
          text: "I encountered a momentary issue processing your request. Try asking about your top opportunities, keyword research, or daily research agenda.",
          timestamp: new Date().toISOString(),
          isDeterministic: true,
        },
      },
      { status: 500 }
    );
  }
}
