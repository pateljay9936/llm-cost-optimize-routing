import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const queries = sqliteTable("queries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  input: text("input").notNull(),
  output: text("output").notNull().default(""),
  modelUsed: text("model_used").notNull(),
  tier: text("tier", { enum: ["simple", "medium", "complex"] }).notNull(),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  cost: real("cost").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  strategyUsed: text("strategy_used").notNull().default("heuristic"),
  confidence: real("confidence").notNull().default(0),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const dailyStats = sqliteTable("daily_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  totalQueries: integer("total_queries").notNull().default(0),
  routedSimple: integer("routed_simple").notNull().default(0),
  routedMedium: integer("routed_medium").notNull().default(0),
  routedComplex: integer("routed_complex").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
  estimatedSavings: real("estimated_savings").notNull().default(0),
});
