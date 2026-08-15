import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processDeterministicIntent } from "@/services/assistant/intent-engine";
import { llmProvider } from "@/services/assistant/llm-provider";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!session || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = (await req.json()) as { query?: string };

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    // Check if external LLM is configured and generates a response
    const llmResponse = await llmProvider.generateResponse(trimmedQuery, {
      organizationId,
      systemContext: "SellerSalt Etsy Intelligence Platform",
    });

    if (llmResponse) {
      return NextResponse.json({ message: llmResponse });
    }

    // Default to deterministic execution
    const deterministicMessage = await processDeterministicIntent(trimmedQuery, organizationId);
    return NextResponse.json({ message: deterministicMessage });
  } catch (error: any) {
    console.error("Assistant chat error:", error);
    return NextResponse.json(
      {
        message: {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "An error occurred while processing your request. Please try again.",
          timestamp: new Date().toISOString(),
          isDeterministic: true,
        },
      },
      { status: 500 }
    );
  }
}
