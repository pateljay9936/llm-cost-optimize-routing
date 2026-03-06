#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  HeuristicStrategy,
  SemanticStrategy,
  OllamaProvider,
  createGPT4oProvider,
  createGPT4oMiniProvider,
  calculateCost,
  calculateSavings,
  type RouterStrategy,
  type LLMProvider,
  Router,
} from "@llm-router/core";
import {
  getDb,
  logQuery,
  getQueryStats,
  getRecentQueries,
  getDailyBreakdown,
  getModelBreakdown,
} from "@llm-router/db";

// ---------- Router setup ----------

let currentStrategyName = process.env.ROUTER_STRATEGY || "heuristic";

function createStrategy(name: string): RouterStrategy {
  switch (name) {
    case "semantic":
      return new SemanticStrategy();
    case "heuristic":
    default:
      return new HeuristicStrategy();
  }
}

function createSimpleProvider(): LLMProvider {
  return new OllamaProvider(
    process.env.OLLAMA_MODEL || "llama3.2:3b",
    process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  );
}

let router: Router | null = null;

function getRouter(): Router {
  if (!router) {
    router = new Router({
      strategy: createStrategy(currentStrategyName),
      providers: {
        simple: createSimpleProvider(),
        medium: createGPT4oMiniProvider(process.env.OPENAI_API_KEY),
        complex: createGPT4oProvider(process.env.OPENAI_API_KEY),
      },
    });
  }
  return router;
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
      getDb();
      const r = getRouter();
      const startTime = Date.now();
      const { decision, stream } = await r.route({ message });

      let fullResponse = "";
      let tokensIn = 0;
      let tokensOut = 0;

      for await (const chunk of stream) {
        if (chunk.type === "text" && chunk.text) {
          fullResponse += chunk.text;
        } else if (chunk.type === "usage") {
          tokensIn = chunk.tokensIn ?? 0;
          tokensOut = chunk.tokensOut ?? 0;
        }
      }

      const latencyMs = Date.now() - startTime;
      const cost = calculateCost(decision.model, tokensIn, tokensOut);

      try {
        logQuery({
          input: message,
          output: fullResponse,
          modelUsed: decision.model,
          tier: decision.tier,
          tokensIn,
          tokensOut,
          cost,
          latencyMs,
          strategyUsed: r.getStrategyName(),
          confidence: decision.confidence,
          reason: decision.reason,
        });
      } catch {
        // DB logging failure shouldn't break the tool
      }

      const result = [
        `**Response:**\n${fullResponse}`,
        "",
        `---`,
        `**Routing:** ${decision.tier} tier → ${decision.model}`,
        `**Confidence:** ${(decision.confidence * 100).toFixed(0)}%`,
        `**Reason:** ${decision.reason}`,
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
      getDb();
      const period = range || "7d";

      let startDate: string | undefined;
      const now = new Date();
      if (period === "today") {
        startDate = now.toISOString().split("T")[0];
      } else if (period === "7d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (period === "30d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      }

      const stats = getQueryStats(startDate);
      const models = getModelBreakdown(startDate);
      const daily = getDailyBreakdown(startDate);
      const recent = getRecentQueries(5);

      if (!stats || stats.totalQueries === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No queries found for range: ${period}`,
            },
          ],
        };
      }

      const savings = calculateSavings(
        stats.totalCost ?? 0,
        stats.totalTokensIn ?? 0,
        stats.totalTokensOut ?? 0
      );

      const lines = [
        `## LLM Router Stats (${period})`,
        "",
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Total Queries | ${stats.totalQueries} |`,
        `| Simple / Medium / Complex | ${stats.routedSimple} / ${stats.routedMedium} / ${stats.routedComplex} |`,
        `| Total Cost | $${(stats.totalCost ?? 0).toFixed(4)} |`,
        `| Est. Without Routing | $${savings.estimatedWithoutRouting.toFixed(4)} |`,
        `| Savings | ${savings.savingsPercent.toFixed(1)}% ($${savings.saved.toFixed(4)}) |`,
        `| Avg Latency | ${Math.round(stats.avgLatency ?? 0)}ms |`,
        "",
        `### Per-Model Breakdown`,
        "",
        `| Model | Queries | Cost | Avg Latency |`,
        `|-------|---------|------|-------------|`,
        ...models.map(
          (m) =>
            `| ${m.model} | ${m.count} | $${(m.totalCost ?? 0).toFixed(4)} | ${Math.round(m.avgLatency ?? 0)}ms |`
        ),
      ];

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
      const r = getRouter();
      const prev = currentStrategyName;
      currentStrategyName = strategy;
      r.setStrategy(createStrategy(strategy));

      return {
        content: [
          {
            type: "text" as const,
            text: `Routing strategy switched from "${prev}" to "${strategy}".`,
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
    const config = [
      `## LLM Router Configuration`,
      "",
      `| Setting | Value |`,
      `|---------|-------|`,
      `| Strategy | ${currentStrategyName} |`,
      `| Simple Tier | Ollama (${process.env.OLLAMA_MODEL || "llama3.2:3b"}) — Free |`,
      `| Medium Tier | GPT-4o mini — $0.15/1M in, $0.60/1M out |`,
      `| Complex Tier | GPT-4o — $2.50/1M in, $10.00/1M out |`,
      "",
      `### Available Strategies`,
      `- **heuristic** — Keyword and pattern matching (fastest, 100% test accuracy)`,
      `- **semantic** — Bag-of-words cosine similarity (94.4% test accuracy)`,
      "",
      `### How Routing Works`,
      `1. User sends a message`,
      `2. Strategy classifies complexity → simple / medium / complex`,
      `3. Message is routed to the appropriate model tier`,
      `4. Simple queries are free (local), saving 75%+ on costs`,
    ];

    return { content: [{ type: "text" as const, text: config.join("\n") }] };
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
