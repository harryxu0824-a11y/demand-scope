"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { RedditIcon } from "./ui/Icons";

export type LogStatus = "pending" | "running" | "done" | "failed";

export interface LogEntry {
  id: string;
  label: string;
  status: LogStatus;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  model?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  children?: LogEntry[];
}

interface Props {
  entries: LogEntry[];
  anchorTime: number | null;
  openIds?: Set<string>;
  onDownload?: () => void;
}

interface MobileProps extends Props {
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
}

const REDDIT_SUBPHASES = [
  "Searching subreddits…",
  "Harvesting quotes…",
  "Running analyzer…",
  "Running critic…",
  "Validating…",
];
const REDDIT_EXPECTED_MS = 45_000;

function useTick(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [enabled]);
}

export function ReasoningLog({
  entries,
  anchorTime,
  openIds,
  onDownload,
}: Props) {
  return (
    <LogPanel
      entries={entries}
      anchorTime={anchorTime}
      openIds={openIds}
      onDownload={onDownload}
    />
  );
}

export function ReasoningLogMobile({
  entries,
  anchorTime,
  openIds,
  forceOpen,
  onForceOpenHandled,
  onDownload,
}: MobileProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen, onForceOpenHandled]);
  const total = entries.length;
  const done = entries.filter(
    (e) => e.status === "done" || e.status === "failed",
  ).length;

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-border bg-panel px-4 pt-0 text-sm font-medium text-fg shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:hidden"
        style={{
          height: `calc(3rem + env(safe-area-inset-bottom))`,
          paddingBottom: `env(safe-area-inset-bottom)`,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted">◉</span>
          Reasoning log
        </span>
        <span className="flex items-center gap-3 font-mono text-xs text-muted">
          <span>
            {done}/{total}
          </span>
          <span>▲</span>
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg md:hidden">
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-bg px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span className="font-mono text-xs text-muted">◉</span>
              Reasoning log
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted hover:text-fg"
              aria-label="Close reasoning log"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <LogPanel
              entries={entries}
              anchorTime={anchorTime}
              openIds={openIds}
              onDownload={onDownload}
              embed
            />
          </div>
        </div>
      )}
    </>
  );
}

function LogPanel({
  entries,
  anchorTime,
  openIds,
  onDownload,
  embed = false,
}: Props & { embed?: boolean }) {
  const anyRunning = entries.some((e) => e.status === "running");
  useTick(anyRunning);

  const canDownload = Boolean(onDownload) && entries.length > 0;

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-panel",
        embed && "border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "border-b border-border px-4 py-3",
          embed && "border-0 px-0 pt-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="font-mono">◉</span>
              Reasoning log
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Every model call, streamed live.
            </p>
          </div>
          {canDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted transition hover:bg-zinc-50 hover:text-fg"
              aria-label="Download reasoning as markdown"
            >
              <Download className="h-3.5 w-3.5" />
              Download reasoning
            </button>
          )}
        </div>
      </div>
      {entries.length === 0 ? (
        <p className={cn("px-4 py-4 text-xs text-muted", embed && "px-0")}>
          Reasoning will stream here once analysis starts.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {entries.map((e) => (
            <LogRow
              key={e.id}
              entry={e}
              anchorTime={anchorTime}
              openIds={openIds}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function LogRow({
  entry,
  anchorTime,
  openIds,
}: {
  entry: LogEntry;
  anchorTime: number | null;
  openIds?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (openIds?.has(entry.id)) setOpen(true);
  }, [openIds, entry.id]);
  const { status } = entry;
  const isReddit = entry.id.startsWith("reddit_analysis");
  const canExpand = status === "done" || status === "failed";

  const nowElapsed =
    entry.startedAt != null
      ? (entry.endedAt ?? Date.now()) - entry.startedAt
      : 0;

  const relFromAnchor =
    anchorTime != null && entry.startedAt != null
      ? (entry.startedAt - anchorTime) / 1000
      : null;

  const durationMs =
    entry.durationMs ??
    (entry.startedAt != null && entry.endedAt != null
      ? entry.endedAt - entry.startedAt
      : null);

  const lamp = (() => {
    if (status === "done")
      return (
        <span
          className="font-mono text-xs text-ok"
          role="img"
          aria-label="done"
        >
          ●
        </span>
      );
    if (status === "failed")
      return (
        <span
          className="font-mono text-xs font-bold text-err"
          role="img"
          aria-label="failed"
        >
          !
        </span>
      );
    if (status === "running")
      return (
        <span
          className="font-mono text-xs text-accent motion-safe:animate-pulse"
          role="img"
          aria-label="running"
        >
          ◐
        </span>
      );
    return (
      <span
        className="font-mono text-xs text-muted"
        role="img"
        aria-label="pending"
      >
        ○
      </span>
    );
  })();

  const rightMeta = (() => {
    if (status === "running") {
      if (isReddit) {
        return `${Math.floor(nowElapsed / 1000)}s / ~${Math.round(REDDIT_EXPECTED_MS / 1000)}s`;
      }
      return `${(nowElapsed / 1000).toFixed(1)}s`;
    }
    if ((status === "done" || status === "failed") && durationMs != null) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    }
    return "";
  })();

  return (
    <li className="px-4 py-2.5">
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-2.5 text-left",
          !canExpand && "cursor-default",
        )}
        onClick={() => canExpand && setOpen((v) => !v)}
        disabled={!canExpand}
      >
        <span className="mt-[3px] w-3 shrink-0 text-center">{lamp}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 truncate text-sm",
                status === "failed" ? "text-err" : "text-fg",
                status === "pending" && "text-muted",
              )}
            >
              {isReddit && (
                <RedditIcon size={12} mono className="text-muted" />
              )}
              {entry.label}
            </span>
            {rightMeta && (
              <span className="shrink-0 font-mono text-[10px] text-muted">
                {rightMeta}
              </span>
            )}
          </div>
          {(relFromAnchor !== null || entry.model) && (
            <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-muted">
              {relFromAnchor !== null && relFromAnchor >= 0 && (
                <span>+{relFromAnchor.toFixed(1)}s</span>
              )}
              {relFromAnchor !== null &&
                relFromAnchor >= 0 &&
                entry.model && <span>·</span>}
              {entry.model && <span className="truncate">{entry.model}</span>}
            </div>
          )}
          {status === "running" && isReddit && (
            <div className="mt-1 text-[11px] italic text-muted">
              {REDDIT_SUBPHASES[
                Math.min(
                  REDDIT_SUBPHASES.length - 1,
                  Math.floor(nowElapsed / 9_000),
                )
              ]}
            </div>
          )}
        </div>
        {canExpand && (
          <span className="mt-1 font-mono text-[10px] text-muted">
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>
      {open && canExpand && (
        <div className="ml-5 mt-2 space-y-2">
          {status === "failed" && entry.error && (
            <div className="rounded border border-err/40 bg-err/10 p-2 text-xs leading-relaxed text-err">
              {entry.error}
            </div>
          )}
          {status !== "failed" && entry.input !== undefined && (
            <Preview label="input" data={entry.input} />
          )}
          {status !== "failed" && entry.output !== undefined && (
            <Preview label="output" data={entry.output} />
          )}
          {entry.children && entry.children.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                Sub-steps · {entry.children.length}
              </div>
              <ol className="divide-y divide-border rounded border border-border bg-bg">
                {entry.children.map((c) => (
                  <LogRow
                    key={c.id}
                    entry={c}
                    anchorTime={null}
                    openIds={openIds}
                  />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Preview({ label, data }: { label: string; data: unknown }) {
  const body =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-bg p-2 text-xs leading-relaxed text-fg">
        {body}
      </pre>
    </div>
  );
}
