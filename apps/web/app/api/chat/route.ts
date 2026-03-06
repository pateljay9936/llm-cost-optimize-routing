import { NextRequest } from "next/server";
import { getRouter } from "@/lib/router-instance";
import { initDb } from "@/lib/db";
import { logQuery } from "@llm-router/db";
import { calculateCost, type ChatMessage } from "@llm-router/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Initialize DB
    initDb();

    const router = getRouter();
    const startTime = Date.now();

    // Route the query
    const { decision, stream } = await router.route({ message, history });
    const latencyToRoute = Date.now() - startTime;

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";
    let tokensIn = 0;
    let tokensOut = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send routing metadata first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "routing",
                decision: {
                  tier: decision.tier,
                  model: decision.model,
                  provider: decision.provider,
                  confidence: decision.confidence,
                  reason: decision.reason,
                },
              })}\n\n`
            )
          );

          for await (const chunk of stream) {
            if (chunk.type === "text" && chunk.text) {
              fullResponse += chunk.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`
                )
              );
            } else if (chunk.type === "usage") {
              tokensIn = chunk.tokensIn ?? 0;
              tokensOut = chunk.tokensOut ?? 0;
            }
          }

          const totalLatency = Date.now() - startTime;
          const cost = calculateCost(decision.model, tokensIn, tokensOut);

          // Log to DB
          try {
            logQuery({
              input: message,
              output: fullResponse,
              modelUsed: decision.model,
              tier: decision.tier,
              tokensIn,
              tokensOut,
              cost,
              latencyMs: totalLatency,
              strategyUsed: router.getStrategyName(),
              confidence: decision.confidence,
              reason: decision.reason,
            });
          } catch (dbError) {
            console.error("Failed to log query:", dbError);
          }

          // Send final metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                meta: {
                  tokensIn,
                  tokensOut,
                  cost,
                  latencyMs: totalLatency,
                  routingLatencyMs: latencyToRoute,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Router-Tier": decision.tier,
        "X-Router-Model": decision.model,
      },
    });
  } catch (error) {
    console.error("[chat] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const stack = error instanceof Error ? error.stack : undefined;
    return Response.json({ error: errorMessage, stack }, { status: 500 });
  }
}
