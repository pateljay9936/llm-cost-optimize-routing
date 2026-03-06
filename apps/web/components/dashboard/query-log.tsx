"use client";

import { Badge } from "@llm-router/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@llm-router/ui";

interface QueryLogEntry {
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
}

interface QueryLogProps {
  queries: QueryLogEntry[];
}

const tierColors: Record<string, "success" | "warning" | "info"> = {
  simple: "success",
  medium: "warning",
  complex: "info",
};

function formatModel(model: string): string {
  return (model || "")
    .replace("claude-", "")
    .replace(/-\d{8}$/, "")
    .replace("ollama/", "");
}

export function QueryLog({ queries }: QueryLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Query Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Query</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2 pr-4">Latency</th>
                <th className="pb-2 pr-4">Tokens</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {queries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
                    No queries logged yet
                  </td>
                </tr>
              ) : (
                queries.map((q) => (
                  <tr key={q.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 max-w-[200px] truncate">{q.input}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={tierColors[q.tier] || "secondary"}>{q.tier}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {formatModel(q.modelUsed)}
                    </td>
                    <td className="py-2 pr-4 font-mono">${q.cost.toFixed(6)}</td>
                    <td className="py-2 pr-4">{q.latencyMs}ms</td>
                    <td className="py-2 pr-4 text-xs">
                      {q.tokensIn}↑ {q.tokensOut}↓
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {q.createdAt.split("T")[1]?.slice(0, 5) ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
