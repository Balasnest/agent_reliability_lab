"use client";

import { useEffect, useState } from "react";
import { getScenarios, type Scenario } from "@/lib/api";

const difficultyColor: Record<string, string> = {
  easy: "bg-sage",
  medium: "bg-accent",
  hard: "bg-rust",
};

export default function ScenarioRail() {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);

  useEffect(() => {
    getScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 sm:px-8 py-2.5 bg-surface border-b border-border overflow-x-auto">
      <span className="text-[11.5px] font-bold tracking-wide text-muted shrink-0">
        Try a scenario
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {scenarios === null && (
          <span className="text-xs text-faint">Loading…</span>
        )}
        {scenarios?.length === 0 && (
          <span className="text-xs text-faint">Couldn&apos;t load scenarios — is the API running?</span>
        )}
        {scenarios?.map((s) => (
          <div
            key={s.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-full bg-surface shrink-0"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                difficultyColor[s.difficulty] ?? "bg-accent"
              }`}
            />
            <span className="text-xs font-semibold whitespace-nowrap">
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <span className="text-[11px] text-faint shrink-0 ml-auto pl-4 hidden lg:inline">
        Loads customer + opening message
      </span>
    </div>
  );
}
