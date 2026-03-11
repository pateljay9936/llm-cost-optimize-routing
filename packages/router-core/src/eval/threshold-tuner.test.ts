import { describe, it, expect } from "vitest";
import { analyzeThresholds, type TierFeedback, type ThresholdConfig } from "./threshold-tuner";

describe("analyzeThresholds", () => {
  const defaultThresholds: ThresholdConfig = { simple: 0.3, medium: 0.7 };

  it("returns no changes with insufficient data", () => {
    const feedback: TierFeedback[] = [
      { tier: "simple", total: 2, thumbsUp: 2, thumbsDown: 0 },
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested).toEqual(defaultThresholds);
    expect(result.insights[0]).toContain("Not enough feedback");
  });

  it("suggests lowering simple threshold when thumbs-down > 20%", () => {
    const feedback: TierFeedback[] = [
      { tier: "simple", total: 10, thumbsUp: 5, thumbsDown: 5 }, // 50% down
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested.simple).toBeLessThan(defaultThresholds.simple);
    expect(result.insights[0]).toContain("thumbs-down rate");
    expect(result.insights[0]).toContain("lowering simple threshold");
  });

  it("does not change simple threshold when satisfaction is high", () => {
    const feedback: TierFeedback[] = [
      { tier: "simple", total: 10, thumbsUp: 9, thumbsDown: 1 }, // 10% down
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested.simple).toBe(defaultThresholds.simple);
  });

  it("suggests raising medium threshold when complex satisfaction > 90%", () => {
    const feedback: TierFeedback[] = [
      { tier: "complex", total: 10, thumbsUp: 10, thumbsDown: 0 }, // 100% up
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested.medium).toBeGreaterThan(defaultThresholds.medium);
    expect(result.insights[0]).toContain("satisfaction rate");
  });

  it("does not raise medium threshold when complex satisfaction <= 90%", () => {
    const feedback: TierFeedback[] = [
      { tier: "complex", total: 10, thumbsUp: 8, thumbsDown: 2 }, // 80% up
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested.medium).toBe(defaultThresholds.medium);
  });

  it("reports medium tier high dissatisfaction", () => {
    const feedback: TierFeedback[] = [
      { tier: "medium", total: 10, thumbsUp: 5, thumbsDown: 5 }, // 50% down
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.insights[0]).toContain("thumbs-down rate");
    expect(result.insights[0]).toContain("medium tier");
  });

  it("reports medium tier balanced when satisfaction is ok", () => {
    const feedback: TierFeedback[] = [
      { tier: "medium", total: 10, thumbsUp: 8, thumbsDown: 2 },
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.insights[0]).toContain("balanced");
  });

  it("handles all three tiers simultaneously", () => {
    const feedback: TierFeedback[] = [
      { tier: "simple", total: 10, thumbsUp: 5, thumbsDown: 5 },
      { tier: "medium", total: 10, thumbsUp: 8, thumbsDown: 2 },
      { tier: "complex", total: 10, thumbsUp: 10, thumbsDown: 0 },
    ];
    const result = analyzeThresholds(feedback, defaultThresholds);
    expect(result.suggested.simple).toBeLessThan(defaultThresholds.simple);
    expect(result.suggested.medium).toBeGreaterThan(defaultThresholds.medium);
    expect(result.insights.length).toBe(3);
  });

  it("uses default thresholds when none provided", () => {
    const feedback: TierFeedback[] = [];
    const result = analyzeThresholds(feedback);
    expect(result.current).toEqual({ simple: 0.3, medium: 0.7 });
  });

  it("clamps simple threshold to minimum 0.1", () => {
    const feedback: TierFeedback[] = [
      { tier: "simple", total: 100, thumbsUp: 0, thumbsDown: 100 },
    ];
    const result = analyzeThresholds(feedback, { simple: 0.12, medium: 0.7 });
    expect(result.suggested.simple).toBeGreaterThanOrEqual(0.1);
  });

  it("clamps medium threshold to maximum 0.9", () => {
    const feedback: TierFeedback[] = [
      { tier: "complex", total: 100, thumbsUp: 100, thumbsDown: 0 },
    ];
    const result = analyzeThresholds(feedback, { simple: 0.3, medium: 0.89 });
    expect(result.suggested.medium).toBeLessThanOrEqual(0.9);
  });
});
