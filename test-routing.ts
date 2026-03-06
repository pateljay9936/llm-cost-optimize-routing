/**
 * LLM Router — Routing Classification Test Suite
 *
 * Tests that queries are routed to the expected model tier
 * across all three strategies (heuristic, semantic, routellm).
 *
 * Run: npx tsx test-routing.ts
 */

import { HeuristicStrategy } from "./packages/router-core/src/strategies/heuristic";
import { SemanticStrategy } from "./packages/router-core/src/strategies/semantic";
import { RouteLLMStrategy } from "./packages/router-core/src/strategies/routellm";
import type { RouterStrategy, ModelTier } from "./packages/router-core/src/types";

// ── Test Cases ───────────────────────────────────────────────────────────

interface TestCase {
  query: string;
  expectedTier: ModelTier;
  category: string;
}

const testCases: TestCase[] = [
  // ─── Simple (should route to Ollama / free) ───────────────────────
  { query: "hi", expectedTier: "simple", category: "Greeting" },
  { query: "hello", expectedTier: "simple", category: "Greeting" },
  { query: "hey there", expectedTier: "simple", category: "Greeting" },
  { query: "good morning", expectedTier: "simple", category: "Greeting" },
  { query: "thanks", expectedTier: "simple", category: "Gratitude" },
  { query: "thank you!", expectedTier: "simple", category: "Gratitude" },
  { query: "yes", expectedTier: "simple", category: "Short answer" },
  { query: "no", expectedTier: "simple", category: "Short answer" },
  { query: "ok", expectedTier: "simple", category: "Short answer" },
  { query: "bye", expectedTier: "simple", category: "Farewell" },
  { query: "goodbye", expectedTier: "simple", category: "Farewell" },
  { query: "sure", expectedTier: "simple", category: "Short answer" },
  { query: "nope", expectedTier: "simple", category: "Short answer" },
  { query: "yo", expectedTier: "simple", category: "Greeting" },

  // ─── Medium (should route to GPT-4o mini) ─────────────────────────
  {
    query: "how do I create a React component?",
    expectedTier: "medium",
    category: "How-to question",
  },
  {
    query: "write a function to reverse a string",
    expectedTier: "medium",
    category: "Code generation",
  },
  {
    query: "what is the difference between let and const?",
    expectedTier: "medium",
    category: "Explanation",
  },
  {
    query: "summarize the key points of machine learning",
    expectedTier: "medium",
    category: "Summarization",
  },
  {
    query: "list the top 5 programming languages in 2024",
    expectedTier: "medium",
    category: "List request",
  },
  {
    query: "translate 'hello world' to Spanish",
    expectedTier: "medium",
    category: "Translation",
  },
  {
    query: "write a python function to check if a number is prime",
    expectedTier: "medium",
    category: "Code generation",
  },
  {
    query: "help me write an email to my manager about taking time off",
    expectedTier: "medium",
    category: "Writing help",
  },
  {
    query: "generate a regex pattern for validating email addresses",
    expectedTier: "medium",
    category: "Code generation",
  },
  {
    query: "describe how HTTP works",
    expectedTier: "medium",
    category: "Explanation",
  },
  {
    query: "what is a closure in JavaScript? give me an example",
    expectedTier: "medium",
    category: "Explanation",
  },
  {
    query: "convert this JSON to a TypeScript interface",
    expectedTier: "medium",
    category: "Code conversion",
  },

  // ─── Complex (should route to GPT-4o) ─────────────────────────────
  {
    query:
      "explain the mathematical proof behind the Riemann hypothesis and its implications for prime number distribution",
    expectedTier: "complex",
    category: "Advanced math",
  },
  {
    query:
      "design a distributed system for real-time analytics at scale with trade-offs between consistency and availability",
    expectedTier: "complex",
    category: "System design",
  },
  {
    query:
      "analyze the security vulnerabilities in OAuth 2.0 authorization code flow and propose fixes",
    expectedTier: "complex",
    category: "Security analysis",
  },
  {
    query:
      "implement a red-black tree with insertion and deletion in TypeScript with full type safety",
    expectedTier: "complex",
    category: "Complex code",
  },
  {
    query:
      "compare and contrast microservices vs monolith architecture, listing pros and cons with real-world trade-offs",
    expectedTier: "complex",
    category: "Architecture comparison",
  },
  {
    query:
      "derive the backpropagation algorithm step by step for a neural network with mathematical proofs",
    expectedTier: "complex",
    category: "ML / math derivation",
  },
  {
    query:
      "explain quantum entanglement with mathematical proof and its implications for cryptography",
    expectedTier: "complex",
    category: "Physics + math",
  },
  {
    query:
      "review this authentication flow for security vulnerabilities and suggest a comprehensive fix:\n```\napp.post('/login', (req, res) => {\n  const user = db.query('SELECT * FROM users WHERE email = ' + req.body.email);\n  if (user.password === req.body.password) res.json({token: jwt.sign(user)});\n});\n```",
    expectedTier: "complex",
    category: "Code review + security",
  },
  {
    query:
      "design a comprehensive database schema and API architecture for a multi-tenant SaaS platform with role-based access control, audit logging, and data isolation. Include trade-offs for different approaches.",
    expectedTier: "complex",
    category: "Full system design",
  },
  {
    query:
      "explain how differential equations are used in modeling epidemics, derive the SIR model, and analyze its stability using calculus",
    expectedTier: "complex",
    category: "Math modeling",
  },
];

// ── Runner ────────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

function tierIcon(tier: ModelTier): string {
  switch (tier) {
    case "simple":
      return `${COLORS.green}LOCAL${COLORS.reset}`;
    case "medium":
      return `${COLORS.yellow}GPT-4o-mini${COLORS.reset}`;
    case "complex":
      return `${COLORS.blue}GPT-4o${COLORS.reset}`;
  }
}

async function runTests(strategy: RouterStrategy): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    query: string;
    expected: ModelTier;
    actual: ModelTier;
    pass: boolean;
    confidence: number;
    reason: string;
    category: string;
  }>;
}> {
  let passed = 0;
  let failed = 0;
  const results: Array<{
    query: string;
    expected: ModelTier;
    actual: ModelTier;
    pass: boolean;
    confidence: number;
    reason: string;
    category: string;
  }> = [];

  for (const tc of testCases) {
    const decision = await strategy.classify({ message: tc.query });
    const pass = decision.tier === tc.expectedTier;
    if (pass) passed++;
    else failed++;

    results.push({
      query: tc.query,
      expected: tc.expectedTier,
      actual: decision.tier,
      pass,
      confidence: decision.confidence,
      reason: decision.reason,
      category: tc.category,
    });
  }

  return { passed, failed, results };
}

function printResults(
  strategyName: string,
  data: Awaited<ReturnType<typeof runTests>>
) {
  const total = data.passed + data.failed;
  const pct = ((data.passed / total) * 100).toFixed(1);

  console.log(
    `\n${COLORS.bold}${"═".repeat(70)}${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}  Strategy: ${COLORS.cyan}${strategyName.toUpperCase()}${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${"═".repeat(70)}${COLORS.reset}\n`
  );

  // Group by category
  const categories = new Map<string, typeof data.results>();
  for (const r of data.results) {
    if (!categories.has(r.category)) categories.set(r.category, []);
    categories.get(r.category)!.push(r);
  }

  for (const [category, items] of categories) {
    console.log(`  ${COLORS.dim}── ${category} ──${COLORS.reset}`);
    for (const r of items) {
      const icon = r.pass
        ? `${COLORS.green}✓${COLORS.reset}`
        : `${COLORS.red}✗${COLORS.reset}`;
      const queryShort =
        r.query.length > 55 ? r.query.slice(0, 55) + "..." : r.query;
      const queryClean = queryShort.replace(/\n/g, " ");

      if (r.pass) {
        console.log(
          `  ${icon} "${queryClean}" → ${tierIcon(r.actual)} ${COLORS.dim}(${(r.confidence * 100).toFixed(0)}%)${COLORS.reset}`
        );
      } else {
        console.log(
          `  ${icon} "${queryClean}"`
        );
        console.log(
          `     Expected: ${tierIcon(r.expected)}  Got: ${tierIcon(r.actual)} ${COLORS.dim}(${(r.confidence * 100).toFixed(0)}% — ${r.reason})${COLORS.reset}`
        );
      }
    }
    console.log();
  }

  // Summary
  const color = data.failed === 0 ? COLORS.green : data.failed <= 3 ? COLORS.yellow : COLORS.red;
  console.log(
    `  ${color}${COLORS.bold}Result: ${data.passed}/${total} passed (${pct}%)${COLORS.reset}  |  ${COLORS.green}${data.passed} passed${COLORS.reset}  ${COLORS.red}${data.failed} failed${COLORS.reset}`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════╗${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${COLORS.cyan}║           LLM Router — Routing Classification Tests                ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${COLORS.cyan}║                                                                    ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${COLORS.cyan}║  Testing ${testCases.length} queries across 3 strategies                          ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${COLORS.cyan}║  Simple → Ollama (free)  |  Medium → GPT-4o mini  |  Complex → GPT-4o ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${COLORS.cyan}╚══════════════════════════════════════════════════════════════════════╝${COLORS.reset}`
  );

  const strategies: { name: string; instance: RouterStrategy }[] = [
    { name: "Heuristic", instance: new HeuristicStrategy() },
    { name: "Semantic", instance: new SemanticStrategy() },
    { name: "RouteLLM (fallback)", instance: new RouteLLMStrategy() },
  ];

  const summaries: { name: string; passed: number; total: number }[] = [];

  for (const s of strategies) {
    const result = await runTests(s.instance);
    printResults(s.name, result);
    summaries.push({
      name: s.name,
      passed: result.passed,
      total: result.passed + result.failed,
    });
  }

  // Final summary
  console.log(
    `\n${COLORS.bold}${"═".repeat(70)}${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}  OVERALL SUMMARY${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}${"═".repeat(70)}${COLORS.reset}\n`
  );

  for (const s of summaries) {
    const pct = ((s.passed / s.total) * 100).toFixed(1);
    const color =
      s.passed === s.total
        ? COLORS.green
        : s.passed / s.total >= 0.8
          ? COLORS.yellow
          : COLORS.red;
    const bar = "█".repeat(Math.round((s.passed / s.total) * 30));
    const emptyBar = "░".repeat(30 - Math.round((s.passed / s.total) * 30));
    console.log(
      `  ${s.name.padEnd(22)} ${color}${bar}${COLORS.dim}${emptyBar}${COLORS.reset}  ${color}${s.passed}/${s.total} (${pct}%)${COLORS.reset}`
    );
  }

  console.log();

  // Exit code
  const allPassed = summaries.every((s) => s.passed === s.total);
  if (!allPassed) {
    console.log(
      `${COLORS.yellow}  Some tests failed. This is expected — routing is probabilistic.${COLORS.reset}`
    );
    console.log(
      `${COLORS.yellow}  Review mismatches above to tune strategy thresholds.${COLORS.reset}\n`
    );
  } else {
    console.log(
      `${COLORS.green}${COLORS.bold}  All tests passed across all strategies!${COLORS.reset}\n`
    );
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
