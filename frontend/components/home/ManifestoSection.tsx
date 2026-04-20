"use client";

import { cn } from "@/lib/cn";
import { useFadeIn } from "./useFadeIn";

const ITEMS: { head: string; body: string }[] = [
  {
    head: "Most tools hallucinate with confidence. We'd rather return nothing.",
    body: "When Reddit has no signal on your idea, we don't manufacture personas and pain points. We show you why, and where to look instead.",
  },
  {
    head: "Most tools count quotes. We weigh them.",
    body: "A single user articulating a market-structure gap beats ten users venting the same pain. Our critic knows the difference.",
  },
  {
    head: "Most tools treat Reddit as universal. We don't.",
    body: "Some audiences live on LinkedIn. Some in private forums. Some nowhere public. The first thing we do is check if Reddit is even the right place to ask.",
  },
  {
    head: "Most tools show you a result. We show you the reasoning.",
    body: "Every model call, every tool use, every rejected quote — visible live while the pipeline runs.",
  },
  {
    head: "Most tools optimize for looking smart. We optimize for being honest about what we don't know.",
    body: "Low confidence stays low. Missing data stays missing. We'd rather disappoint you than deceive you.",
  },
];

export function ManifestoSection() {
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
          Our stop doing list.
        </h2>
        <p className="mt-3 text-[16px] text-[#666] md:text-[18px]">
          The constraints are the product.
        </p>
      </div>

      <ol className="mx-auto mt-16 max-w-[680px] space-y-14">
        {ITEMS.map((it, i) => (
          <li key={i}>
            <p className="text-[18px] font-medium leading-snug text-[#1A1A1A] md:text-[22px]">
              {it.head}
            </p>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#555] md:text-[16px]">
              {it.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
