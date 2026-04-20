"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import type { PlatformAdequacy } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  adequacy: PlatformAdequacy;
}

export function AdequacyFlow({ adequacy }: Props) {
  if (adequacy.level === "high") return <HighFlow adequacy={adequacy} />;
  return <MediumLowFlow adequacy={adequacy} />;
}

function HighFlow({ adequacy }: Props) {
  return (
    <div className="space-y-4">
      {adequacy.headline_summary && (
        <p className="text-sm leading-relaxed text-fg">
          {adequacy.headline_summary}
        </p>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <Box label="Target audience" body={adequacy.target_audience} />
        <Connector direction="horizontal" label="primary" tone="ok" />
        <Box
          label="Reddit captures"
          body={adequacy.reddit_fit_rationale}
          tone="ok"
        />
      </div>
    </div>
  );
}

function MediumLowFlow({ adequacy }: Props) {
  const isLow = adequacy.level === "low";
  const tone: Tone = isLow ? "err" : "warn";
  return (
    <div className="space-y-3">
      {adequacy.headline_summary && (
        <p className="text-sm leading-relaxed text-fg">
          {adequacy.headline_summary}
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        {/* Row 1: Target → Where */}
        <Box label="Target audience" body={adequacy.target_audience} />
        <Connector direction="horizontal" label="primary" tone={tone} />
        <Box
          label="Where they primarily live"
          body={
            adequacy.where_audience_actually_is.length
              ? adequacy.where_audience_actually_is.join(" · ")
              : "—"
          }
        />

        {/* Row 2: vertical arrows with labels */}
        <Connector direction="vertical" label="partial overlap" tone={tone} />
        <div />
        <Connector
          direction="vertical"
          label="missing from this scan"
          tone="muted"
        />

        {/* Row 3: Reddit captured | _ | Alternatives */}
        <Box
          label="What Reddit captured"
          body={adequacy.reddit_fit_rationale}
          tone={tone}
        />
        <div />
        <Box
          label="Alternative sources to check"
          body={
            adequacy.recommended_alternative_sources.length
              ? adequacy.recommended_alternative_sources.join(" · ")
              : "—"
          }
          muted
        />
      </div>
    </div>
  );
}

type Tone = "ok" | "warn" | "err" | "muted";

const boxTone: Record<Tone, string> = {
  ok: "border-green-200 bg-green-50 text-green-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  err: "border-red-200 bg-red-50 text-red-900",
  muted: "border-border bg-panel text-muted",
};

function Box({
  label,
  body,
  tone,
  muted,
}: {
  label: string;
  body: string;
  tone?: Tone;
  muted?: boolean;
}) {
  const cls = tone
    ? boxTone[tone]
    : muted
      ? "border-border bg-panel text-muted"
      : "border-border bg-panel text-fg";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed">{body}</p>
    </div>
  );
}

const connectorTextTone: Record<Tone, string> = {
  ok: "text-green-700",
  warn: "text-amber-700",
  err: "text-red-700",
  muted: "text-muted",
};

function Connector({
  direction,
  label,
  tone,
}: {
  direction: "horizontal" | "vertical";
  label: string;
  tone: Tone;
}) {
  const color = connectorTextTone[tone];
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1",
        direction === "horizontal"
          ? "flex-col px-2"
          : "flex-col py-1",
        color,
      )}
    >
      {direction === "horizontal" ? (
        <ArrowRight size={16} strokeWidth={2} />
      ) : (
        <ArrowDown size={16} strokeWidth={2} />
      )}
      <span className="whitespace-nowrap font-mono text-[10px]">{label}</span>
    </div>
  );
}
