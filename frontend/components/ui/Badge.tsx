import { cn } from "@/lib/cn";

type Tone = "ok" | "info" | "warn" | "err" | "neutral";

const tones: Record<Tone, string> = {
  ok: "bg-ok/15 text-ok border-ok/40",
  info: "bg-info/10 text-info border-info/40",
  warn: "bg-warn/15 text-warn border-warn/40",
  err: "bg-err/15 text-err border-err/40",
  neutral: "bg-panel text-muted border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
