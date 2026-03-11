import type { RouterStrategy, Query, RoutingDecision, ModelTier } from "../types";
import { HeuristicStrategy } from "./heuristic";

const CLASSIFICATION_PROMPT = `You are a query complexity classifier. Classify the user's query into one of three tiers:

- SIMPLE: Greetings, basic facts, short answers, casual chat. These go to a small free local model.
- MEDIUM: How-to questions, summaries, translations, simple code. These go to GPT-4o mini.
- COMPLEX: Deep analysis, debugging, architecture, math proofs, multi-step reasoning. These go to GPT-4o.

If the query is SIMPLE, also provide a helpful answer since you are the model that will handle it.

Respond in this exact JSON format (no markdown, no code fences):
{"tier":"SIMPLE","answer":"your answer here"}
{"tier":"MEDIUM"}
{"tier":"COMPLEX"}

Only include "answer" for SIMPLE queries.`;

/**
 * LLM Judge Strategy — uses a small local LLM (Ollama) to classify query complexity.
 *
 * Key optimization: If the query is classified as "simple", the judge also answers
 * the query in the same call, avoiding a redundant second call to the same model.
 */
export class LLMJudgeStrategy implements RouterStrategy {
  name = "llm-judge" as const;

  private ollamaBaseUrl: string;
  private ollamaModel: string;
  private fallback: HeuristicStrategy;

  constructor(
    ollamaModel?: string,
    ollamaBaseUrl?: string,
  ) {
    this.ollamaModel = ollamaModel || process.env.OLLAMA_MODEL || "llama3.2:3b";
    this.ollamaBaseUrl = ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.fallback = new HeuristicStrategy();
  }

  async classify(query: Query): Promise<RoutingDecision> {
    try {
      return await this.classifyWithLLM(query);
    } catch (error) {
      // If Ollama is down, fall back to heuristic
      const hResult = await this.fallback.classify(query);
      return {
        ...hResult,
        reason: `[LLM Judge fallback] ${hResult.reason}`,
      };
    }
  }

  private async classifyWithLLM(query: Query): Promise<RoutingDecision> {
    const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.ollamaModel,
        messages: [
          { role: "system", content: CLASSIFICATION_PROMPT },
          { role: "user", content: query.message },
        ],
        stream: false,
        options: {
          temperature: 0,
          num_predict: 256,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as Record<string, any>;
    const content = (data.message?.content || "").trim();

    // Parse the JSON response
    const parsed = this.parseResponse(content);

    const modelMap: Record<ModelTier, { model: string; provider: string }> = {
      simple: { model: "ollama/local", provider: "ollama" },
      medium: { model: "gpt-4o-mini", provider: "openai" },
      complex: { model: "gpt-4o", provider: "openai" },
    };

    const decision: RoutingDecision = {
      tier: parsed.tier,
      confidence: 0.85,
      reason: `LLM Judge classified as ${parsed.tier}`,
      ...modelMap[parsed.tier],
    };

    // If simple, attach the answer so the Router skips the second Ollama call
    if (parsed.tier === "simple" && parsed.answer) {
      decision.prefetchedResponse = parsed.answer;
    }

    return decision;
  }

  private parseResponse(content: string): { tier: ModelTier; answer?: string } {
    try {
      // Try to extract JSON from the response (handle markdown fences, extra text, etc.)
      const jsonMatch = content.match(/\{[^}]*"tier"\s*:\s*"[^"]*"[^}]*\}/i);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const tierRaw = (parsed.tier || "").toUpperCase();

        let tier: ModelTier = "simple";
        if (tierRaw === "COMPLEX") tier = "complex";
        else if (tierRaw === "MEDIUM") tier = "medium";

        return { tier, answer: parsed.answer };
      }
    } catch {
      // JSON parse failed, try keyword extraction
    }

    // Fallback: look for tier keywords in the raw text
    const upper = content.toUpperCase();
    if (upper.includes("COMPLEX")) return { tier: "complex" };
    if (upper.includes("MEDIUM")) return { tier: "medium" };
    return { tier: "simple" };
  }
}
