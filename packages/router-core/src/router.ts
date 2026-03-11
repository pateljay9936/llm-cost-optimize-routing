import type {
  Query,
  RouterStrategy,
  RoutingDecision,
  LLMProvider,
  ProviderConfig,
  StreamChunk,
  ChatMessage,
  CompletionOptions,
} from "./types";

export interface RouterConfig {
  strategy: RouterStrategy;
  providers: ProviderConfig;
}

export interface RouteResult {
  decision: RoutingDecision;
  stream: AsyncIterable<StreamChunk>;
}

export class Router {
  private strategy: RouterStrategy;
  private providers: ProviderConfig;

  constructor(config: RouterConfig) {
    this.strategy = config.strategy;
    this.providers = config.providers;
  }

  setStrategy(strategy: RouterStrategy): void {
    this.strategy = strategy;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  async classify(query: Query): Promise<RoutingDecision> {
    return this.strategy.classify(query);
  }

  async route(
    query: Query,
    options?: CompletionOptions
  ): Promise<RouteResult> {
    const decision = await this.classify(query);

    // If the strategy already produced a response (e.g. LLM Judge classified as simple
    // and answered in the same call), return it directly — no second provider call needed.
    if (decision.prefetchedResponse) {
      const text = decision.prefetchedResponse;
      async function* prefetchedStream(): AsyncIterable<StreamChunk> {
        yield { type: "text", text };
        yield { type: "usage", tokensIn: 0, tokensOut: 0 };
        yield { type: "done" };
      }
      return { decision, stream: prefetchedStream() };
    }

    const provider = this.getProvider(decision.tier);
    const messages = this.buildMessages(query);

    return {
      decision,
      stream: provider.stream(messages, options),
    };
  }

  private getProvider(tier: "simple" | "medium" | "complex"): LLMProvider {
    return this.providers[tier];
  }

  private buildMessages(query: Query): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (query.history) {
      messages.push(...query.history);
    }
    messages.push({ role: "user", content: query.message });
    return messages;
  }
}
