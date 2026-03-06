import { MODEL_PRICING, type ModelPricing } from "./types";

export function calculateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (tokensIn / 1_000_000) * pricing.inputPer1M +
    (tokensOut / 1_000_000) * pricing.outputPer1M
  );
}

export function estimateFullCost(
  tokensIn: number,
  tokensOut: number,
  referenceModel: string = "gpt-4o"
): number {
  return calculateCost(referenceModel, tokensIn, tokensOut);
}

export function calculateSavings(
  actualCost: number,
  tokensIn: number,
  tokensOut: number
): { estimatedWithoutRouting: number; saved: number; savingsPercent: number } {
  const estimatedWithoutRouting = estimateFullCost(tokensIn, tokensOut);
  const saved = estimatedWithoutRouting - actualCost;
  const savingsPercent =
    estimatedWithoutRouting > 0 ? (saved / estimatedWithoutRouting) * 100 : 0;
  return { estimatedWithoutRouting, saved, savingsPercent };
}
