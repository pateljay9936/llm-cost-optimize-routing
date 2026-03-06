import type { RouterStrategy, Query, RoutingDecision, ModelTier } from "../types";

const COMPLEX_KEYWORDS = [
  "explain", "analyze", "compare", "contrast", "evaluate", "synthesize",
  "prove", "derive", "implement", "architect", "design pattern",
  "trade-off", "tradeoff", "pros and cons", "in-depth", "comprehensive",
  "step by step", "mathematical", "algorithm", "theorem", "proof",
  "debug", "refactor", "optimize", "security", "vulnerability",
  "distributed system", "machine learning", "neural network",
  "quantum", "differential equation", "calculus", "abstract algebra",
];

const MEDIUM_KEYWORDS = [
  "how", "why", "what is", "describe", "summarize", "list",
  "write a function", "write code", "create a", "help me",
  "translate", "convert", "format", "generate", "suggest",
  "review", "check", "example", "tutorial",
];

const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|yo|sup|greetings|good\s+(morning|afternoon|evening))[.!?\s]*$/i,
  /^(thanks|thank you|thx|ty)[.!?\s]*$/i,
  /^(yes|no|ok|okay|sure|yep|nope|yeah|nah)[.!?\s]*$/i,
  /^(bye|goodbye|see you|later|cya)[.!?\s]*$/i,
  /^what(s|'s| is) (your name|up|the time|the date|today)[?.\s]*$/i,
];

const CODE_PATTERNS = [
  /```[\s\S]*```/,
  /function\s+\w+/,
  /class\s+\w+/,
  /import\s+.*from/,
  /const\s+\w+\s*=/,
  /def\s+\w+/,
  /public\s+(static\s+)?void/,
];

export class HeuristicStrategy implements RouterStrategy {
  name = "heuristic" as const;

  async classify(query: Query): Promise<RoutingDecision> {
    const message = query.message.trim();
    const lower = message.toLowerCase();
    const wordCount = message.split(/\s+/).length;

    // Check simple patterns first
    for (const pattern of SIMPLE_PATTERNS) {
      if (pattern.test(message)) {
        return this.decision("simple", 0.95, "Matched simple greeting/response pattern");
      }
    }

    // Very short messages are likely simple
    if (wordCount <= 3 && !this.hasCodeContent(message)) {
      return this.decision("simple", 0.85, "Very short query");
    }

    // Check for code content
    const hasCode = this.hasCodeContent(message);

    // Check complex keywords
    const complexScore = this.keywordScore(lower, COMPLEX_KEYWORDS);
    if (complexScore >= 2 || (complexScore >= 1 && wordCount > 10)) {
      return this.decision("complex", 0.8 + complexScore * 0.05, "Complex keywords detected");
    }

    // Long queries with code are complex
    if (hasCode && wordCount > 30) {
      return this.decision("complex", 0.8, "Code content with detailed context");
    }

    // Code content defaults to medium
    if (hasCode) {
      return this.decision("medium", 0.75, "Contains code content");
    }

    // Check medium keywords
    const mediumScore = this.keywordScore(lower, MEDIUM_KEYWORDS);
    if (mediumScore >= 1) {
      // Long medium queries escalate to complex
      if (wordCount > 80) {
        return this.decision("complex", 0.7, "Long query with medium-complexity indicators");
      }
      return this.decision("medium", 0.7 + mediumScore * 0.05, "Medium-complexity keywords detected");
    }

    // Multi-turn context increases complexity
    if (query.history && query.history.length > 6) {
      return this.decision("medium", 0.65, "Extended conversation context");
    }

    // Length-based fallback
    if (wordCount > 40) {
      return this.decision("medium", 0.6, "Moderately long query");
    }

    return this.decision("simple", 0.6, "Default: no complexity indicators found");
  }

  private keywordScore(text: string, keywords: string[]): number {
    return keywords.reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0);
  }

  private hasCodeContent(text: string): boolean {
    return CODE_PATTERNS.some((p) => p.test(text));
  }

  private decision(
    tier: ModelTier,
    confidence: number,
    reason: string
  ): RoutingDecision {
    const modelMap: Record<ModelTier, { model: string; provider: string }> = {
      simple: { model: "ollama/local", provider: "ollama" },
      medium: { model: "gpt-4o-mini", provider: "openai" },
      complex: { model: "gpt-4o", provider: "openai" },
    };
    return {
      tier,
      confidence: Math.min(confidence, 1),
      reason,
      ...modelMap[tier],
    };
  }
}
