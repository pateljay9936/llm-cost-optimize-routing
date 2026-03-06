"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@llm-router/ui";

interface TierData {
  tier: string;
  total: number;
  thumbsUp: number;
  thumbsDown: number;
}

interface TrendData {
  date: string;
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  satisfactionRate: number;
}

const TIER_COLORS: Record<string, string> = {
  simple: "#22c55e",
  medium: "#eab308",
  complex: "#3b82f6",
};

const TIER_LABELS: Record<string, string> = {
  simple: "Simple",
  medium: "Medium",
  complex: "Complex",
};

export function SatisfactionByTierChart({ perTier }: { perTier: TierData[] }) {
  const data = perTier.map((t) => ({
    tier: TIER_LABELS[t.tier] || t.tier,
    satisfaction: t.total > 0 ? (t.thumbsUp / t.total) * 100 : 0,
    fill: TIER_COLORS[t.tier] || "#8884d8",
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Satisfaction by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No feedback data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Satisfaction by Tier</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="tier" stroke="#888" fontSize={12} />
            <YAxis
              stroke="#888"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Satisfaction"]}
            />
            <Bar dataKey="satisfaction" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MisrouteTrendChart({ trend }: { trend: TrendData[] }) {
  if (trend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Misroute Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No feedback data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = trend.map((t) => ({
    date: t.date,
    misrouteRate: t.total > 0 ? ((t.thumbsDown / t.total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Misroute Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#888" fontSize={12} />
            <YAxis
              stroke="#888"
              fontSize={12}
              domain={[0, "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Misroute Rate"]}
            />
            <Line
              type="monotone"
              dataKey="misrouteRate"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
