import { NextRequest } from "next/server";
import { getRouter } from "@/lib/router-instance";
import { initDb } from "@/lib/db";
import { logQuery } from "@llm-router/db";
import {
  calculateCost,
  validateInput,
  validateOutput,
  type ChatMessage,
} from "@llm-router/core";

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

    // Run input guardrails
    const inputCheck = validateInput(message);
    if (!inputCheck.passed) {
      const blocked = inputCheck.violations.filter((v) => v.severity === "block");
      return Response.json(
        {
          error: "Message blocked by guardrails",
          guardrail: {
            violations: blocked.map((v) => ({
              rule: v.rule,
              message: v.message,
            })),
          },
        },
        { status: 422 }
      );
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

          let firstTokenTime: number | null = null;

          for await (const chunk of stream) {
            if (chunk.type === "text" && chunk.text) {
              if (firstTokenTime === null) {
                firstTokenTime = Date.now() - startTime;
              }
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

          // Run output guardrails
          const outputCheck = validateOutput(fullResponse);
          const guardrailWarnings = [
            ...inputCheck.violations.filter((v) => v.severity === "warn"),
            ...outputCheck.violations,
          ];

          if (outputCheck.sanitized && outputCheck.sanitized !== fullResponse) {
            fullResponse = outputCheck.sanitized;
          }

          if (!outputCheck.passed) {
            fullResponse = "I'm unable to provide that response as it was flagged by safety guardrails.";
          }

          // Send guardrail metadata if any warnings
          if (guardrailWarnings.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "guardrail",
                  warnings: guardrailWarnings.map((v) => ({
                    rule: v.rule,
                    severity: v.severity,
                    message: v.message,
                  })),
                })}\n\n`
              )
            );
          }

          // Log to DB
          let queryId: number | undefined;
          try {
            const result = logQuery({
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
            queryId = Number(result.lastInsertRowid);
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
                  ttftMs: firstTokenTime ?? totalLatency,
                  routingLatencyMs: latencyToRoute,
                  queryId,
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
