import type { RouterStrategy, Query, RoutingDecision, ModelTier } from "../types";

// Reference queries for each tier — used for simple bag-of-words similarity
const REFERENCE_QUERIES: Record<ModelTier, string[]> = {
  simple: [
    "hello", "hi there", "thanks", "yes", "no", "okay",
    "what time is it", "good morning", "bye", "how are you",
    "what is your name", "tell me a joke", "help",
  ],
  medium: [
    "how do I create a react component",
    "write a function to sort an array",
    "explain what a closure is in javascript",
    "summarize this article for me",
    "translate this text to spanish",
    "list the top 5 programming languages",
    "what are the differences between let and const",
    "help me write an email",
    "generate a regex for email validation",
  ],
  complex: [
    "explain the mathematical proof behind the riemann hypothesis",
    "design a distributed system for real-time analytics at scale",
    "analyze the security vulnerabilities in this authentication flow and propose fixes",
    "implement a red-black tree with deletion in typescript with full type safety",
    "compare and contrast microservices vs monolith architecture with trade-offs",
    "derive the backpropagation algorithm step by step with gradient calculations",
    "review this code for performance issues and suggest optimizations with benchmarks",
    "explain quantum entanglement and its implications for cryptography",
  ],
};

export class SemanticStrategy implements RouterStrategy {
  name = "semantic" as const;

  private referenceVectors: Record<ModelTier, number[][]>;
  private vocabulary: Map<string, number>;

  constructor() {
    this.vocabulary = this.buildVocabulary();
    this.referenceVectors = {
      simple: REFERENCE_QUERIES.simple.map((q) => this.vectorize(q)),
      medium: REFERENCE_QUERIES.medium.map((q) => this.vectorize(q)),
      complex: REFERENCE_QUERIES.complex.map((q) => this.vectorize(q)),
    };
  }

  async classify(query: Query): Promise<RoutingDecision> {
    const queryVec = this.vectorize(query.message);

    const scores: Record<ModelTier, number> = {
      simple: this.maxSimilarity(queryVec, this.referenceVectors.simple),
      medium: this.maxSimilarity(queryVec, this.referenceVectors.medium),
      complex: this.maxSimilarity(queryVec, this.referenceVectors.complex),
    };

    const tiers: ModelTier[] = ["simple", "medium", "complex"];
    const best = tiers.reduce((a, b) => (scores[a] >= scores[b] ? a : b));

    const modelMap: Record<ModelTier, { model: string; provider: string }> = {
      simple: { model: "ollama/local", provider: "ollama" },
      medium: { model: "gpt-4o-mini", provider: "openai" },
      complex: { model: "gpt-4o", provider: "openai" },
    };

    return {
      tier: best,
      confidence: scores[best],
      reason: `Semantic similarity: simple=${scores.simple.toFixed(2)}, medium=${scores.medium.toFixed(2)}, complex=${scores.complex.toFixed(2)}`,
      ...modelMap[best],
    };
  }

  private buildVocabulary(): Map<string, number> {
    const allWords = new Set<string>();
    for (const tier of Object.values(REFERENCE_QUERIES)) {
      for (const q of tier) {
        for (const word of this.tokenize(q)) {
          allWords.add(word);
        }
      }
    }
    const vocab = new Map<string, number>();
    let idx = 0;
    for (const word of allWords) {
      vocab.set(word, idx++);
    }
    return vocab;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  }

  private vectorize(text: string): number[] {
    const vec = new Array(this.vocabulary.size).fill(0);
    const tokens = this.tokenize(text);
    for (const token of tokens) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        vec[idx] += 1;
      }
    }
    return vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private maxSimilarity(queryVec: number[], referenceVecs: number[][]): number {
    let max = 0;
    for (const ref of referenceVecs) {
      const sim = this.cosineSimilarity(queryVec, ref);
      if (sim > max) max = sim;
    }
    return max;
  }
}
