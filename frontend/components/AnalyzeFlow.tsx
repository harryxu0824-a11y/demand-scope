"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadFilename, generateMarkdown } from "@/lib/export-markdown";
import { mockReport, readMockScenario } from "@/lib/mocks";
import { streamPost } from "@/lib/sse";
import type {
  DemandReport as DemandReportT,
  PipelinePhase,
  PlatformAdequacy,
  Reframe,
  StreamEvent,
  TraceStep,
} from "@/lib/types";
import { AdequacyBar } from "./AdequacyBar";
import { AdequacyCard } from "./AdequacyCard";
import { DemandReport } from "./DemandReport";
import { DescriptionInput } from "./DescriptionInput";
import { ReframeCard } from "./ReframeCard";
import {
  PhaseState,
  RunningPipeline,
  makeInitialPhases,
} from "./RunningPipeline";
import {
  LogEntry,
  ReasoningLog,
  ReasoningLogMobile,
} from "./ReasoningLog";
import { SingleStepLoading } from "./SingleStepLoading";
import { Card, CardDescription, CardTitle } from "./ui/Card";

type Stage =
  | { kind: "input" }
  | { kind: "reframing" }
  | { kind: "reframed"; reframe: Reframe }
  | { kind: "running_adequacy"; reframe: Reframe }
  | { kind: "adequacy_shown"; reframe: Reframe; adequacy: PlatformAdequacy }
  | {
      kind: "running_reddit";
      reframe: Reframe;
      adequacy: PlatformAdequacy;
      overrideLowAdequacy: boolean;
      phases: Record<PipelinePhase, PhaseState>;
    }
  | {
      kind: "report_shown";
      report: DemandReportT;
      reframe: Reframe;
      adequacy: PlatformAdequacy;
    };

const REFRAME_MODEL = "gemini-2.5-pro";
const ADEQUACY_MODEL = "gemini-2.5-pro";

function traceToChildren(trace: TraceStep[]): LogEntry[] {
  return trace.map((t, i) => ({
    id: `trace_${i}_${t.step}`,
    label: t.step,
    status: "done",
    durationMs: t.elapsed_ms,
    model: t.model ?? undefined,
    input: t.input_preview || undefined,
    output: t.output_preview || undefined,
  }));
}

export function AnalyzeFlow() {
  const [stage, setStage] = useState<Stage>({ kind: "input" });
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [openLogIds, setOpenLogIds] = useState<Set<string>>(new Set());
  const [mobileLogForceOpen, setMobileLogForceOpen] = useState(false);
  const [prefillDescription, setPrefillDescription] = useState<string>("");
  const anchorRef = useRef<number | null>(null);

  // Per-stage result cache. Going back then forward again with unchanged
  // inputs reuses the prior result instead of re-calling the API.
  const reframeCache = useRef<{ desc: string; reframe: Reframe } | null>(null);
  const adequacyCache = useRef<{
    key: string;
    adequacy: PlatformAdequacy;
  } | null>(null);
  const reportCache = useRef<{
    key: string;
    report: DemandReportT;
  } | null>(null);

  // Read ?description= from URL on mount (home page CTA → /analyze prefill).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const desc = new URLSearchParams(window.location.search).get("description");
    if (desc && desc.trim()) setPrefillDescription(desc.trim());
  }, []);

  function downloadReasoning() {
    const report = stage.kind === "report_shown" ? stage.report : null;
    const inputDescription =
      prefillDescription ||
      (log.find((e) => e.id.startsWith("reframe") || e.id === "mock_reframe")
        ?.input as string | undefined) ||
      "";
    const md = generateMarkdown({
      entries: log,
      report,
      inputDescription,
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename(inputDescription);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function viewRawSearch() {
    const reddit = log.find((e) => e.id.startsWith("reddit_analysis") || e.id.startsWith("mock_reddit_analysis"));
    const ids = new Set<string>();
    if (reddit) {
      ids.add(reddit.id);
      reddit.children?.forEach((c) => {
        if (c.label === "harvester" || c.label === "critic") ids.add(c.id);
      });
    }
    setOpenLogIds(ids);
    setMobileLogForceOpen(true);
  }

  // Dev: if URL has ?mock=<scenario> and it's not "normal", skip the whole
  // pipeline and jump straight to report_shown with a canned payload. Lets us
  // verify empty-state UI without hitting the real backend.
  useEffect(() => {
    const scenario = readMockScenario();
    if (!scenario || scenario === "normal") return;
    const report = mockReport(scenario);
    const now = Date.now();
    anchorRef.current = now - 55_000;
    setLog([
      {
        id: "mock_reframe",
        label: "Reframe description",
        status: "done",
        model: REFRAME_MODEL,
        startedAt: now - 55_000,
        endedAt: now - 53_200,
        output: report.reframe,
      },
      {
        id: "mock_adequacy",
        label: "Platform adequacy",
        status: "done",
        model: ADEQUACY_MODEL,
        startedAt: now - 52_500,
        endedAt: now - 46_100,
        output: report.adequacy,
      },
      {
        id: "mock_reddit_analysis",
        label: "Reddit analysis",
        status: "done",
        startedAt: now - 45_500,
        endedAt: now - 500,
        output:
          report.empty_reason ?? `${report.gaps.length} gaps`,
        children: report.trace.map((t, i) => ({
          id: `mock_trace_${i}_${t.step}`,
          label: t.step,
          status: "done",
          durationMs: t.elapsed_ms,
          model: t.model ?? undefined,
          input: t.input_preview || undefined,
          output: t.output_preview || undefined,
        })),
      },
    ]);
    setStage({
      kind: "report_shown",
      report,
      reframe: report.reframe,
      adequacy: report.adequacy,
    });
  }, []);

  function appendEntry(e: LogEntry) {
    if (anchorRef.current == null && e.startedAt != null) {
      anchorRef.current = e.startedAt;
    }
    setLog((prev) => [...prev, e]);
  }

  function updateEntry(id: string, patch: Partial<LogEntry>) {
    setLog((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function runReframe(desc: string) {
    setError(null);
    setPrefillDescription(desc); // keep draft so onBack from reframed restores it

    // Cache hit: unchanged desc → skip API.
    if (reframeCache.current?.desc === desc) {
      setStage({ kind: "reframed", reframe: reframeCache.current.reframe });
      return;
    }

    const startedAt = Date.now();
    const entryId = `reframe_${startedAt}`;
    appendEntry({
      id: entryId,
      label: "Reframe description",
      status: "running",
      startedAt,
      model: REFRAME_MODEL,
      input: desc,
    });
    setStage({ kind: "reframing" });
    try {
      const reframe = await apiPost<Reframe>("/api/reframe", {
        description: desc,
      });
      updateEntry(entryId, {
        status: "done",
        endedAt: Date.now(),
        output: reframe,
      });
      reframeCache.current = { desc, reframe };
      // New reframe invalidates downstream caches.
      adequacyCache.current = null;
      reportCache.current = null;
      setStage({ kind: "reframed", reframe });
    } catch (e) {
      const msg = String(e);
      updateEntry(entryId, {
        status: "failed",
        endedAt: Date.now(),
        error: msg,
      });
      setError(msg);
      setStage({ kind: "input" });
    }
  }

  async function confirmReframe(edited: Reframe) {
    setError(null);

    const key = JSON.stringify(edited);
    if (adequacyCache.current?.key === key) {
      setStage({
        kind: "adequacy_shown",
        reframe: edited,
        adequacy: adequacyCache.current.adequacy,
      });
      return;
    }

    const startedAt = Date.now();
    const entryId = `adequacy_${startedAt}`;
    appendEntry({
      id: entryId,
      label: "Platform adequacy",
      status: "running",
      startedAt,
      model: ADEQUACY_MODEL,
      input: edited,
    });
    setStage({ kind: "running_adequacy", reframe: edited });
    try {
      const adequacy = await apiPost<PlatformAdequacy>("/api/adequacy", {
        reframe: edited,
      });
      updateEntry(entryId, {
        status: "done",
        endedAt: Date.now(),
        output: adequacy,
      });
      adequacyCache.current = { key, adequacy };
      reportCache.current = null; // new adequacy invalidates report cache
      setStage({ kind: "adequacy_shown", reframe: edited, adequacy });
    } catch (e) {
      const msg = String(e);
      updateEntry(entryId, {
        status: "failed",
        endedAt: Date.now(),
        error: msg,
      });
      setError(msg);
      setStage({ kind: "reframed", reframe: edited });
    }
  }

  async function runReddit(
    reframe: Reframe,
    adequacy: PlatformAdequacy,
    overrideLowAdequacy: boolean,
  ) {
    setError(null);

    const reportKey = JSON.stringify({
      r: reframe,
      a: adequacy,
      o: overrideLowAdequacy,
    });
    if (reportCache.current?.key === reportKey) {
      setStage({
        kind: "report_shown",
        report: reportCache.current.report,
        reframe,
        adequacy,
      });
      return;
    }

    const startedAt = Date.now();
    const entryId = `reddit_analysis_${startedAt}`;
    appendEntry({
      id: entryId,
      label: "Reddit analysis",
      status: "running",
      startedAt,
      input: { reframe, adequacy, override_low_adequacy: overrideLowAdequacy },
    });
    setStage({
      kind: "running_reddit",
      reframe,
      adequacy,
      overrideLowAdequacy,
      phases: makeInitialPhases(),
    });

    try {
      await streamPost(
        "/api/run-reddit/stream",
        {
          reframe,
          adequacy,
          override_low_adequacy: overrideLowAdequacy,
        },
        (event: StreamEvent) => {
          if (event.type === "phase") {
            setStage((prev) => {
              if (prev.kind !== "running_reddit") return prev;
              const next = { ...prev.phases };
              const p = next[event.phase];
              if (!p) return prev;
              if (event.status === "start") {
                next[event.phase] = {
                  ...p,
                  status: "running",
                  startedAt: Date.now(),
                };
              } else {
                next[event.phase] = {
                  ...p,
                  status: "done",
                  elapsedMs: event.elapsed_ms,
                };
              }
              return { ...prev, phases: next };
            });
          } else if (event.type === "complete") {
            updateEntry(entryId, {
              status: "done",
              endedAt: Date.now(),
              output: `${event.report.gaps.length} gaps · ${event.report.gaps.reduce((n, g) => n + g.evidence.length, 0)} quotes`,
              children: traceToChildren(event.report.trace ?? []),
            });
            reportCache.current = { key: reportKey, report: event.report };
            setStage({
              kind: "report_shown",
              report: event.report,
              reframe,
              adequacy,
            });
          } else if (event.type === "error") {
            const msg = event.step
              ? `Pipeline failed at ${event.step}: ${event.message}`
              : event.message;
            updateEntry(entryId, {
              status: "failed",
              endedAt: Date.now(),
              error: msg,
            });
            setError(msg);
            setStage({ kind: "adequacy_shown", reframe, adequacy });
          }
        },
      );
    } catch (e) {
      const msg = String(e);
      updateEntry("reddit_analysis", {
        status: "failed",
        endedAt: Date.now(),
        error: msg,
      });
      setError(msg);
      setStage({ kind: "adequacy_shown", reframe, adequacy });
    }
  }

  const stageContent = (() => {
    if (stage.kind === "input") {
      return (
        <div className="space-y-4">
          <DescriptionInput
            // key forces remount when prefill arrives async from URL, so
            // the internal useState initializer re-runs with the new value.
            // This is the primary fix; the useEffect sync in DescriptionInput
            // is belt-and-suspenders.
            key={`desc-${prefillDescription || "empty"}`}
            onSubmit={runReframe}
            loading={false}
            initialValue={prefillDescription}
          />
          {error && <ErrorCard message={error} />}
        </div>
      );
    }

    if (stage.kind === "reframing") {
      return (
        <SingleStepLoading
          title="Understanding your description"
          stepLabel="Stripping marketing language"
          model={REFRAME_MODEL}
          expectedMs={10_000}
        />
      );
    }

    if (stage.kind === "reframed") {
      return (
        <div className="space-y-4">
          <ReframeCard
            initial={stage.reframe}
            onBack={() => setStage({ kind: "input" })}
            onConfirm={confirmReframe}
          />
          {error && <ErrorCard message={error} />}
        </div>
      );
    }

    if (stage.kind === "running_adequacy") {
      return (
        <SingleStepLoading
          title="Checking platform adequacy"
          stepLabel="Judging whether Reddit fits this audience"
          model={ADEQUACY_MODEL}
          expectedMs={15_000}
        />
      );
    }

    if (stage.kind === "adequacy_shown") {
      return (
        <div className="space-y-4">
          <AdequacyCard
            adequacy={stage.adequacy}
            onBack={() =>
              setStage({ kind: "reframed", reframe: stage.reframe })
            }
            onContinue={() =>
              runReddit(stage.reframe, stage.adequacy, false)
            }
            onRunAnyway={() => runReddit(stage.reframe, stage.adequacy, true)}
          />
          {error && <ErrorCard message={error} />}
        </div>
      );
    }

    if (stage.kind === "running_reddit") {
      return <RunningPipeline phases={stage.phases} />;
    }

    return (
      <DemandReport
        report={stage.report}
        reframe={stage.reframe}
        adequacy={stage.adequacy}
        onStartOver={() => setStage({ kind: "input" })}
        onRefineReframe={() =>
          setStage({ kind: "reframed", reframe: stage.reframe })
        }
        onViewRawSearch={viewRawSearch}
      />
    );
  })();

  const barData =
    stage.kind === "report_shown" &&
    stage.adequacy.level !== "high" &&
    !stage.report.empty_reason
      ? (() => {
          const gaps = stage.report.gaps;
          const quotes = gaps.reduce((n, g) => n + g.evidence.length, 0);
          const subs = new Set(
            gaps.flatMap((g) =>
              g.evidence
                .map(
                  (e) => e.permalink.match(/\/r\/([^/]+)/i)?.[1]?.toLowerCase(),
                )
                .filter((x): x is string => Boolean(x)),
            ),
          ).size;
          return { adequacy: stage.adequacy, subs, quotes };
        })()
      : null;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:sticky md:top-4 md:block md:max-h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto">
          <ReasoningLog
            entries={log}
            anchorTime={anchorRef.current}
            openIds={openLogIds}
            onDownload={downloadReasoning}
          />
        </aside>
        <div className="min-w-0 space-y-6 pb-16 md:pb-0">
          {barData && (
            <AdequacyBar
              adequacy={barData.adequacy}
              subredditCount={barData.subs}
              quoteCount={barData.quotes}
            />
          )}
          {stageContent}
        </div>
      </div>
      <ReasoningLogMobile
        entries={log}
        anchorTime={anchorRef.current}
        openIds={openLogIds}
        forceOpen={mobileLogForceOpen}
        onForceOpenHandled={() => setMobileLogForceOpen(false)}
        onDownload={downloadReasoning}
      />
    </>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-err/40">
      <CardTitle className="text-err">Something went wrong</CardTitle>
      <CardDescription>{message}</CardDescription>
    </Card>
  );
}
