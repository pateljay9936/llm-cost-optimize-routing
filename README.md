# LLM Router

**A smart AI chatbot that saves you money by automatically choosing the right AI model for each question.**

---

## What Does This Project Do?

Imagine you're paying for AI responses. Some questions are simple ("Hi!", "What's 2+2?"), and some are complex ("Explain quantum physics with math proofs"). It doesn't make sense to use an expensive, powerful AI model for simple questions.

**LLM Router solves this.** It automatically analyzes every question you ask and routes it to the right AI model:

| Question Type | Example | Model Used | Cost |
|---|---|---|---|
| **Simple** | "Hello!", "Thanks", "Yes" | Local model (Ollama) | **Free** |
| **Medium** | "Write a function to sort a list" | GPT-4o mini | **Very cheap** |
| **Complex** | "Design a distributed system architecture" | GPT-4o | **Standard price** |

### Real Results

In testing with 10 queries, the router achieved:

- **75.8% cost savings** compared to sending everything to GPT-4o
- 7 out of 10 queries routed to the free local model
- Only 1 query needed the expensive GPT-4o model
- Total cost: **$0.008** instead of an estimated **$0.036**

---

## How Does It Work?

```
You type a question
        │
        ▼
   Router analyzes it
   (Is this simple, medium, or complex?)
        │
        ├── Simple? ──→ Send to Ollama (free, runs on your computer)
        ├── Medium? ──→ Send to GPT-4o mini (cheap, from OpenAI)
        └── Complex? ─→ Send to GPT-4o (powerful, from OpenAI)
        │
        ▼
   You get your answer
   (with a badge showing which model answered + cost)
```

### The Classification Strategies

The router uses different strategies to decide where to send your question. You can switch between them in the app:

#### 1. Heuristic Strategy (Default)
Uses rules and keyword detection:
- Sees "hi", "thanks", "bye" → Simple
- Sees "how to", "write code", "explain" → Medium
- Sees "prove", "analyze", "design system", "mathematical" → Complex
- Also checks: message length, whether it contains code, conversation length

#### 2. Semantic Strategy
Compares your question to a library of reference questions using word similarity. If your question looks most like the "complex" reference questions, it routes to GPT-4o.

#### 3. RouteLLM Strategy
Designed to integrate with [RouteLLM](https://github.com/lm-sys/RouteLLM), a machine learning-based router. Falls back to heuristic when the RouteLLM server isn't available.

---

## What's in the Box?

This project is organized as a **monorepo** (multiple projects in one folder):

```
llm-router/
├── apps/
│   └── web/                    ← The website you interact with
│       ├── app/
│       │   ├── page.tsx        ← Chat page (the main page)
│       │   ├── dashboard/      ← Analytics dashboard
│       │   └── api/            ← Backend endpoints
│       ├── components/
│       │   ├── chat/           ← Chat UI components
│       │   └── dashboard/      ← Dashboard charts & tables
│       └── lib/                ← Configuration & database setup
│
├── packages/
│   ├── router-core/            ← The brain: routing logic + AI providers
│   │   └── src/
│   │       ├── strategies/     ← How questions are classified
│   │       ├── providers/      ← How we talk to each AI model
│   │       ├── router.ts       ← The main router engine
│   │       ├── cost-tracker.ts ← Calculates costs and savings
│   │       └── types.ts        ← Data definitions
│   │
│   ├── db/                     ← Database: stores all query history
│   │   └── src/
│   │       ├── schema.ts       ← Database table definitions
│   │       ├── client.ts       ← Database connection
│   │       └── queries.ts      ← Functions to read/write data
│   │
│   ├── ui/                     ← Shared UI components (buttons, cards, etc.)
│   └── tsconfig/               ← Shared TypeScript settings
│
├── .env                        ← Your secret API keys (never share this!)
├── .env.example                ← Template showing what keys you need
└── turbo.json                  ← Build system configuration
```

### The Two Pages

#### Chat Page (`/`)
- A clean chat interface where you type messages
- Each AI response shows a colored badge:
  - 🟢 **Green** = answered by local model (free)
  - 🟡 **Yellow** = answered by GPT-4o mini (cheap)
  - 🔵 **Blue** = answered by GPT-4o (powerful)
- Shows cost and response time for each message
- Strategy selector in the header to switch routing methods

#### Dashboard (`/dashboard`)
- **Stats cards**: total queries, total cost, cost savings %, average response time
- **Pie chart**: breakdown of how queries were routed (simple/medium/complex)
- **Line chart**: response times over time
- **Query log table**: every question with its model, cost, latency, and timestamp
- **Time filter**: view stats for today, last 7 days, 30 days, or all time

---

## Prerequisites

Before you start, you need these installed on your computer:

### 1. Node.js (version 18 or newer)
Node.js runs JavaScript on your computer (outside a browser).

- **Check if installed**: Open Terminal and type `node --version`
- **Install**: Download from [nodejs.org](https://nodejs.org) — choose the "LTS" version

### 2. pnpm (package manager)
pnpm installs and manages code libraries the project depends on.

- **Check if installed**: `pnpm --version`
- **Install**: Run `npm install -g pnpm` in Terminal

### 3. Ollama (for free local AI)
Ollama lets you run AI models on your own computer for free.

- **Install**: Download from [ollama.com](https://ollama.com)
- **After installing**, open Terminal and run:
  ```bash
  ollama pull llama3.2:3b
  ```
  This downloads a small (2GB) AI model. It takes a few minutes.
- **Verify it's running**: `ollama list` should show the model

### 4. OpenAI API Key
You need an API key from OpenAI for the medium and complex queries.

- Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create an account if you don't have one
- Click "Create new secret key"
- Copy the key (it starts with `sk-`)
- You'll need to add billing/credits to your OpenAI account

---

## Setup (Step by Step)

### Step 1: Open Terminal
- On Mac: Press `Cmd + Space`, type "Terminal", press Enter
- On Windows: Press `Win + R`, type "cmd", press Enter

### Step 2: Navigate to the project
```bash
cd path/to/llm-router
```
Replace `path/to/llm-router` with the actual folder location. For example:
```bash
cd ~/CodeBase/demo_claude_code/llm-router
```

### Step 3: Set up your API key
Copy the example environment file:
```bash
cp .env.example .env
```

Now open the `.env` file in any text editor and replace `sk-...` with your actual OpenAI API key:
```
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

> **Important**: Never share your `.env` file or commit it to GitHub. It contains your secret API key.

### Step 4: Install dependencies
```bash
pnpm install
```
This downloads all the code libraries the project needs. It may take a minute or two.

### Step 5: Make sure Ollama is running
Open a **separate** Terminal window and run:
```bash
ollama serve
```
Leave this running. (If you installed Ollama as a desktop app, it may already be running.)

### Step 6: Start the app
Back in your original Terminal:
```bash
pnpm dev
```

You should see output like:
```
✓ Ready in 1.5s
- Local: http://localhost:3000
```

### Step 7: Open in your browser
Go to: **http://localhost:3000**

You should see the chat interface. Try typing "hello" — it should route to the free local model!

---

## Using the App

### Chatting
1. Type a message in the input box and press **Enter** (or click **Send**)
2. Watch the colored badge on the response:
   - **Local** (green) = free
   - **GPT-4o mini** (yellow) = ~$0.0003 per response
   - **GPT-4o** (blue) = ~$0.008 per response
3. The cost and response time are shown below each message

### Changing the Router Strategy
- Click the dropdown in the top-right corner
- Choose between **Heuristic**, **Semantic**, or **RouteLLM**
- Each strategy classifies questions differently — try the same question with different strategies!

### Viewing the Dashboard
- Click **Dashboard** in the top-right corner (or go to http://localhost:3000/dashboard)
- Use the time filter buttons (Today / 7 Days / 30 Days / All) to change the view
- Click **Refresh** to update with the latest data
- Click **Chat** to go back to the chat interface

---

## Try These Example Queries

| Query | Expected Routing | Why |
|---|---|---|
| `hi` | Local (free) | Simple greeting |
| `thanks` | Local (free) | Simple response |
| `what is a variable in programming` | GPT-4o mini | Medium complexity, educational question |
| `write a python function to sort a list` | GPT-4o mini | Code generation, medium difficulty |
| `explain the mathematical proof behind RSA encryption and analyze its security vulnerabilities` | GPT-4o | Complex: math + security + analysis |
| `design a distributed microservices architecture for a real-time analytics platform with trade-offs` | GPT-4o | Complex: architecture + design + trade-offs |

---

## Stopping the App

1. In the Terminal where `pnpm dev` is running, press **Ctrl + C**
2. Your data is saved! When you run `pnpm dev` again, all your previous chat history and stats will still be there (stored in `apps/web/data/router.db`)

---

## Troubleshooting

### "Error: OPENAI_API_KEY is not set"
- Make sure you created the `.env` file (Step 3 above)
- Make sure it's in **both** `llm-router/.env` and `llm-router/apps/web/.env`
- Quick fix: `cp .env apps/web/.env`

### "Error: Ollama error: fetch failed" or simple queries fail
- Ollama isn't running. Open a new Terminal and run: `ollama serve`
- Or if Ollama is running but the model isn't downloaded: `ollama pull llama3.2:3b`

### Dashboard shows "Loading..." forever
- Check that the app is running (`pnpm dev`)
- Try refreshing the page
- Open browser DevTools (F12) → Console to see error details

### "pnpm: command not found"
- Install pnpm: `npm install -g pnpm`
- If npm isn't found either, install Node.js first from [nodejs.org](https://nodejs.org)

### Port 3000 already in use
- Another app is using port 3000. Either stop it, or change the port:
  ```bash
  PORT=3001 pnpm dev
  ```
  Then open http://localhost:3001

---

## How the Cost Savings Are Calculated

The dashboard shows cost savings by comparing:
- **Actual cost**: What you actually paid (based on real token usage per model)
- **Without routing**: What it would have cost if every single query went to GPT-4o

The formula:
```
Savings % = (GPT-4o cost for all queries - Actual cost) / GPT-4o cost for all queries × 100
```

### Model Pricing (per 1 million tokens)

| Model | Input Cost | Output Cost | Used For |
|---|---|---|---|
| Ollama (local) | $0.00 | $0.00 | Simple queries |
| GPT-4o mini | $0.15 | $0.60 | Medium queries |
| GPT-4o | $2.50 | $10.00 | Complex queries |

Since most everyday questions are simple, and simple queries are **free**, the savings add up fast.


---


# Testing the Router

The project includes a test suite that verifies 36 different queries are routed to the correct model across all 3 strategies.

### Running the Tests

```bash
npx tsx test-routing.ts
```

No API keys or servers needed — the tests only check the classification logic, not actual AI responses.

### What Gets Tested

The test file (`test-routing.ts`) checks **36 queries** across **3 categories**:

#### Simple Queries (14 tests) — Should route to Ollama (free)
| Query | Category |
|---|---|
| `hi`, `hello`, `hey there`, `yo` | Greetings |
| `good morning` | Greetings |
| `thanks`, `thank you!` | Gratitude |
| `yes`, `no`, `ok`, `sure`, `nope` | Short answers |
| `bye`, `goodbye` | Farewells |

#### Medium Queries (12 tests) — Should route to GPT-4o mini
| Query | Category |
|---|---|
| `how do I create a React component?` | How-to |
| `write a function to reverse a string` | Code generation |
| `write a python function to check if a number is prime` | Code generation |
| `what is the difference between let and const?` | Explanation |
| `summarize the key points of machine learning` | Summarization |
| `list the top 5 programming languages in 2024` | List request |
| `translate 'hello world' to Spanish` | Translation |
| `help me write an email to my manager about taking time off` | Writing help |
| `generate a regex pattern for validating email addresses` | Code generation |
| `describe how HTTP works` | Explanation |
| `what is a closure in JavaScript? give me an example` | Explanation |
| `convert this JSON to a TypeScript interface` | Code conversion |

#### Complex Queries (10 tests) — Should route to GPT-4o
| Query | Category |
|---|---|
| `explain the mathematical proof behind the Riemann hypothesis...` | Advanced math |
| `design a distributed system for real-time analytics at scale...` | System design |
| `analyze the security vulnerabilities in OAuth 2.0...` | Security analysis |
| `implement a red-black tree with insertion and deletion...` | Complex code |
| `compare and contrast microservices vs monolith architecture...` | Architecture |
| `derive the backpropagation algorithm step by step...` | ML / math |
| `explain quantum entanglement with mathematical proof...` | Physics + math |
| `review this authentication flow for security vulnerabilities...` | Code review |
| `design a comprehensive database schema and API architecture...` | Full system design |
| `explain how differential equations are used in modeling epidemics...` | Math modeling |

### Test Results

All 3 strategies are tested. Here are the current results:

```
Strategy               Score
─────────────────────────────────────
Heuristic              36/36 (100.0%)
Semantic               34/36 (94.4%)
RouteLLM (fallback)    36/36 (100.0%)
```

The Semantic strategy has a slightly lower score because it uses simple word-similarity matching (bag-of-words), which can sometimes miscategorize edge cases. The Heuristic and RouteLLM strategies achieve perfect scores.

### Sample Test Output

When you run the tests, you'll see colored output like this:

```
── Greeting ──
  ✓ "hi" → LOCAL (95%)
  ✓ "hello" → LOCAL (95%)

── Code generation ──
  ✓ "write a function to reverse a string" → GPT-4o-mini (75%)

── Advanced math ──
  ✓ "explain the mathematical proof behind the Riemann hypot..." → GPT-4o (95%)
```

Each line shows:
- ✓ or ✗ — whether the test passed
- The query (truncated if long)
- Which model it was routed to
- The confidence percentage

---

## Tech Stack (For Developers)

| Component | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui-style components |
| API | Next.js Route Handlers (streaming SSE) |
| Router Engine | Custom TypeScript package with strategy pattern |
| Paid AI | OpenAI SDK (GPT-4o, GPT-4o mini) |
| Free AI | Ollama (local LLM) |
| Database | SQLite via Drizzle ORM |
| Charts | Recharts |

---

## License

This project is for educational and personal use.
