"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { AdequacyFlow } from "@/components/AdequacyFlow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EvidenceList } from "@/components/EvidenceList";
import { cn } from "@/lib/cn";
import {
  LIVE_ADEQUACY,
  LIVE_DIAGNOSTIC,
  LIVE_GAP,
  LIVE_INPUT,
} from "./live-example-data";
import { useFadeIn } from "./useFadeIn";

export function LiveExampleSection() {
  const { ref, className } = useFadeIn<HTMLElement>();
  return (
    <section
      ref={ref}
      className={cn(
        "mx-auto max-w-[1200px] px-6 py-24 transition-all duration-500 ease-out md:py-32 md:px-10",
        className,
      )}
    >
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="text-[28px] font-medium leading-tight text-[#1A1A1A] md:text-[36px]">
          See it on a real idea.
        </h2>
        <p className="mt-3 text-[16px] text-[#666] md:text-[18px]">
          Here&apos;s what the analysis looks like when you put in an actual
          B2B / B2C niche.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-[30%_1fr] md:gap-10">
        {/* Input card */}
        <div className="md:sticky md:top-8 md:self-start">
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5">
            <div className="font-mono text-[12px] uppercase tracking-wider text-[#888]">
              Input
            </div>
            <p className="mt-3 text-[15px] leading-[1.55] text-[#1A1A1A]">
              {LIVE_INPUT}
            </p>
            <p className="mt-4 border-t border-[#EEE] pt-3 text-[13px] text-[#888]">
              Analyzed in 68s · $0.28 in API calls
            </p>
          </div>
        </div>

        {/* Output stack */}
        <div className="min-w-0 space-y-5">
          <StaticAdequacyBar />
          <AdequacySection />
          <DemandDiagnosticCard />
          <GapCard />
          <p className="text-[14px] text-[#888]">
            This is a real run from our pipeline, cached for display. Every
            step is visible in the reasoning log. Try your own idea above ↑
          </p>
        </div>
      </div>
    </section>
  );
}

/** Static (non-sticky) visual replica of AdequacyBar — medium tone. */
function StaticAdequacyBar() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900">
      <AlertTriangle size={14} className="shrink-0" />
      <span className="flex-1 truncate">
        Based on 2 subreddits · 3 quotes · Medium platform fit
      </span>
    </div>
  );
}

function AdequacySection() {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-[#1A1A1A]">
          Platform adequacy
        </h3>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">
          medium
        </span>
      </div>
      <div className="mt-4">
        <AdequacyFlow adequacy={LIVE_ADEQUACY} />
      </div>
    </Card>
  );
}

function DemandDiagnosticCard() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="ok">
          {LIVE_DIAGNOSTIC.demand_level.toUpperCase()} demand
        </Badge>
        <Badge tone="ok">
          {LIVE_DIAGNOSTIC.demand_type.toUpperCase()}
        </Badge>
        <Badge tone="warn">MEDIUM fit</Badge>
        <span className="ml-auto font-mono text-xs text-muted">
          1 gap · 3 quotes · confidence {LIVE_DIAGNOSTIC.confidence}
        </span>
      </div>
      <p className="mt-4 border-b border-[#e5e5e5] pb-5 text-[20px] font-medium leading-[1.6] text-[#1a1a1a]">
        {LIVE_DIAGNOSTIC.summary}
      </p>
    </div>
  );
}

function GapCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm font-medium text-fg">
          {LIVE_GAP.description}
        </p>
        <Badge tone="info">{LIVE_GAP.verdict}</Badge>
      </div>
      {LIVE_GAP.critic_notes && (
        <p className="mt-2 text-xs italic text-muted">
          Critic: {LIVE_GAP.critic_notes}
        </p>
      )}
      <button
        type="button"
        className="mt-3 text-xs text-muted hover:text-fg"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? "hide evidence ↑"
          : `show ${LIVE_GAP.evidence.length} evidence ↓`}
      </button>
      {open && (
        <div className="mt-3">
          <EvidenceList items={LIVE_GAP.evidence} />
        </div>
      )}
    </Card>
  );
}
