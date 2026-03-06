import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "../types";

export class ClaudeProvider implements LLMProvider {
  name: string;
  model: string;
  private client: Anthropic;

  constructor(model: string, apiKey?: string) {
    this.model = model;
    this.name = `anthropic/${model}`;
    this.client = new Anthropic({ apiKey });
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      content,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      model: this.model,
    };
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "text", text: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: "usage",
      tokensIn: finalMessage.usage.input_tokens,
      tokensOut: finalMessage.usage.output_tokens,
    };
    yield { type: "done" };
  }
}

export function createSonnetProvider(apiKey?: string): ClaudeProvider {
  return new ClaudeProvider("claude-sonnet-4-20250514", apiKey);
}

export function createHaikuProvider(apiKey?: string): ClaudeProvider {
  return new ClaudeProvider("claude-haiku-4-5-20251001", apiKey);
}
