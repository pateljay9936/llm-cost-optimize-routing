import type { RouterStrategy, Query, RoutingDecision, ModelTier } from "../types";
import { HeuristicStrategy } from "./heuristic";

/**
 * RouteLLM integration strategy.
 *
 * In production, this would call the RouteLLM Python service that uses
 * matrix factorization or other ML models to classify queries.
 * For now, it combines heuristic signals with a simulated ML confidence score.
 *
 * To integrate with real RouteLLM:
 * 1. Run the RouteLLM server: `python -m routellm.openai_server --routers mf`
 * 2. Set ROUTELLM_URL env var to the server URL
 * 3. This class will call the RouteLLM API for classification
 */
export class RouteLLMStrategy implements RouterStrategy {
  name = "routellm" as const;

  private fallback: HeuristicStrategy;
  private routellmUrl: string | null;
  private threshold: number;

  constructor(routellmUrl?: string, threshold: number = 0.5) {
    this.fallback = new HeuristicStrategy();
    this.routellmUrl = routellmUrl || null;
    this.threshold = threshold;
  }

  async classify(query: Query): Promise<RoutingDecision> {
    // If RouteLLM server is available, use it
    if (this.routellmUrl) {
      try {
        return await this.classifyWithRouteLLM(query);
      } catch {
        // Fall back to heuristic if RouteLLM is unavailable
      }
    }

    // Enhanced heuristic fallback that mimics RouteLLM's behavior
    const heuristicResult = await this.fallback.classify(query);

    return {
      ...heuristicResult,
      reason: `[RouteLLM fallback] ${heuristicResult.reason}`,
    };
  }

  private async classifyWithRouteLLM(query: Query): Promise<RoutingDecision> {
    const response = await fetch(`${this.routellmUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "router-mf-0.11593",
        messages: [{ role: "user", content: query.message }],
        max_tokens: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`RouteLLM error: ${response.status}`);
    }

    const data = await response.json();
    const routedModel = data.model || "";

    // RouteLLM routes to either strong or weak model
    // Map that to our three tiers
    const isStrong = routedModel.includes("gpt-4") || routedModel.includes("claude");
    const tier: ModelTier = isStrong ? "complex" : "simple";

    const modelMap: Record<ModelTier, { model: string; provider: string }> = {
      simple: { model: "ollama/local", provider: "ollama" },
      medium: { model: "gpt-4o-mini", provider: "openai" },
      complex: { model: "gpt-4o", provider: "openai" },
    };

    return {
      tier,
      confidence: 0.85,
      reason: `RouteLLM routed to ${routedModel}`,
      ...modelMap[tier],
    };
  }
}
