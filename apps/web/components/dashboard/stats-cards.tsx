"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@llm-router/ui";

interface StatsCardsProps {
  summary: {
    totalQueries: number;
    totalCost: number;
    saved: number;
    savingsPercent: number;
    avgLatency: number;
    routedSimple: number;
    routedMedium: number;
    routedComplex: number;
  };
}

export function StatsCards({ summary }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Queries",
      value: summary.totalQueries.toString(),
      description: `${summary.routedSimple} simple / ${summary.routedMedium} medium / ${summary.routedComplex} complex`,
    },
    {
      title: "Total Cost",
      value: `$${summary.totalCost.toFixed(4)}`,
      description: `vs $${(summary.totalCost + summary.saved).toFixed(4)} without routing`,
    },
    {
      title: "Cost Savings",
      value: `${summary.savingsPercent.toFixed(1)}%`,
      description: `$${summary.saved.toFixed(4)} saved`,
    },
    {
      title: "Avg Latency",
      value: `${Math.round(summary.avgLatency)}ms`,
      description: "Average response time",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
