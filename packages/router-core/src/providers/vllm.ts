import type {
  LLMProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "../types";

export class VLLMProvider implements LLMProvider {
  name: string;
  model: string;
  private baseUrl: string;

  constructor(
    model: string = "meta-llama/Llama-3.1-8B-Instruct",
    baseUrl: string = "http://localhost:8000"
  ) {
    this.model = model;
    this.name = `vllm/${model}`;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as Record<string, any>;
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content ?? "",
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      model: `vllm/${this.model}`,
    };
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let tokensIn = 0;
    let tokensOut = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        const data = JSON.parse(payload);
        const delta = data.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: "text", text: delta };
        }

        if (data.usage) {
          tokensIn = data.usage.prompt_tokens ?? 0;
          tokensOut = data.usage.completion_tokens ?? 0;
        }
      }
    }

    yield { type: "usage", tokensIn, tokensOut };
    yield { type: "done" };
  }
}
