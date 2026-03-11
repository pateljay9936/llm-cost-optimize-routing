import {
  Router,
  HeuristicStrategy,
  SemanticStrategy,
  RouteLLMStrategy,
  LLMJudgeStrategy,
  createGPT4oProvider,
  createGPT4oMiniProvider,
  OllamaProvider,
  VLLMProvider,
  type RouterStrategy,
  type LLMProvider,
} from "@llm-router/core";

let routerInstance: Router | null = null;
let currentStrategyName: string = process.env.ROUTER_STRATEGY || "heuristic";

function createStrategy(name: string): RouterStrategy {
  switch (name) {
    case "semantic":
      return new SemanticStrategy();
    case "routellm":
      return new RouteLLMStrategy(process.env.ROUTELLM_URL);
    case "llm-judge":
      return new LLMJudgeStrategy(process.env.OLLAMA_MODEL, process.env.OLLAMA_BASE_URL);
    case "heuristic":
    default:
      return new HeuristicStrategy();
  }
}

let ollamaAvailable: boolean | null = null;

async function checkOllama(baseUrl: string): Promise<boolean> {
  if (ollamaAvailable !== null) return ollamaAvailable;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    ollamaAvailable = res.ok;
  } catch {
    ollamaAvailable = false;
  }
  if (!ollamaAvailable) {
    console.warn("[router] Ollama not reachable, simple tier will fallback to GPT-4o mini");
  }
  return ollamaAvailable;
}

function createSimpleProvider(): LLMProvider {
  const runtime = process.env.SELF_HOSTED_RUNTIME || "ollama";
  if (runtime === "vllm") {
    return new VLLMProvider(
      process.env.VLLM_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
      process.env.VLLM_BASE_URL || "http://localhost:8000"
    );
  }

  // If OLLAMA_FALLBACK=openai, skip Ollama entirely (for Vercel/cloud)
  if (process.env.OLLAMA_FALLBACK === "openai") {
    return createGPT4oMiniProvider(process.env.OPENAI_API_KEY) as unknown as LLMProvider;
  }

  return new OllamaProvider(
    process.env.OLLAMA_MODEL || "llama3.2:3b",
    process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  );
}

export function getRouter(): Router {
  if (!routerInstance) {
    routerInstance = new Router({
      strategy: createStrategy(currentStrategyName),
      providers: {
        simple: createSimpleProvider(),
        medium: createGPT4oMiniProvider(process.env.OPENAI_API_KEY),
        complex: createGPT4oProvider(process.env.OPENAI_API_KEY),
      },
    });
  }
  return routerInstance;
}

export function setStrategy(name: string): void {
  currentStrategyName = name;
  const router = getRouter();
  router.setStrategy(createStrategy(name));
}

export function getStrategyName(): string {
  return currentStrategyName;
}
