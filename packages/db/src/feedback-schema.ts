import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { queries } from "./schema";

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  queryId: integer("query_id")
    .notNull()
    .references(() => queries.id),
  rating: text("rating", { enum: ["up", "down"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
