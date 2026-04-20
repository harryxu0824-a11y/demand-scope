"use client";

import { useEffect } from "react";
import type { PlatformAdequacy } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";

interface Props {
  adequacy: PlatformAdequacy;
  onContinue: () => void;
  onRunAnyway: () => void;
  onBack: () => void;
  nextLoading?: boolean;
}

const levelCopy: Record<
  PlatformAdequacy["level"],
  { tone: "ok" | "warn" | "err"; label: string; subtitle: string }
> = {
  high: {
    tone: "ok",
    label: "HIGH",
    subtitle: "Reddit is a reasonable place to find demand signals for this.",
  },
  medium: {
    tone: "warn",
    label: "MEDIUM",
    subtitle:
      "Part of the audience is on Reddit, but coverage is partial. Read results with that in mind.",
  },
  low: {
    tone: "err",
    label: "LOW",
    subtitle:
      "The target audience for this business may not be active on Reddit. Proceed with caution.",
  },
};

export function AdequacyCard({
  adequacy,
  onContinue,
  onRunAnyway,
  onBack,
  nextLoading = false,
}: Props) {
  const copy = levelCopy[adequacy.level];
  const isLow = adequacy.level === "low";

  useEffect(() => {
    if (nextLoading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      // Don't interfere if user focused a text input (shouldn't happen here
      // since the card is read-only, but defensive).
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      (isLow ? onRunAnyway : onContinue)();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isLow, onContinue, onRunAnyway, nextLoading]);

  return (
    <div className="space-y-4">
      <Card className={isLow ? "border-err/50" : undefined}>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Platform Adequacy</CardTitle>
          <Badge tone={copy.tone}>{copy.label}</Badge>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>

        {adequacy.headline_summary && (
          <p className="mt-4 text-sm leading-relaxed text-fg">
            {adequacy.headline_summary}
          </p>
        )}

        <dl className="mt-5 space-y-4 text-sm">
          <Row label="Target audience" value={adequacy.target_audience} />
          <Row
            label="Where audience actually is"
            value={
              adequacy.where_audience_actually_is.length
                ? adequacy.where_audience_actually_is.join(" · ")
                : "—"
            }
          />
          <Row label="Reddit fit rationale" value={adequacy.reddit_fit_rationale} />
          {adequacy.recommended_alternative_sources.length > 0 && (
            <Row
              label="Recommended alternative sources"
              value={adequacy.recommended_alternative_sources.join(" · ")}
            />
          )}
        </dl>
      </Card>

      {isLow && (
        <Card className="border-err/40">
          <CardTitle className="text-err">
            Why Reddit may be weak for this business
          </CardTitle>
          <CardDescription>
            Two independent hypotheses. We cannot distinguish between them from Reddit
            alone — that ambiguity is the honest answer.
          </CardDescription>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Hypothesis
              title="Hypothesis A — Wrong platform"
              body={
                adequacy.wrong_platform_hypothesis ??
                "The audience likely discusses this elsewhere."
              }
            />
            <Hypothesis
              title="Hypothesis B — No demand"
              body={
                adequacy.no_demand_hypothesis ??
                "The underlying pain may be weak or already satisfied."
              }
            />
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={nextLoading}>
          ← edit reframe
        </Button>
        {isLow ? (
          <Button variant="danger" onClick={onRunAnyway} disabled={nextLoading}>
            {nextLoading ? "Running…" : "Run Reddit analysis anyway"}
          </Button>
        ) : (
          <Button onClick={onContinue} disabled={nextLoading}>
            {nextLoading ? "Continuing…" : "Continue to Reddit analysis →"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-fg">{value}</dd>
    </div>
  );
}

function Hypothesis({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 p-4">
      <h4 className="text-sm font-medium text-fg">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
