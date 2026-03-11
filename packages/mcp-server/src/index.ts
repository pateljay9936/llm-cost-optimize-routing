#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------- HTTP Client (talks to the Next.js web app) ----------

const BASE_URL = process.env.LLM_ROUTER_URL || "http://localhost:3000";

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as Record<string, any>;
    throw new Error((err.error as string) || `API ${path} returned ${res.status}`);
  }
  return res;
}

// ---------- MCP Server ----------

const server = new McpServer({
  name: "llm-router",
  version: "0.1.0",
});

// Tool: route_query
server.registerTool(
  "route_query",
  {
    description:
      "Route a query to the most cost-effective AI model and get a response. " +
      "Simple queries go to free local models, medium to GPT-4o mini, complex to GPT-4o.",
    inputSchema: {
      message: z.string().describe("The user message to route and process"),
    },
  },
  async ({ message }) => {
    try {
      const res = await apiPost("/api/chat", { message });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let tier = "";
      let model = "";
      let confidence = 0;
      let reason = "";
      let cost = 0;
      let latencyMs = 0;
      let tokensIn = 0;
      let tokensOut = 0;

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
            tier = data.decision.tier;
            model = data.decision.model;
            confidence = data.decision.confidence;
            reason = data.decision.reason;
          } else if (data.type === "text") {
            fullResponse += data.text;
          } else if (data.type === "done") {
            cost = data.meta.cost;
            latencyMs = data.meta.latencyMs;
            tokensIn = data.meta.tokensIn;
            tokensOut = data.meta.tokensOut;
          }
        }
      }

      const result = [
        `**Response:**\n${fullResponse}`,
        "",
        `---`,
        `**Routing:** ${tier} tier → ${model}`,
        `**Confidence:** ${(confidence * 100).toFixed(0)}%`,
        `**Reason:** ${reason}`,
        `**Cost:** $${cost.toFixed(6)}`,
        `**Latency:** ${latencyMs}ms`,
        `**Tokens:** ${tokensIn} in / ${tokensOut} out`,
      ].join("\n");

      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_stats
server.registerTool(
  "get_stats",
  {
    description:
      "Get routing statistics including total queries, cost breakdown, savings, and per-model usage.",
    inputSchema: {
      range: z
        .enum(["today", "7d", "30d", "all"])
        .optional()
        .describe("Time range for stats (default: 7d)"),
    },
  },
  async ({ range }) => {
    try {
      const period = range || "7d";
      const data = await apiGet(`/api/stats?range=${period}`);

      const stats = data.summary;
      const models = data.modelBreakdown || [];
      const recent = data.recentQueries || [];

      if (!stats || stats.totalQueries === 0) {
        return {
          content: [{ type: "text" as const, text: `No queries found for range: ${period}` }],
        };
      }

      const lines = [
        `## LLM Router Stats (${period})`,
        "",
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Total Queries | ${stats.totalQueries} |`,
        `| Simple / Medium / Complex | ${stats.routedSimple} / ${stats.routedMedium} / ${stats.routedComplex} |`,
        `| Total Cost | $${(stats.totalCost ?? 0).toFixed(4)} |`,
        `| Est. Without Routing | $${(stats.estimatedWithoutRouting ?? 0).toFixed(4)} |`,
        `| Savings | ${(stats.savingsPercent ?? 0).toFixed(1)}% ($${(stats.saved ?? 0).toFixed(4)}) |`,
        `| Avg Latency | ${Math.round(stats.avgLatency ?? 0)}ms |`,
      ];

      if (models.length > 0) {
        lines.push(
          "",
          `### Per-Model Breakdown`,
          "",
          `| Model | Queries | Cost | Avg Latency |`,
          `|-------|---------|------|-------------|`,
          ...models.map(
            (m: any) =>
              `| ${m.model} | ${m.count} | $${(m.totalCost ?? 0).toFixed(4)} | ${Math.round(m.avgLatency ?? 0)}ms |`
          ),
        );
      }

      if (recent.length > 0) {
        lines.push("", `### Recent Queries`, "");
        for (const q of recent) {
          lines.push(
            `- **[${q.tier}]** "${q.input.slice(0, 60)}${q.input.length > 60 ? "..." : ""}" → ${q.modelUsed} ($${q.cost.toFixed(6)})`
          );
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: switch_strategy
server.registerTool(
  "switch_strategy",
  {
    description:
      "Switch the routing strategy. Options: 'heuristic' (keyword-based, fastest), " +
      "'semantic' (similarity-based, more nuanced).",
    inputSchema: {
      strategy: z
        .enum(["heuristic", "semantic"])
        .describe("The routing strategy to use"),
    },
  },
  async ({ strategy }) => {
    try {
      await apiPost("/api/router-config", { strategy });
      return {
        content: [
          {
            type: "text" as const,
            text: `Routing strategy switched to "${strategy}".`,
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_config
server.registerTool(
  "get_config",
  {
    description:
      "Get the current LLM Router configuration including active strategy, " +
      "available models, and tier mapping.",
    inputSchema: {},
  },
  async () => {
    try {
      const data = await apiGet("/api/router-config");

      const config = [
        `## LLM Router Configuration`,
        "",
        `| Setting | Value |`,
        `|---------|-------|`,
        `| Strategy | ${data.strategy} |`,
        `| Simple Tier | Ollama (local) — Free |`,
        `| Medium Tier | GPT-4o mini — $0.15/1M in, $0.60/1M out |`,
        `| Complex Tier | GPT-4o — $2.50/1M in, $10.00/1M out |`,
        "",
        `### Available Strategies`,
        `- **heuristic** — Keyword and pattern matching (fastest)`,
        `- **semantic** — Bag-of-words cosine similarity`,
        "",
        `### How Routing Works`,
        `1. User sends a message`,
        `2. Strategy classifies complexity → simple / medium / complex`,
        `3. Message is routed to the appropriate model tier`,
        `4. Simple queries are free (local), saving 75%+ on costs`,
      ];

      return { content: [{ type: "text" as const, text: config.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ---------- Start server ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LLM Router MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
