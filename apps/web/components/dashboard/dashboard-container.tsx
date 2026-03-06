"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { StatsCards } from "./stats-cards";
import { QueryLog } from "./query-log";
import { Button } from "@llm-router/ui";

const RoutingChart = dynamic(() => import("./routing-chart").then((m) => m.RoutingChart), { ssr: false });
const LatencyChart = dynamic(() => import("./latency-chart").then((m) => m.LatencyChart), { ssr: false });

type TimeRange = "today" | "7d" | "30d" | "all";

interface DashboardData {
  summary: {
    totalQueries: number;
    routedSimple: number;
    routedMedium: number;
    routedComplex: number;
    totalCost: number;
    estimatedWithoutRouting: number;
    saved: number;
    savingsPercent: number;
    avgLatency: number;
  };
  recentQueries: Array<{
    id: number;
    input: string;
    modelUsed: string;
    tier: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    latencyMs: number;
    strategyUsed: string;
    createdAt: string;
  }>;
  dailyBreakdown: Array<{
    date: string;
    avgLatency: number;
    totalQueries: number;
    totalCost: number;
  }>;
  modelBreakdown: Array<{
    model: string;
    count: number;
    totalCost: number;
    avgLatency: number;
  }>;
}

const defaultSummary = {
  totalQueries: 0,
  routedSimple: 0,
  routedMedium: 0,
  routedComplex: 0,
  totalCost: 0,
  estimatedWithoutRouting: 0,
  saved: 0,
  savingsPercent: 0,
  avgLatency: 0,
};

export function DashboardContainer() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ranges: { label: string; value: TimeRange }[] = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "All", value: "all" },
  ];

  const summary = data?.summary ?? defaultSummary;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            LLM routing analytics and cost tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {ranges.map((r) => (
              <button
                key={r.value}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  range === r.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Refresh
          </Button>
          <a href="/">
            <Button variant="ghost" size="sm">
              Chat
            </Button>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          <StatsCards summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RoutingChart summary={summary} />
            <LatencyChart dailyBreakdown={data?.dailyBreakdown ?? []} />
          </div>

          <QueryLog queries={data?.recentQueries ?? []} />
        </>
      )}
    </div>
  );
}
