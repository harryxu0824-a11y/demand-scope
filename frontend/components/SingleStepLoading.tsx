"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardDescription, CardTitle } from "./ui/Card";

interface Props {
  title: string;            // e.g. "Understanding your description"
  stepLabel: string;        // e.g. "Stripping marketing language"
  model: string;            // e.g. "gemini-2.5-pro"
  expectedMs: number;       // used to animate the progress bar smoothly
}

/**
 * Single-step loading card that mirrors the RunningPipeline visual language
 * so short pipeline stages feel consistent with the long one. Shows the
 * user-facing title, a technical step label with model name, a live elapsed
 * counter, and a progress bar that caps at 95% until the actual response
 * arrives.
 */
export function SingleStepLoading({ title, stepLabel, model, expectedMs }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - startRef.current);
  const pct = Math.min(95, Math.round((elapsed / expectedMs) * 100));

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        <span className="font-mono text-sm text-muted">{pct}%</span>
      </div>
      <CardDescription>This usually takes a few seconds.</CardDescription>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-mono text-accent">⏳</span>
          <div>
            <div className="font-medium text-fg">{stepLabel}</div>
            <div className="font-mono text-xs text-muted">{model}</div>
          </div>
        </div>
        <span className="font-mono text-xs text-muted">
          {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>
    </Card>
  );
}
