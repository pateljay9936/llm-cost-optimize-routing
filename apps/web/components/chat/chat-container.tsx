"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { StrategyToggle } from "./strategy-toggle";
import type { ModelTier, ChatMessage as ChatMessageType } from "@llm-router/core";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    model?: string;
    tier?: ModelTier;
    cost?: number;
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
  };
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [strategy, setStrategy] = useState("heuristic");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial strategy
  useEffect(() => {
    fetch("/api/router-config")
      .then((r) => r.json())
      .then((data) => setStrategy(data.strategy))
      .catch(() => { });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleStrategyChange = useCallback(async (newStrategy: string) => {
    setStrategy(newStrategy);
    try {
      await fetch("/api/router-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: newStrategy }),
      });
    } catch { }
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const history: ChatMessageType[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, history }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "routing") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                      ...m,
                      meta: {
                        ...m.meta,
                        tier: data.decision.tier,
                        model: data.decision.model,
                      },
                    }
                    : m
                )
              );
            } else if (data.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data.text }
                    : m
                )
              );
            } else if (data.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                      ...m,
                      meta: {
                        ...m.meta,
                        cost: data.meta.cost,
                        latencyMs: data.meta.latencyMs,
                        tokensIn: data.meta.tokensIn,
                        tokensOut: data.meta.tokensOut,
                      },
                    }
                    : m
                )
              );
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: `Error: ${data.error}` }
                    : m
                )
              );
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Something went wrong";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${errorMessage}` }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages]
  );

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">LLM Router</h1>
          <p className="text-xs text-muted-foreground">
            Cost-optimized query routing
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StrategyToggle
            strategy={strategy}
            onStrategyChange={handleStrategyChange}
          />
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Welcome to LLM Router</p>
              <p>
                Simple queries route to local models (free).
                <br />
                Complex queries route to Claude/OpenAi (paid).
              </p>
              <div className="flex gap-2 justify-center mt-4 text-xs">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Simple → Local
                </span>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  Medium → GPT-4o mini
                </span>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  Complex → GPT-4o
                </span>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            meta={msg.meta}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start mb-4">
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
