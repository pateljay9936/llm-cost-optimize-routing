import { getDb } from "@llm-router/db";
import path from "path";
import fs from "fs";

export function initDb(): void {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  getDb(path.join(dataDir, "router.db"));
}
