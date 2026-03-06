import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import * as feedbackSchema from "./feedback-schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(dbPath?: string) {
  if (db) return db;

  const path = dbPath || process.env.DATABASE_URL?.replace("file:", "") || "./data/router.db";

  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");

  db = drizzle(sqlite, { schema: { ...schema, ...feedbackSchema } });

  // Auto-create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input TEXT NOT NULL,
      output TEXT NOT NULL DEFAULT '',
      model_used TEXT NOT NULL,
      tier TEXT NOT NULL CHECK(tier IN ('simple', 'medium', 'complex')),
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      strategy_used TEXT NOT NULL DEFAULT 'heuristic',
      confidence REAL NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_id INTEGER NOT NULL REFERENCES queries(id),
      rating TEXT NOT NULL CHECK(rating IN ('up', 'down')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_queries INTEGER NOT NULL DEFAULT 0,
      routed_simple INTEGER NOT NULL DEFAULT 0,
      routed_medium INTEGER NOT NULL DEFAULT 0,
      routed_complex INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      estimated_savings REAL NOT NULL DEFAULT 0
    );
  `);

  return db;
}
