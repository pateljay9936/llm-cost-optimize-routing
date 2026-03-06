import { NextRequest } from "next/server";
import {
  DEFAULT_GUARDRAIL_CONFIG,
  type GuardrailConfig,
} from "@llm-router/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory config (persists for server lifetime)
let guardrailConfig: GuardrailConfig = { ...DEFAULT_GUARDRAIL_CONFIG };

export async function GET() {
  return Response.json({
    config: guardrailConfig,
    defaults: DEFAULT_GUARDRAIL_CONFIG,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body as Partial<GuardrailConfig>;

    // Merge with current config
    guardrailConfig = {
      ...guardrailConfig,
      ...updates,
    };

    return Response.json({
      config: guardrailConfig,
      message: "Guardrail configuration updated",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }
}
