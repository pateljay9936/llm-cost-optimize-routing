# How to Recreate LLM Router from Scratch — Step by Step

## Phase 1: Monorepo Setup

```bash
# 1. Create project
mkdir llm-router && cd llm-router
pnpm init
npx create-turbo@latest  # or manually setup

# 2. Create workspace config
# pnpm-workspace.yaml:
packages:
  - "packages/*"
  - "apps/*"
```

Build order matters. Packages that have zero internal dependencies go first.

---

## Phase 2: Shared TypeScript Config (no dependencies)

```
packages/tsconfig/
├── package.json        ← name: @llm-router/tsconfig
├── base.json           ← strict mode, ES2020, moduleResolution: bundler
├── library.json        ← extends base, for packages (declaration: true)
└── nextjs.json         ← extends base, for Next.js (jsx: preserve, plugins)
```

Every other package will `"extends": "@llm-router/tsconfig/library.json"`

---

## Phase 3: Core Types & Router Logic (no internal deps)

Build in this order — each file only depends on the ones above it:

```
packages/router-core/src/


│  STEP 1: Define all types first
├── types.ts              ← ModelTier, Query, ChatMessage, RoutingDecision,
│                            RouterStrategy (interface), LLMProvider (interface),
│                            CompletionResult, StreamChunk, ModelPricing, MODEL_PRICING


│  STEP 2: Strategies (implement RouterStrategy interface)
├── strategies/
│   ├── heuristic.ts      ← keyword arrays for simple/medium/complex + scoring
│   ├── semantic.ts       ← bag-of-words, cosine similarity, reference embeddings
│   └── routellm.ts       ← calls external RouteLLM API


│  STEP 3: Providers (implement LLMProvider interface)
├── providers/
│   ├── openai.ts         ← wraps OpenAI SDK, streaming, createGPT4oProvider()
│   ├── claude.ts         ← wraps Anthropic SDK, createSonnetProvider()
│   ├── ollama.ts         ← raw fetch to localhost:11434/api/chat
│   └── vllm.ts           ← raw fetch to vLLM server (OpenAI-compatible)


│  STEP 4: Router class (uses Strategy + Provider)
├── router.ts             ← Router class:
│                            constructor({ strategy, providers: { simple, medium, complex } })
│                            route(query) → { decision, stream }
│                            classify(query) → RoutingDecision


│  STEP 5: Cost tracker (uses MODEL_PRICING from types)
├── cost-tracker.ts       ← calculateCost(model, tokensIn, tokensOut)
│                            estimateFullCost() — "what if everything went to GPT-4o"
│                            calculateSavings() — actual vs estimated


│  STEP 6: Guardrails (standalone, no deps on router)
├── guardrails/
│   ├── types.ts          ← GuardrailConfig, GuardrailResult, GuardrailViolation
│   ├── patterns.ts       ← PII_PATTERNS (email/phone/SSN regex), INJECTION_PATTERNS, HARMFUL_PATTERNS
│   ├── input-guard.ts    ← validateInput(text, config) → { passed, violations }
│   ├── output-guard.ts   ← validateOutput(text, config) → { passed, violations, sanitized }
│   └── index.ts          ← barrel exports


│  STEP 7: Eval / Threshold tuner
├── eval/
│   └── threshold-tuner.ts ← analyzeThresholds(feedbackData) → { suggested, insights }


│  STEP 8: Main barrel export
└── index.ts              ← export everything public
```

Key insight: The `RouterStrategy` and `LLMProvider` are interfaces in `types.ts`. The strategies and providers are implementations. This is the Strategy pattern.

```typescript
// types.ts — the contracts
interface RouterStrategy {
  classify(query: Query): Promise<RoutingDecision>;
}

interface LLMProvider {
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<AsyncIterable<StreamChunk>>;
}

// router.ts — uses them
class Router {
  constructor(config: {
    strategy: RouterStrategy;        // any strategy works
    providers: Record<ModelTier, LLMProvider>;  // any provider works
  })
}
```

---

## Phase 4: Database Layer

```
packages/db/src/
│
│  STEP 1: Schema (table definitions)
├── schema.ts             ← queries table, dailyStats table (using drizzle-orm)
├── feedback-schema.ts    ← feedback table (references queries.id)
│
│  STEP 2: Client (connection + table creation)
├── client.ts             ← getDb(path?) → lazy singleton
│                            creates SQLite DB, runs CREATE TABLE IF NOT EXISTS
│
│  STEP 3: Query functions
├── queries.ts            ← logQuery(), getRecentQueries(), getQueryStats(),
│                            getDailyBreakdown(), getModelBreakdown()
├── feedback-queries.ts   ← logFeedback(), getFeedbackStats(),
│                            getMisroutesByTier(), getFeedbackTrend()
│
│  STEP 4: Barrel export
└── index.ts
```

Dependencies: `better-sqlite3` + `drizzle-orm`

---

## Phase 5: UI Component Library

```
packages/ui/src/
├── utils.ts    ← cn() helper (clsx + tailwind-merge)
├── button.tsx  ← variants: default/outline/ghost, sizes: sm/md/lg
├── card.tsx    ← Card, CardHeader, CardTitle, CardContent
├── input.tsx   ← styled text input
├── select.tsx  ← styled select dropdown
├── badge.tsx   ← variants: success/warning/info (for tier colors)
├── switch.tsx  ← toggle switch
└── index.ts    ← export all
```

Dependencies: `react`, `class-variance-authority`, `clsx`, `tailwind-merge`

---

## Phase 6: Next.js Web App

Build in this order:

```
apps/web/
│
│  STEP 1: Config files
├── tailwind.config.ts       ← dark theme, custom colors
├── tsconfig.json            ← extends @llm-router/tsconfig/nextjs.json
├── app/layout.tsx           ← html lang="en" className="dark"
│
│  STEP 2: Singleton instances (used by all API routes)
├── lib/
│   ├── router-instance.ts   ← reads env vars, creates Router with strategy + providers
│   └── db.ts                ← calls getDb() from @llm-router/db
│
│  STEP 3: API routes (backend — no UI needed yet)
├── app/api/
│   ├── chat/route.ts        ← POST: validate → route → stream SSE → log to DB
│   ├── stats/route.ts       ← GET: query stats with date range filtering
│   ├── feedback/route.ts    ← POST: save rating, GET: get stats
│   ├── router-config/route.ts ← GET/POST: read/change strategy
│   └── guardrails/route.ts  ← GET/POST: guardrail config
│
│  STEP 4: Chat UI
├── components/chat/
│   ├── chat-input.tsx        ← text input + send button
│   ├── chat-message.tsx      ← message bubble with tier badge, cost, latency
│   ├── strategy-toggle.tsx   ← dropdown to switch heuristic/semantic
│   ├── feedback-buttons.tsx  ← thumbs up/down (POST to /api/feedback)
│   ├── guardrail-warning.tsx ← yellow warning banner
│   └── chat-container.tsx    ← orchestrates everything, handles SSE streaming
├── app/page.tsx              ← renders <ChatContainer />
│
│  STEP 5: Dashboard
├── components/dashboard/
│   ├── stats-cards.tsx       ← 4 metric cards (queries, cost, savings, latency)
│   ├── routing-chart.tsx     ← PieChart (simple/medium/complex split)
│   ├── latency-chart.tsx     ← LineChart (latency over time)
│   ├── query-log.tsx         ← table of recent queries
│   ├── eval-cards.tsx        ← satisfaction rate, misroute rate, total feedback
│   ├── eval-charts.tsx       ← BarChart (satisfaction by tier), LineChart (misroute trend)
│   └── dashboard-container.tsx ← fetches data, renders all above
└── app/dashboard/page.tsx    ← renders <DashboardContainer />
```

---

## Phase 7: MCP Server (standalone)

```
packages/mcp-server/src/
└── index.ts    ← McpServer + 4 registerTool() calls
                   talks to Next.js via HTTP (no direct DB import!)
```

---

## Phase 8: Tests

```
packages/router-core/src/guardrails/input-guard.test.ts
packages/router-core/src/guardrails/output-guard.test.ts
packages/router-core/src/eval/threshold-tuner.test.ts
packages/db/src/feedback-queries.test.ts
packages/mcp-server/src/mcp-server.test.ts
```

---

## The Golden Rule: Dependency Order

```
tsconfig  →  types.ts  →  strategies + providers  →  router.ts  →  cost-tracker
                                                                         ↓
                              db (schema → client → queries)        guardrails
                                                                         ↓
                              ui (components)                    eval/threshold-tuner
                                                                         ↓
                                        web app (lib → api routes → components → pages)
                                                                         ↓
                                                                    mcp-server
```

Always build bottom-up: things with no dependencies first, things that depend on everything last.

---

## Quick Reference: Commands to Start

```bash
# 1. Init monorepo
mkdir llm-router && cd llm-router
pnpm init
mkdir -p packages/{tsconfig,router-core/src,db/src,ui/src,mcp-server/src} apps/web

# 2. Create pnpm-workspace.yaml
echo 'packages:\n  - "packages/*"\n  - "apps/*"' > pnpm-workspace.yaml

# 3. Install turbo
pnpm add -Dw turbo

# 4. Install per-package deps
pnpm add --filter @llm-router/core typescript
pnpm add --filter @llm-router/db better-sqlite3 drizzle-orm
pnpm add --filter @llm-router/ui react class-variance-authority clsx tailwind-merge
pnpm add --filter @llm-router/mcp-server @modelcontextprotocol/sdk zod
cd apps/web && npx create-next-app@14 . --typescript --tailwind --app

# 5. Start coding types.ts first!
```

The entire project is ~40 files. Start with `types.ts`, end with the dashboard. Each piece is small and testable on its own.

---

## Environment Variables (.env)

```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
VLLM_BASE_URL=http://localhost:8000
VLLM_MODEL=meta-llama/Llama-3.1-8B-Instruct
ROUTER_STRATEGY=heuristic
SELF_HOSTED_RUNTIME=ollama
DATABASE_URL=file:./data/router.db
```
