"use client";

/**
 * Product rationale: the bar's presence IS the warning.
 *
 *   - level === "high"    → bar does not render (DOM is empty, signal = "OK")
 *   - level === "medium"  → amber bar renders (signal = "partial signal, be careful")
 *   - level === "low"     → red bar renders (signal = "Reddit is a weak platform for this")
 *
 * The meta-signal of the bar's existence is more efficient than a text warning.
 * That is why there is no dismiss button, no localStorage, no session state —
 * the bar's existence is data, not UI preference.
 */

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlatformAdequacy } from "@/lib/types";
import { cn } from "@/lib/cn";
import { AdequacyFlow } from "./AdequacyFlow";

interface Props {
  adequacy: PlatformAdequacy;
  subredditCount: number;
  quoteCount: number;
}

export function AdequacyBar({
  adequacy,
  subredditCount,
  quoteCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (barRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      if (sheetRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  if (adequacy.level === "high") return null;

  const isLow = adequacy.level === "low";
  const label = isLow ? "Low platform fit" : "Medium platform fit";

  const barTone = isLow
    ? "bg-red-50 text-red-900 border-red-200"
    : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <>
      <div
        ref={barRef}
        className={cn("sticky top-0 z-40 border-b", barTone)}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex h-10 w-full items-center justify-between gap-3 px-4 text-sm font-medium"
        >
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="hidden truncate sm:inline">
              Based on {subredditCount} subreddit
              {subredditCount !== 1 && "s"} · {quoteCount} quote
              {quoteCount !== 1 && "s"} · {label}
            </span>
            <span className="truncate sm:hidden">
              {label} · {subredditCount} sub
              {subredditCount !== 1 && "s"} · {quoteCount} quote
              {quoteCount !== 1 && "s"}
            </span>
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 transition-transform motion-safe:duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Platform adequacy details"
            className="absolute left-4 top-full mt-2 hidden w-[560px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-bg p-4 text-fg shadow-lg md:block"
          >
            <AdequacyFlow adequacy={adequacy} />
          </div>
        )}
      </div>

      {open && (
        <MobileSheet
          innerRef={sheetRef}
          adequacy={adequacy}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function MobileSheet({
  adequacy,
  onClose,
  innerRef,
}: {
  adequacy: PlatformAdequacy;
  onClose: () => void;
  innerRef: React.RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
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
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:hidden"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={innerRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full rounded-t-xl border-t border-border bg-bg text-fg shadow-xl"
        style={{ paddingBottom: `env(safe-area-inset-bottom)` }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-bg px-4 py-3">
          <h2 className="text-sm font-semibold">Platform adequacy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-fg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">
          <AdequacyFlow adequacy={adequacy} />
        </div>
      </div>
    </div>
  );
}

