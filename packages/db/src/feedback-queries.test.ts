import { describe, it, expect, beforeEach } from "vitest";
import { getDb, resetDb } from "./client";
import { logFeedback, getFeedbackStats, getMisroutesByTier, getFeedbackTrend } from "./feedback-queries";
import { logQuery } from "./queries";

function insertTestQuery(tier: "simple" | "medium" | "complex", model: string = "test-model") {
  return logQuery({
    input: `test query for ${tier}`,
    output: "test response",
    modelUsed: model,
    tier,
    tokensIn: 10,
    tokensOut: 20,
    cost: 0.001,
    latencyMs: 100,
    strategyUsed: "heuristic",
    confidence: 0.9,
    reason: "test",
  });
}

describe("feedback queries", () => {
  beforeEach(() => {
    resetDb();
    getDb(":memory:");
  });

  describe("logFeedback", () => {
    it("inserts a feedback record", () => {
      const qResult = insertTestQuery("simple");
      const queryId = Number(qResult.lastInsertRowid);
      const result = logFeedback(queryId, "up");
      expect(result.changes).toBe(1);
    });

    it("allows thumbs down rating", () => {
      const qResult = insertTestQuery("simple");
      const queryId = Number(qResult.lastInsertRowid);
      const result = logFeedback(queryId, "down");
      expect(result.changes).toBe(1);
    });
  });

  describe("getFeedbackStats", () => {
    it("returns zero stats when no feedback exists", () => {
      const stats = getFeedbackStats();
      expect(stats.total).toBe(0);
      expect(stats.thumbsUp).toBe(0);
      expect(stats.thumbsDown).toBe(0);
      expect(stats.satisfactionRate).toBe(0);
    });

    it("calculates satisfaction rate correctly", () => {
      const q1 = Number(insertTestQuery("simple").lastInsertRowid);
      const q2 = Number(insertTestQuery("medium").lastInsertRowid);
      const q3 = Number(insertTestQuery("complex").lastInsertRowid);

      logFeedback(q1, "up");
      logFeedback(q2, "up");
      logFeedback(q3, "down");

      const stats = getFeedbackStats();
      expect(stats.total).toBe(3);
      expect(stats.thumbsUp).toBe(2);
      expect(stats.thumbsDown).toBe(1);
      expect(stats.satisfactionRate).toBeCloseTo(66.67, 0);
    });

    it("returns per-tier breakdown", () => {
      const q1 = Number(insertTestQuery("simple").lastInsertRowid);
      const q2 = Number(insertTestQuery("complex").lastInsertRowid);

      logFeedback(q1, "up");
      logFeedback(q2, "down");

      const stats = getFeedbackStats();
      expect(stats.perTier.length).toBe(2);
      const simpleTier = stats.perTier.find((t) => t.tier === "simple");
      expect(simpleTier?.thumbsUp).toBe(1);
      const complexTier = stats.perTier.find((t) => t.tier === "complex");
      expect(complexTier?.thumbsDown).toBe(1);
    });
  });

  describe("getMisroutesByTier", () => {
    it("returns empty array when no thumbs down", () => {
      const q1 = Number(insertTestQuery("simple").lastInsertRowid);
      logFeedback(q1, "up");
      const result = getMisroutesByTier();
      expect(result).toHaveLength(0);
    });

    it("groups thumbs-down by tier", () => {
      const q1 = Number(insertTestQuery("simple").lastInsertRowid);
      const q2 = Number(insertTestQuery("simple").lastInsertRowid);
      const q3 = Number(insertTestQuery("complex").lastInsertRowid);

      logFeedback(q1, "down");
      logFeedback(q2, "down");
      logFeedback(q3, "down");

      const result = getMisroutesByTier();
      expect(result.length).toBe(2);
      const simpleMisroutes = result.find((r) => r.tier === "simple");
      expect(simpleMisroutes?.count).toBe(2);
    });
  });

  describe("getFeedbackTrend", () => {
    it("returns daily aggregation", () => {
      const q1 = Number(insertTestQuery("simple").lastInsertRowid);
      const q2 = Number(insertTestQuery("medium").lastInsertRowid);

      logFeedback(q1, "up");
      logFeedback(q2, "down");

      const trend = getFeedbackTrend();
      expect(trend.length).toBeGreaterThanOrEqual(1);
      expect(trend[0].total).toBe(2);
      expect(trend[0].thumbsUp).toBe(1);
      expect(trend[0].thumbsDown).toBe(1);
    });
  });
});
