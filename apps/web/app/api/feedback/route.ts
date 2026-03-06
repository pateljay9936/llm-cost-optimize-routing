import { NextRequest } from "next/server";
import { initDb } from "@/lib/db";
import {
  logFeedback,
  getFeedbackStats,
  getFeedbackTrend,
  getMisroutesByTier,
} from "@llm-router/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, rating } = body as { queryId: number; rating: string };

    if (!queryId || !["up", "down"].includes(rating)) {
      return Response.json(
        { error: "queryId (number) and rating ('up' | 'down') are required" },
        { status: 400 }
      );
    }

    initDb();
    logFeedback(queryId, rating as "up" | "down");

    return Response.json({ success: true });
  } catch (error) {
    console.error("[feedback] POST error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    initDb();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";

    let startDate: string | undefined;
    const now = new Date();
    if (range === "today") {
      startDate = now.toISOString().split("T")[0];
    } else if (range === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else if (range === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
    }

    const stats = getFeedbackStats(startDate);
    const trend = getFeedbackTrend(startDate);
    const misroutes = getMisroutesByTier(startDate);

    return Response.json({ stats, trend, misroutes });
  } catch (error) {
    console.error("[feedback] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
}
