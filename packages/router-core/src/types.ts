export type ModelTier = "simple" | "medium" | "complex";

export type RouterStrategyName = "heuristic" | "semantic" | "routellm" | "llm-judge";

export interface Query {
  message: string;
  history?: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  provider: string;
  confidence: number;
  reason: string;
  /** If the classifier already produced a response (e.g. LLM Judge for simple queries), skip the provider call */
  prefetchedResponse?: string;
}

export interface RouterStrategy {
  name: RouterStrategyName;
  classify(query: Query): Promise<RoutingDecision>;
}

export interface ProviderConfig {
  simple: LLMProvider;
  medium: LLMProvider;
  complex: LLMProvider;
}

export interface LLMProvider {
  name: string;
  model: string;
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;
  stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk>;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface StreamChunk {
  type: "text" | "usage" | "done";
  text?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface QueryLog {
  id?: number;
  input: string;
  output: string;
  modelUsed: string;
  tier: ModelTier;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latencyMs: number;
  strategyUsed: RouterStrategyName;
  createdAt?: string;
}

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "ollama/local": { inputPer1M: 0, outputPer1M: 0 },
  "vllm/local": { inputPer1M: 0, outputPer1M: 0 },
};
