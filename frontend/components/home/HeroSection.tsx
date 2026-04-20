"use client";

import { RedditIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { TypewriterInput } from "./TypewriterInput";
import { useFadeIn } from "./useFadeIn";

const CYCLE = [
  "We build inventory forecasting for independent cannabis dispensaries...",
  "A grief journaling app for widowed adults over 60...",
  "CLI tool helping fiction writers check their manuscript with local LLMs...",
  "Compliance automation for yacht captains managing Mediterranean charters...",
];

export function HeroSection() {
  const { ref, className } = useFadeIn<HTMLElement>();

  return (
    <section
      ref={ref}
      className={cn(
        "mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 py-24 transition-all duration-500 ease-out md:grid-cols-[minmax(0,55%)_minmax(0,45%)] md:py-32 md:px-10",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className="text-[36px] font-medium leading-[1.05] tracking-tight text-[#1A1A1A] md:text-[56px] lg:text-[60px]"
          style={{ fontWeight: 500 }}
        >
          We&apos;d rather disappoint you than deceive you.
        </h1>
        <p className="mt-6 text-[17px] leading-[1.5] text-[#3A3A3A] md:text-[20px]">
          Demand Scope runs a multi-agent pipeline over Reddit to find real
          buying signal for your idea — and tells you when the signal
          isn&apos;t there.
        </p>
        <div className="mt-10">
          <TypewriterInput
            placeholders={CYCLE}
            helperText="Try your own idea, or let an example autocomplete above."
          />
        </div>
      </div>

      <div className="min-w-0">
        <Montage />
      </div>
    </section>
  );
}

function Montage() {
  return (
    <div className="group relative mx-auto h-[420px] w-full max-w-[440px] transition-transform duration-300 ease-out [perspective:1000px] hover:[transform:perspective(1000px)_rotateY(-3deg)_rotateX(2deg)]">
      {/* Back layer: mini reasoning log, rotated left-back */}
      <div
        className="absolute left-0 top-6 w-[240px] rounded-lg border border-[#eef0f4] bg-[#f8f9fb] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        style={{
          transform: "rotate(-3deg) translateX(-20px) translateY(-10px)",
          zIndex: 1,
        }}
      >
        <div className="flex items-center gap-2 border-b border-[#eef0f4] pb-2">
          <span className="font-mono text-[10px] text-[#888]">◉</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#888]">
            Reasoning log
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {[
            { label: "Reframe description", duration: "12.3s" },
            { label: "Platform adequacy", duration: "45.4s", reddit: false },
            { label: "Reddit analysis", duration: "72.2s", reddit: true },
          ].map((e) => (
            <li key={e.label} className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-[11px] text-[#16a34a]">
                ●
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12px] text-[#1A1A1A]">
                  {e.reddit && (
                    <RedditIcon size={10} mono className="text-[#888]" />
                  )}
                  <span className="truncate">{e.label}</span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-[#888]">
                  +0.0s · {e.duration}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Middle layer: HIGH adequacy mini card, upright, centered-ish */}
      <div
        className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#eef0f4] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
        style={{ zIndex: 2 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#1A1A1A]">
            Platform adequacy
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#888]">
            high
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-[1.5] text-[#1A1A1A]">
          Creators are tech-savvy and use Reddit to troubleshoot workflows —
          direct match.
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <div className="rounded border border-[#eef0f4] bg-[#f8f9fb] p-2">
            <div className="font-mono text-[8px] uppercase tracking-wider text-[#888]">
              Target
            </div>
            <p className="mt-1 text-[10px] leading-[1.4] text-[#1A1A1A]">
              Chinese-speaking video creators growing English audience.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 px-1 text-[#16a34a]">
            <span className="text-base leading-none">→</span>
            <span className="font-mono text-[8px]">primary</span>
          </div>
          <div className="rounded border border-green-200 bg-green-50 p-2">
            <div className="font-mono text-[8px] uppercase tracking-wider text-green-900/70">
              Reddit captures
            </div>
            <p className="mt-1 text-[10px] leading-[1.4] text-green-900">
              Reddit hosts daily-grind creator conversations.
            </p>
          </div>
        </div>
      </div>

      {/* Front layer: structural gap card */}
      <div
        className="absolute bottom-0 right-0 w-[280px] rounded-lg border border-[#eef0f4] bg-white p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
        style={{
          transform: "rotate(2deg) translateX(15px) translateY(20px)",
          zIndex: 3,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="flex-1 text-[11px] font-medium leading-[1.4] text-[#1A1A1A]">
            Professional AI scribe tools solve this problem but are sold B2B to
            hospitals — patients have no equivalent.
          </p>
          <span className="shrink-0 rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[9px] font-medium text-info">
            structural
          </span>
        </div>
        <p className="mt-2 text-[10px] italic leading-[1.4] text-[#888]">
          Critic: Structural gap · distribution mismatch. Rare but high-signal
          observation.
        </p>
      </div>
    </div>
  );
}
