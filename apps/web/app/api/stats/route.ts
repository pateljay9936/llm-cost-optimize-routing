import { NextRequest } from "next/server";
import { initDb } from "@/lib/db";
import {
  getQueryStats,
  getRecentQueries,
  getDailyBreakdown,
  getModelBreakdown,
} from "@llm-router/db";
import { estimateFullCost } from "@llm-router/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  initDb();

  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "7d";

  const now = new Date();
  let startDate: string | undefined;

  switch (range) {
    case "today":
      startDate = now.toISOString().split("T")[0];
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 86400000).toISOString();
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 86400000).toISOString();
      break;
    case "all":
      startDate = undefined;
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 86400000).toISOString();
  }

  const stats = getQueryStats(startDate);
  const recentQueries = getRecentQueries(100);
  const dailyBreakdown = getDailyBreakdown(startDate);
  const modelBreakdown = getModelBreakdown(startDate);

  // Calculate estimated savings
  const totalTokensIn = stats?.totalTokensIn ?? 0;
  const totalTokensOut = stats?.totalTokensOut ?? 0;
  const actualCost = stats?.totalCost ?? 0;
  const estimatedWithoutRouting = estimateFullCost(totalTokensIn, totalTokensOut);
  const saved = estimatedWithoutRouting - actualCost;
  const savingsPercent =
    estimatedWithoutRouting > 0
      ? (saved / estimatedWithoutRouting) * 100
      : 0;

  return Response.json({
    summary: {
      totalQueries: stats?.totalQueries ?? 0,
      routedSimple: stats?.routedSimple ?? 0,
      routedMedium: stats?.routedMedium ?? 0,
      routedComplex: stats?.routedComplex ?? 0,
      totalCost: actualCost,
      estimatedWithoutRouting,
      saved,
      savingsPercent,
      avgLatency: stats?.avgLatency ?? 0,
    },
    recentQueries,
    dailyBreakdown,
    modelBreakdown,
    range,
  });
}
