import OpenAI from "openai";
import type {
  LLMProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "../types";

export class OpenAIProvider implements LLMProvider {
  name: string;
  model: string;
  private _client: OpenAI | null = null;
  private apiKey?: string;

  constructor(model: string, apiKey?: string) {
    this.model = model;
    this.name = `openai/${model}`;
    this.apiKey = apiKey;
  }

  private get client(): OpenAI {
    if (!this._client) {
      const key = this.apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error(
          "OPENAI_API_KEY is not set. Add it to your .env file."
        );
      }
      this._client = new OpenAI({ apiKey: key });
    }
    return this._client;
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content = response.choices[0]?.message?.content ?? "";

    return {
      content,
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
      model: this.model,
    };
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    // First, do a non-streaming call to get accurate token counts,
    // but stream text via the streaming API for UX
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      stream: true,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    let fullText = "";

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        yield { type: "text", text: delta };
      }
    }

    // Estimate tokens (OpenAI streaming doesn't include usage in v4)
    // ~4 chars per token is a rough estimate
    const estimatedIn = Math.ceil(
      messages.reduce((acc, m) => acc + m.content.length, 0) / 4
    );
    const estimatedOut = Math.ceil(fullText.length / 4);

    yield { type: "usage", tokensIn: estimatedIn, tokensOut: estimatedOut };
    yield { type: "done" };
  }
}

export function createGPT4oProvider(apiKey?: string): OpenAIProvider {
  return new OpenAIProvider("gpt-4o", apiKey);
}

export function createGPT4oMiniProvider(apiKey?: string): OpenAIProvider {
  return new OpenAIProvider("gpt-4o-mini", apiKey);
}
