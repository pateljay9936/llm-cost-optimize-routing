"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@llm-router/ui";

interface EvalCardsProps {
  stats: {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    satisfactionRate: number;
  };
}

export function EvalCards({ stats }: EvalCardsProps) {
  const misrouteRate =
    stats.total > 0 ? ((stats.thumbsDown / stats.total) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      title: "Satisfaction Rate",
      value: `${stats.satisfactionRate.toFixed(1)}%`,
      description: `${stats.thumbsUp} thumbs up out of ${stats.total} ratings`,
    },
    {
      title: "Misroute Rate",
      value: `${misrouteRate}%`,
      description: `${stats.thumbsDown} thumbs down (potential misroutes)`,
    },
    {
      title: "Total Feedback",
      value: stats.total.toString(),
      description: `${stats.thumbsUp} positive / ${stats.thumbsDown} negative`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
