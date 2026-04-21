"use client";

import { cn } from "@/lib/cn";
import { TypewriterInput } from "./TypewriterInput";
import { useFadeIn } from "./useFadeIn";

export function FooterCTASection() {
  const { ref, className } = useFadeIn<HTMLElement>();
  return (
    <section
      ref={ref}
      className={cn(
        "mx-auto max-w-[1200px] px-6 py-24 transition-all duration-500 ease-out md:py-32 md:px-10",
        className,
      )}
    >
      <div className="mx-auto max-w-[720px]">
        <h2 className="text-[28px] font-medium leading-tight text-[#1A1A1A] md:text-[36px]">
          Try it with your own idea.
        </h2>
        <div className="mt-8">
          <TypewriterInput ctaLabel="Analyze" />
        </div>
        <p className="mt-8 text-[16px] text-[#555]">
          Open source, because you should be able to see what&apos;s judging
          your idea.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[16px]">
          <li>
            <a
              href="https://github.com/harryxu0824-a11y/demand-scope"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[#1A1A1A] hover:underline"
            >
              GitHub →
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/chiheng-xu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[#1A1A1A] hover:underline"
            >
              LinkedIn →
            </a>
          </li>
          <li>
            <a
              href="https://github.com/harryxu0824-a11y/demand-scope/blob/main/DECISIONS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[#1A1A1A] hover:underline"
            >
              Design decisions →
            </a>
          </li>
        </ul>
        <p className="mt-12 text-[13px] italic text-[#999]">
          Demand Scope is a tool, not an oracle. Its judgments are as good as
          the reasoning log makes visible.
        </p>
      </div>
    </section>
  );
}
