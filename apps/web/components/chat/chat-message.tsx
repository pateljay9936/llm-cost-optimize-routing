"use client";

import { Badge } from "@llm-router/ui";
import type { ModelTier } from "@llm-router/core";
import { FeedbackButtons } from "./feedback-buttons";
import { GuardrailWarning } from "./guardrail-warning";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  guardrailWarnings?: Array<{
    rule: string;
    severity: string;
    message: string;
  }>;
  meta?: {
    model?: string;
    tier?: ModelTier;
    cost?: number;
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    ttftMs?: number;
    queryId?: number;
  };
}

const tierColors: Record<ModelTier, "success" | "warning" | "info"> = {
  simple: "success",
  medium: "warning",
  complex: "info",
};

const tierLabels: Record<ModelTier, string> = {
  simple: "Local",
  medium: "GPT-4o mini",
  complex: "GPT-4o",
};

export function ChatMessage({ role, content, meta, isStreaming, guardrailWarnings }: ChatMessageProps) {
  const isUser = role === "user";
  const showFeedback =
    !isUser && !isStreaming && meta?.queryId !== undefined;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{content}</div>
        {meta?.tier && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            <Badge variant={tierColors[meta.tier]} className="text-[10px] px-1.5 py-0">
              {tierLabels[meta.tier]}
            </Badge>
            {meta.cost !== undefined && (
              <span>${meta.cost.toFixed(6)}</span>
            )}
            {meta.ttftMs !== undefined && (
              <span>TTFT {meta.ttftMs}ms</span>
            )}
            {meta.latencyMs !== undefined && (
              <span>Total {meta.latencyMs}ms</span>
            )}
          </div>
        )}
        {guardrailWarnings && guardrailWarnings.length > 0 && (
          <GuardrailWarning warnings={guardrailWarnings} />
        )}
        {showFeedback && (
          <FeedbackButtons queryId={meta.queryId!} />
        )}
      </div>
    </div>
  );
}
