import { desc, sql, eq, and, gte, lte } from "drizzle-orm";
import { getDb } from "./client";
import { queries, dailyStats } from "./schema";

export interface LogQueryParams {
  input: string;
  output: string;
  modelUsed: string;
  tier: "simple" | "medium" | "complex";
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latencyMs: number;
  strategyUsed: string;
  confidence: number;
  reason: string;
}

export function logQuery(params: LogQueryParams) {
  const db = getDb();
  return db.insert(queries).values({
    input: params.input,
    output: params.output,
    modelUsed: params.modelUsed,
    tier: params.tier,
    tokensIn: params.tokensIn,
    tokensOut: params.tokensOut,
    cost: params.cost,
    latencyMs: params.latencyMs,
    strategyUsed: params.strategyUsed,
    confidence: params.confidence,
    reason: params.reason,
    createdAt: new Date().toISOString(),
  }).run();
}

export function getRecentQueries(limit: number = 50) {
  const db = getDb();
  return db.select().from(queries).orderBy(desc(queries.createdAt)).limit(limit).all();
}

export function getQueryStats(startDate?: string, endDate?: string) {
  const db = getDb();
  const conditions = [];
  if (startDate) conditions.push(gte(queries.createdAt, startDate));
  if (endDate) conditions.push(lte(queries.createdAt, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const result = db
    .select({
      totalQueries: sql<number>`count(*)`,
      routedSimple: sql<number>`sum(case when ${queries.tier} = 'simple' then 1 else 0 end)`,
      routedMedium: sql<number>`sum(case when ${queries.tier} = 'medium' then 1 else 0 end)`,
      routedComplex: sql<number>`sum(case when ${queries.tier} = 'complex' then 1 else 0 end)`,
      totalCost: sql<number>`sum(${queries.cost})`,
      totalTokensIn: sql<number>`sum(${queries.tokensIn})`,
      totalTokensOut: sql<number>`sum(${queries.tokensOut})`,
      avgLatency: sql<number>`avg(${queries.latencyMs})`,
    })
    .from(queries)
    .where(where)
    .get();

  return result;
}

export function getDailyBreakdown(startDate?: string, endDate?: string) {
  const db = getDb();
  const conditions = [];
  if (startDate) conditions.push(gte(queries.createdAt, startDate));
  if (endDate) conditions.push(lte(queries.createdAt, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      date: sql<string>`date(${queries.createdAt})`,
      totalQueries: sql<number>`count(*)`,
      routedSimple: sql<number>`sum(case when ${queries.tier} = 'simple' then 1 else 0 end)`,
      routedMedium: sql<number>`sum(case when ${queries.tier} = 'medium' then 1 else 0 end)`,
      routedComplex: sql<number>`sum(case when ${queries.tier} = 'complex' then 1 else 0 end)`,
      totalCost: sql<number>`sum(${queries.cost})`,
      avgLatency: sql<number>`avg(${queries.latencyMs})`,
    })
    .from(queries)
    .where(where)
    .groupBy(sql`date(${queries.createdAt})`)
    .orderBy(sql`date(${queries.createdAt})`)
    .all();
}

export function getModelBreakdown(startDate?: string, endDate?: string) {
  const db = getDb();
  const conditions = [];
  if (startDate) conditions.push(gte(queries.createdAt, startDate));
  if (endDate) conditions.push(lte(queries.createdAt, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      model: queries.modelUsed,
      count: sql<number>`count(*)`,
      totalCost: sql<number>`sum(${queries.cost})`,
      avgLatency: sql<number>`avg(${queries.latencyMs})`,
    })
    .from(queries)
    .where(where)
    .groupBy(queries.modelUsed)
    .all();
}
