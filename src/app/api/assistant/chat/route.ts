import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processDeterministicIntent } from "@/services/assistant/intent-engine";
import { multiProviderLLM } from "@/services/assistant/llm-provider";

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

    // 1. First run Level 1 Deterministic Engine
    const deterministicMessage = await processDeterministicIntent(trimmedQuery, organizationId);

    // If deterministic recognized an explicit intent, return immediately (zero token cost)
    if (deterministicMessage.intent !== ("UNKNOWN" as any) && deterministicMessage.intent !== "HELP") {
      return NextResponse.json({ message: deterministicMessage });
    }

    // 2. If conversational / general query, invoke Level 2 Multi-Provider LLM Fallback (OpenRouter -> NVIDIA -> Gemini)
    const [shop, savedCount, trackedCount] = await Promise.all([
      prisma.sellerChannel.findFirst({
        where: { organizationId, platform: "ETSY_SELLER" },
        select: { label: true },
      }),
      prisma.prospect.count({ where: { organizationId, isFavorite: true } }),
      prisma.shopWatch.count({ where: { organizationId, isActive: true } }),
    ]);

    const llmResponse = await multiProviderLLM.generateResponse(
      trimmedQuery,
      {
        organizationId,
        userRole: (session.user as any)?.role || "OWNER",
        connectedShopName: shop?.label || null,
        savedProspectCount: savedCount,
        trackedShopCount: trackedCount,
      },
      history
    );

    if (llmResponse) {
      return NextResponse.json({ message: llmResponse });
    }

    // Fallback to deterministic message (e.g. Help cards)
    return NextResponse.json({ message: deterministicMessage });
  } catch (error: any) {
    console.error("Assistant chat error:", error);
    return NextResponse.json(
      {
        message: {
          id: `err-${Date.now()}`,
          sender: "assistant",
          intent: "HELP",
          title: "System Notification",
          body: "I encountered a momentary issue processing your request. Try asking about your top opportunities or daily research agenda.",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
