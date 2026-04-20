"use client";

import { useEffect, useRef, useState } from "react";
import type { PipelinePhase } from "@/lib/types";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { MarketIcon, RedditIcon } from "./ui/Icons";

interface PhaseDef {
  id: PipelinePhase;
  label: string;
  expectedMs: number;
  weight: number; // must sum to 1 across all phases
}

// Expected durations calibrated from real pipeline runs.
// analyzer (~60s) + critic (~40s) dominate; others are <5s.
const PHASES: PhaseDef[] = [
  { id: "understanding_market", label: "Understanding your market", expectedMs: 5_000, weight: 0.05 },
  { id: "gathering_signal", label: "Gathering Reddit signal", expectedMs: 3_000, weight: 0.05 },
  { id: "analyzing_demand", label: "Analyzing demand patterns", expectedMs: 100_000, weight: 0.85 },
  { id: "verifying_evidence", label: "Verifying evidence", expectedMs: 1_000, weight: 0.05 },
];

export type PhaseStatus = "pending" | "running" | "done";

export interface PhaseState {
  id: PipelinePhase;
  status: PhaseStatus;
  startedAt?: number;     // ms epoch
  elapsedMs?: number;     // finalized on done
}

interface Props {
  phases: Record<PipelinePhase, PhaseState>;
}

function computePercent(phases: Record<PipelinePhase, PhaseState>, now: number): number {
  let pct = 0;
  for (const def of PHASES) {
    const st = phases[def.id];
    if (st.status === "done") {
      pct += def.weight;
    } else if (st.status === "running" && st.startedAt) {
      const elapsed = Math.max(0, now - st.startedAt);
      const frac = Math.min(0.95, elapsed / def.expectedMs); // cap at 0.95 so we never reach 100% mid-phase
      pct += def.weight * frac;
    }
  }
  return Math.min(99, Math.round(pct * 100));
}

function fmtSec(ms: number | undefined): string {
  if (ms === undefined) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunningPipeline({ phases }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const raf = useRef<number | null>(null);

  // Tick every 500ms so progress visibly advances during long phases.
  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      setNow(Date.now());
      raf.current = window.setTimeout(tick, 500) as unknown as number;
    };
    tick();
    return () => {
      stopped = true;
      if (raf.current) clearTimeout(raf.current);
    };
  }, []);

  const pct = computePercent(phases, now);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <RedditIcon size={18} />
          Running Reddit analysis…
        </CardTitle>
        <span className="font-mono text-sm text-muted">{pct}%</span>
      </div>
      <CardDescription>
        Four phases; the analyzing step does most of the work (~90s).
      </CardDescription>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2.5">
        {PHASES.map((def) => {
          const st = phases[def.id];
          const icon =
            st.status === "done" ? "✓" : st.status === "running" ? "⏳" : "○";
          const iconColor =
            st.status === "done"
              ? "text-ok"
              : st.status === "running"
                ? "text-accent"
                : "text-muted";

          let stepPct = 0;
          if (st.status === "done") {
            stepPct = 100;
          } else if (st.status === "running" && st.startedAt) {
            stepPct = Math.min(95, Math.round(((now - st.startedAt) / def.expectedMs) * 100));
          }

          const rolling =
            st.status === "running" && st.startedAt
              ? fmtSec(now - st.startedAt)
              : st.status === "done"
                ? fmtSec(st.elapsedMs)
                : "";
          return (
            <li key={def.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3">
                  <span className={`font-mono ${iconColor}`}>{icon}</span>
                  <span
                    className={
                      st.status === "pending"
                        ? "text-muted flex items-center gap-1.5"
                        : st.status === "running"
                          ? "text-fg font-medium flex items-center gap-1.5"
                          : "text-fg flex items-center gap-1.5"
                    }
                  >
                    {def.id === "understanding_market" && (
                      <MarketIcon className="text-muted" />
                    )}
                    {def.label}
                  </span>
                </span>
                <span className="flex items-center gap-3 font-mono text-xs text-muted">
                  {st.status !== "pending" && <span>{stepPct}%</span>}
                  <span>{rolling}</span>
                </span>
              </div>
              <div className="ml-7 mt-1 h-1 w-[calc(100%-1.75rem)] overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    st.status === "done" ? "bg-ok" : "bg-accent"
                  }`}
                  style={{ width: `${stepPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function makeInitialPhases(): Record<PipelinePhase, PhaseState> {
  return {
    understanding_market: { id: "understanding_market", status: "pending" },
    gathering_signal: { id: "gathering_signal", status: "pending" },
    analyzing_demand: { id: "analyzing_demand", status: "pending" },
    verifying_evidence: { id: "verifying_evidence", status: "pending" },
  };
}
