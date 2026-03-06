"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@llm-router/ui";

interface StrategyToggleProps {
  strategy: string;
  onStrategyChange: (strategy: string) => void;
}

export function StrategyToggle({ strategy, onStrategyChange }: StrategyToggleProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Router:</span>
      <Select value={strategy} onValueChange={onStrategyChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="heuristic">Heuristic</SelectItem>
          <SelectItem value="semantic">Semantic</SelectItem>
          <SelectItem value="routellm">RouteLLM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
