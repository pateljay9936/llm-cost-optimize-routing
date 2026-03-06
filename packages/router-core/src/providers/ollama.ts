import type {
  LLMProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "../types";

export class OllamaProvider implements LLMProvider {
  name: string;
  model: string;
  private baseUrl: string;

  constructor(
    model: string = "llama3.2:3b",
    baseUrl: string = "http://localhost:11434"
  ) {
    this.model = model;
    this.name = `ollama/${model}`;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          num_predict: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as Record<string, any>;
    return {
      content: data.message?.content ?? "",
      tokensIn: data.prompt_eval_count ?? 0,
      tokensOut: data.eval_count ?? 0,
      model: `ollama/${this.model}`,
    };
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          num_predict: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let totalIn = 0;
    let totalOut = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);

        if (data.message?.content) {
          yield { type: "text", text: data.message.content };
        }

        if (data.done) {
          totalIn = data.prompt_eval_count ?? 0;
          totalOut = data.eval_count ?? 0;
        }
      }
    }

    yield { type: "usage", tokensIn: totalIn, tokensOut: totalOut };
    yield { type: "done" };
  }
}
