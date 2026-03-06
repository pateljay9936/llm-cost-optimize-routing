import { sql, gte, and, eq } from "drizzle-orm";
import { getDb } from "./client";
import { feedback } from "./feedback-schema";
import { queries } from "./schema";

export function logFeedback(queryId: number, rating: "up" | "down") {
  const db = getDb();
  return db
    .insert(feedback)
    .values({
      queryId,
      rating,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function getFeedbackStats(startDate?: string) {
  const db = getDb();
  const conditions = [];
  if (startDate) conditions.push(gte(feedback.createdAt, startDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Overall stats
  const overall = db
    .select({
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`sum(case when ${feedback.rating} = 'up' then 1 else 0 end)`,
      thumbsDown: sql<number>`sum(case when ${feedback.rating} = 'down' then 1 else 0 end)`,
    })
    .from(feedback)
    .where(where)
    .get();

  // Per-tier breakdown (join with queries table)
  const perTier = db
    .select({
      tier: queries.tier,
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`sum(case when ${feedback.rating} = 'up' then 1 else 0 end)`,
      thumbsDown: sql<number>`sum(case when ${feedback.rating} = 'down' then 1 else 0 end)`,
    })
    .from(feedback)
    .innerJoin(queries, eq(feedback.queryId, queries.id))
    .where(where)
    .groupBy(queries.tier)
    .all();

  const total = overall?.total ?? 0;
  const thumbsUp = overall?.thumbsUp ?? 0;

  return {
    total,
    thumbsUp: overall?.thumbsUp ?? 0,
    thumbsDown: overall?.thumbsDown ?? 0,
    satisfactionRate: total > 0 ? (thumbsUp / total) * 100 : 0,
    perTier,
  };
}

export function getMisroutesByTier(startDate?: string) {
  const db = getDb();
  const conditions = [eq(feedback.rating, "down")];
  if (startDate) conditions.push(gte(feedback.createdAt, startDate));

  return db
    .select({
      tier: queries.tier,
      count: sql<number>`count(*)`,
    })
    .from(feedback)
    .innerJoin(queries, eq(feedback.queryId, queries.id))
    .where(and(...conditions))
    .groupBy(queries.tier)
    .all();
}

export function getFeedbackTrend(startDate?: string) {
  const db = getDb();
  const conditions = [];
  if (startDate) conditions.push(gte(feedback.createdAt, startDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      date: sql<string>`date(${feedback.createdAt})`,
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`sum(case when ${feedback.rating} = 'up' then 1 else 0 end)`,
      thumbsDown: sql<number>`sum(case when ${feedback.rating} = 'down' then 1 else 0 end)`,
      satisfactionRate: sql<number>`cast(sum(case when ${feedback.rating} = 'up' then 1 else 0 end) as real) / count(*) * 100`,
    })
    .from(feedback)
    .where(where)
    .groupBy(sql`date(${feedback.createdAt})`)
    .orderBy(sql`date(${feedback.createdAt})`)
    .all();
}
