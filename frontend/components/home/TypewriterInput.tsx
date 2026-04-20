"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface Props {
  placeholders?: string[]; // cycling list; omit or [] → static placeholder
  staticPlaceholder?: string;
  ctaLabel?: string;
  helperText?: string;
}

const TYPE_MS = 50;
const DELETE_MS = 30;
const HOLD_MS = 3000;

export function TypewriterInput({
  placeholders,
  staticPlaceholder = "Describe your business…",
  ctaLabel = "Analyze",
  helperText,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState(staticPlaceholder);
  const [focused, setFocused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const cycle =
    Array.isArray(placeholders) && placeholders.length > 0
      ? placeholders
      : null;

  useEffect(() => {
    if (!cycle) {
      setPlaceholder(staticPlaceholder);
      return;
    }

    let idx = 0;
    let pos = 0;
    let phase: "typing" | "holding" | "deleting" = "typing";
    stoppedRef.current = false;

    const tick = () => {
      if (stoppedRef.current) return;
      const full = cycle[idx];
      if (phase === "typing") {
        pos += 1;
        setPlaceholder(full.slice(0, pos));
        if (pos >= full.length) {
          phase = "holding";
          rafRef.current = window.setTimeout(tick, HOLD_MS) as unknown as number;
          return;
        }
        rafRef.current = window.setTimeout(tick, TYPE_MS) as unknown as number;
        return;
      }
      if (phase === "holding") {
        phase = "deleting";
        rafRef.current = window.setTimeout(tick, DELETE_MS) as unknown as number;
        return;
      }
      // deleting
      pos -= 1;
      setPlaceholder(full.slice(0, Math.max(0, pos)));
      if (pos <= 0) {
        idx = (idx + 1) % cycle.length;
        phase = "typing";
        rafRef.current = window.setTimeout(tick, 300) as unknown as number;
        return;
      }
      rafRef.current = window.setTimeout(tick, DELETE_MS) as unknown as number;
    };

    tick();
    return () => {
      stoppedRef.current = true;
      if (rafRef.current) window.clearTimeout(rafRef.current);
    };
  }, [cycle, staticPlaceholder]);

  // Pause cycling on focus — freeze placeholder in its current state.
  useEffect(() => {
    if (focused) {
      stoppedRef.current = true;
      if (rafRef.current) window.clearTimeout(rafRef.current);
    }
  }, [focused]);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      router.push(`/analyze?description=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/analyze`);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={value ? "" : placeholder}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-base text-[#1A1A1A] outline-none transition",
            "placeholder:text-[#AAA] focus:border-[#5b3df5] focus:ring-2 focus:ring-[#5b3df5]/20",
            focused && cycle && "placeholder:text-[#CCC]",
          )}
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-[#5b3df5] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md active:scale-100"
        >
          {ctaLabel}
        </button>
      </div>
      {helperText && (
        <p className="mt-2 text-sm text-[#888]">{helperText}</p>
      )}
    </div>
  );
}
