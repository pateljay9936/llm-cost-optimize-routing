export interface ThresholdConfig {
  /** Max complexity score for "simple" tier (0-1) */
  simple: number;
  /** Max complexity score for "medium" tier (0-1) */
  medium: number;
}

export interface TierFeedback {
  tier: string;
  total: number;
  thumbsUp: number;
  thumbsDown: number;
}

export interface ThresholdAnalysis {
  current: ThresholdConfig;
  suggested: ThresholdConfig;
  insights: string[];
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  simple: 0.3,
  medium: 0.7,
};

/**
 * Analyzes per-tier feedback data and suggests threshold adjustments
 * to reduce misroutes.
 *
 * Logic:
 * - If simple tier has >20% thumbs-down → lower simple threshold (fewer queries routed to simple)
 * - If complex tier has >90% thumbs-up → raise medium threshold (save cost by routing more to medium)
 * - Otherwise, no change suggested
 */
export function analyzeThresholds(
  perTierFeedback: TierFeedback[],
  currentThresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ThresholdAnalysis {
  const suggested: ThresholdConfig = { ...currentThresholds };
  const insights: string[] = [];

  const simpleFeedback = perTierFeedback.find((t) => t.tier === "simple");
  const mediumFeedback = perTierFeedback.find((t) => t.tier === "medium");
  const complexFeedback = perTierFeedback.find((t) => t.tier === "complex");

  // Check simple tier: high dissatisfaction means we're routing too many queries to simple
  if (simpleFeedback && simpleFeedback.total >= 5) {
    const downRate = simpleFeedback.thumbsDown / simpleFeedback.total;
    if (downRate > 0.2) {
      const adjustment = Math.min(0.05, downRate * 0.1);
      suggested.simple = Math.max(0.1, currentThresholds.simple - adjustment);
      insights.push(
        `Simple tier has ${(downRate * 100).toFixed(0)}% thumbs-down rate. ` +
          `Suggest lowering simple threshold from ${currentThresholds.simple.toFixed(2)} to ${suggested.simple.toFixed(2)} ` +
          `to route fewer queries to the simple tier.`
      );
    }
  }

  // Check complex tier: if users are very happy, we could route more to medium to save cost
  if (complexFeedback && complexFeedback.total >= 5) {
    const upRate = complexFeedback.thumbsUp / complexFeedback.total;
    if (upRate > 0.9) {
      const adjustment = 0.03;
      suggested.medium = Math.min(0.9, currentThresholds.medium + adjustment);
      insights.push(
        `Complex tier has ${(upRate * 100).toFixed(0)}% satisfaction rate. ` +
          `Suggest raising medium threshold from ${currentThresholds.medium.toFixed(2)} to ${suggested.medium.toFixed(2)} ` +
          `to save cost by routing more queries to medium tier.`
      );
    }
  }

  // Check medium tier balance
  if (mediumFeedback && mediumFeedback.total >= 5) {
    const downRate = mediumFeedback.thumbsDown / mediumFeedback.total;
    if (downRate > 0.3) {
      insights.push(
        `Medium tier has ${(downRate * 100).toFixed(0)}% thumbs-down rate. ` +
          `Consider reviewing which queries are being routed to medium tier.`
      );
    } else {
      insights.push(
        `Medium tier feedback is balanced (${(((mediumFeedback.thumbsUp / mediumFeedback.total) * 100)).toFixed(0)}% satisfaction). No threshold change needed.`
      );
    }
  }

  if (insights.length === 0) {
    insights.push("Not enough feedback data to suggest threshold changes. At least 5 ratings per tier are needed.");
  }

  return {
    current: currentThresholds,
    suggested,
    insights,
  };
}
