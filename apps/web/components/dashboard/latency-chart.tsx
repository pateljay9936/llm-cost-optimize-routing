"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@llm-router/ui";

interface LatencyChartProps {
  dailyBreakdown: Array<{
    date: string;
    avgLatency: number;
    totalQueries: number;
    totalCost: number;
  }>;
}

export function LatencyChart({ dailyBreakdown }: LatencyChartProps) {
  if (dailyBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Latency Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Latency Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 12 }}
              label={{
                value: "ms",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(240 5% 64.9%)",
              }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240 10% 3.9%)",
                border: "1px solid hsl(240 3.7% 15.9%)",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="avgLatency"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              name="Avg Latency (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
