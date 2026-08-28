"use client";

import { useEffect, useState } from "react";
import { getScenario, getScenarios, type Scenario, type ScenarioDetail } from "@/lib/api";

const difficultyColor: Record<string, string> = {
  easy: "bg-sage",
  medium: "bg-accent",
  hard: "bg-rust",
};

type ScenarioRailProps = {
  onSelectScenario: (scenario: ScenarioDetail) => void;
  disabled?: boolean;
};

export default function ScenarioRail({ onSelectScenario, disabled = false }: ScenarioRailProps) {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    getScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  async function handleClick(id: string) {
    if (disabled) return;
    setLoadingId(id);
    try {
      const detail = await getScenario(id);
      setActiveId(id);
      onSelectScenario(detail);
    } catch {
      // leave selection unchanged if the scenario failed to load
    } finally {
      setLoadingId(null);
    }
  }

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
          <button
            key={s.id}
            onClick={() => handleClick(s.id)}
            disabled={loadingId !== null || disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-70 transition-colors ${
              activeId === s.id
                ? "border-accent-deep bg-accent-soft"
                : "border-border bg-surface hover:bg-surface-alt"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                difficultyColor[s.difficulty] ?? "bg-accent"
              }`}
            />
            <span className="text-xs font-semibold whitespace-nowrap">
              {loadingId === s.id ? "Loading…" : s.name}
            </span>
          </button>
        ))}
      </div>

      <span className="text-[11px] text-faint shrink-0 ml-auto pl-4 hidden lg:inline">
        Loads customer + opening message
      </span>
    </div>
  );
}
