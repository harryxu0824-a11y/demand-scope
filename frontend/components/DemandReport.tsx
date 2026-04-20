"use client";

import { useState } from "react";
import type {
  DemandLevel,
  DemandReport as DemandReportT,
  DemandType,
  Gap,
  PlatformAdequacy,
  Reframe,
  Verdict,
} from "@/lib/types";
import { AdequacyFlow } from "./AdequacyFlow";
import { Badge } from "./ui/Badge";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { EvidenceList } from "./EvidenceList";
import { ZeroSignalCard } from "./ZeroSignalCard";
import { cn } from "@/lib/cn";

interface Props {
  report: DemandReportT;
  reframe: Reframe;
  adequacy: PlatformAdequacy;
  onStartOver: () => void;
  onRefineReframe: () => void;
  onViewRawSearch: () => void;
}

const demandLevelTone: Record<DemandLevel, "ok" | "warn" | "err" | "neutral"> = {
  peak: "ok",
  moderate: "warn",
  low: "err",
};

const demandTypeTone: Record<DemandType, "ok" | "warn" | "err" | "neutral"> = {
  "unmet-supply": "ok",
  unknown: "warn",
  satisfied: "neutral",
};

const verdictTone: Record<
  Verdict,
  "ok" | "info" | "warn" | "err" | "neutral"
> = {
  strong: "ok",
  structural: "info",
  weak: "warn",
  flagged: "err",
  anecdotal: "neutral",
};

const adequacyTone: Record<PlatformAdequacy["level"], "ok" | "warn" | "err"> = {
  high: "ok",
  medium: "warn",
  low: "err",
};

export function DemandReport({
  report,
  reframe,
  adequacy,
  onStartOver,
  onRefineReframe,
  onViewRawSearch,
}: Props) {
  const evidenceCount = report.gaps.reduce((n, g) => n + g.evidence.length, 0);
  const hasEmpty = !!report.empty_reason;

  return (
    <div className="space-y-6">
      {report.low_adequacy_override && (
        <Card className="border-warn/50 bg-amber-50">
          <CardTitle className="text-amber-900">
            You chose to continue despite low Reddit fit
          </CardTitle>
          <CardDescription className="text-amber-900/80">
            Findings below are directional, not conclusive.
          </CardDescription>
        </Card>
      )}

      {!hasEmpty && (
        <SummaryHero
          report={report}
          adequacy={adequacy}
          evidenceCount={evidenceCount}
        />
      )}

      {hasEmpty && (
        <p className="rounded-md border border-border bg-panel px-4 py-3 text-xs leading-relaxed text-muted">
          Adequacy analysis doesn&apos;t depend on Reddit quotes — it&apos;s a
          prior estimate based on who your audience is and where they live.
          Even when Reddit returns nothing, this analysis stays valid.
        </p>
      )}

      <AdequacySection adequacy={adequacy} />

      {hasEmpty ? (
        <ZeroSignalCard
          reason={report.empty_reason!}
          details={report.empty_reason_details}
          adequacy={adequacy}
          reframe={reframe}
          onRefineReframe={onRefineReframe}
          onViewRawSearch={onViewRawSearch}
        />
      ) : (
        <>
          <DemandSection report={report} evidenceCount={evidenceCount} />
          <GapsSection report={report} />
        </>
      )}

      <button
        onClick={onStartOver}
        className="text-xs text-muted hover:text-fg"
      >
        ← start over
      </button>
    </div>
  );
}

function SummaryHero({
  report,
  adequacy,
  evidenceCount,
}: {
  report: DemandReportT;
  adequacy: PlatformAdequacy;
  evidenceCount: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={demandLevelTone[report.demand_level]}>
          {report.demand_level.toUpperCase()} demand
        </Badge>
        <Badge tone={demandTypeTone[report.demand_type]}>
          {report.demand_type.toUpperCase()}
        </Badge>
        <Badge tone={adequacyTone[adequacy.level]}>
          {adequacy.level.toUpperCase()} fit
        </Badge>
        <span className="ml-auto font-mono text-xs text-muted">
          {report.gaps.length} gaps · {evidenceCount} quotes
          {report.confidence && <> · confidence {report.confidence}</>}
        </span>
      </div>
      {/* Lede: this sentence IS the one-line verdict. Elevated visual weight
          + divider mark it as the primary read for the report. */}
      <p className="mt-4 border-b border-[#e5e5e5] pb-5 text-[20px] font-medium leading-[1.6] text-[#1a1a1a]">
        {report.demand_level_rationale}
      </p>
    </div>
  );
}

function AdequacySection({ adequacy }: { adequacy: PlatformAdequacy }) {
  const isLow = adequacy.level === "low";
  return (
    <Card
      className={cn(
        isLow && "border-red-200 bg-red-50",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <CardTitle className={cn(isLow && "text-red-900")}>
          Platform adequacy
        </CardTitle>
        <span
          className={cn(
            "font-mono text-xs uppercase tracking-wide",
            isLow ? "text-red-900" : "text-muted",
          )}
        >
          {adequacy.level}
        </span>
      </div>
      <div className="mt-4">
        <AdequacyFlow adequacy={adequacy} />
      </div>
    </Card>
  );
}

function DemandSection({
  report,
  evidenceCount,
}: {
  report: DemandReportT;
  evidenceCount: number;
}) {
  return (
    <Card>
      <CardTitle>Demand diagnostic</CardTitle>
      <CardDescription>
        Based on {evidenceCount} validated Reddit quotes.
      </CardDescription>
      <div className="mt-5 space-y-4">
        <Row
          label="Demand level"
          badge={
            <Badge tone={demandLevelTone[report.demand_level]}>
              {report.demand_level.toUpperCase()}
            </Badge>
          }
          body={report.demand_level_rationale}
        />
        <Row
          label="Demand type"
          badge={
            <Badge tone={demandTypeTone[report.demand_type]}>
              {report.demand_type.toUpperCase()}
            </Badge>
          }
          body={report.demand_type_rationale}
        />
        {report.confidence && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>confidence:</span>
            <Badge tone="neutral">{report.confidence}</Badge>
          </div>
        )}
      </div>
    </Card>
  );
}

function GapsSection({ report }: { report: DemandReportT }) {
  if (report.gaps.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-fg">
        Gaps ({report.gaps.length})
      </h2>
      {report.gaps.map((gap, i) => (
        <GapCard key={i} gap={gap} />
      ))}
    </div>
  );
}

function Row({
  label,
  badge,
  body,
}: {
  label: string;
  badge: React.ReactNode;
  body: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        {badge}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-fg">{body}</p>
    </div>
  );
}

function GapCard({ gap }: { gap: Gap }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={cn("p-4")}>
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm font-medium text-fg">{gap.description}</p>
        <Badge tone={verdictTone[gap.verdict]}>{gap.verdict}</Badge>
      </div>
      {gap.critic_notes && (
        <p className="mt-2 text-xs italic text-muted">Critic: {gap.critic_notes}</p>
      )}
      <button
        className="mt-3 text-xs text-muted hover:text-fg"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? "hide evidence ↑"
          : `show ${gap.evidence.length} evidence ↓`}
      </button>
      {open && (
        <div className="mt-3">
          <EvidenceList items={gap.evidence} />
        </div>
      )}
    </Card>
  );
}
