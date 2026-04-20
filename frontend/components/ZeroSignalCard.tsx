"use client";

/**
 * Design contract: 0 validated quotes is not an error, it is the honest answer.
 *
 * When `report.empty_reason` is set, the Demand diagnostic and Gaps sections
 * do not render. This component replaces them as the primary output of the
 * run. It must communicate three things:
 *
 *   1. Reddit gave us nothing usable (stated plainly, no red alert).
 *   2. WHY it gave us nothing (three distinct causes → three variants).
 *   3. What the user should do next.
 *
 * Consistency rule: empty_reason and adequacy.level must agree. HIGH
 * adequacy + search_mismatch is an internal contradiction — adequacy said
 * Reddit is a primary channel, yet we matched zero quotes. In that case the
 * copy must admit this is our end's problem (pipeline / search query), NOT
 * the user's "vocabulary gap" to fix. Blaming the user here would undermine
 * the honest positioning the whole product is built on.
 *
 * Continuing to render a LOW demand + UNKNOWN type verdict with high
 * "confidence" after finding zero quotes would be the product saying "trust
 * me" while having analyzed nothing. That would collapse the honest-about-
 * platform-limits positioning this product is built on.
 */

import { Info } from "lucide-react";
import { useState } from "react";
import type { EmptyReason, PlatformAdequacy, Reframe } from "@/lib/types";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { cn } from "@/lib/cn";

interface Props {
  reason: EmptyReason;
  details: Record<string, unknown> | undefined;
  adequacy: PlatformAdequacy;
  reframe: Reframe;
  onRefineReframe?: () => void;
  onViewRawSearch?: () => void;
}

export function ZeroSignalCard({
  reason,
  details,
  adequacy,
  reframe,
  onRefineReframe,
  onViewRawSearch,
}: Props) {
  if (reason === "no_discussion") {
    return <NoDiscussion details={details} adequacy={adequacy} />;
  }
  if (reason === "search_mismatch") {
    if (adequacy.level === "high") {
      return (
        <SearchMismatchHigh
          details={details}
          reframe={reframe}
          onRefineReframe={onRefineReframe}
          onViewRawSearch={onViewRawSearch}
        />
      );
    }
    return (
      <SearchMismatch
        details={details}
        adequacy={adequacy}
        reframe={reframe}
        onRefineReframe={onRefineReframe}
      />
    );
  }
  return <SignalTooWeak details={details} adequacy={adequacy} />;
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-panel p-6">
      <div className="flex items-start gap-3">
        <Info
          size={20}
          className="mt-0.5 shrink-0 text-muted"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1">{subtitle}</CardDescription>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  );
}

function NoDiscussion({
  details,
  adequacy,
}: {
  details: Props["details"];
  adequacy: PlatformAdequacy;
}) {
  const subs =
    (details?.subreddits_searched as string[] | undefined) ?? [];
  const postsFound = (details?.posts_found as number | undefined) ?? 0;
  return (
    <Shell
      title="Reddit has no discussion on this topic"
      subtitle="We searched, but this audience doesn't bring these problems to Reddit."
    >
      <p className="text-sm leading-relaxed text-fg">
        Across the {subs.length || "target"} subreddit
        {subs.length !== 1 && "s"} our reframer identified
        {subs.length > 0 && (
          <>
            {" ("}
            <span className="font-mono text-xs text-muted">
              {subs.join(", ")}
            </span>
            {")"}
          </>
        )}
        , we found {postsFound} post{postsFound !== 1 && "s"} mentioning any
        variant of your problem space in the past 12 months. This usually means
        the audience resolves these problems in private channels or specialized
        forums, not public social platforms.
      </p>

      <NextActionBlock
        title="Where to look instead"
        emphasis
        sources={adequacy.recommended_alternative_sources}
      />
    </Shell>
  );
}

function SearchMismatch({
  details,
  adequacy,
  reframe,
  onRefineReframe,
}: {
  details: Props["details"];
  adequacy: PlatformAdequacy;
  reframe: Reframe;
  onRefineReframe?: () => void;
}) {
  const [showAlt, setShowAlt] = useState(false);
  const postsFound = (details?.posts_found as number | undefined) ?? 0;
  return (
    <Shell
      title="Reddit has discussion, but our search didn't match it"
      subtitle={`We found ${postsFound} post${postsFound !== 1 ? "s" : ""} in target subreddits, but none matched the reframed problem. The vocabulary gap suggests we're searching the wrong terms.`}
    >
      <div className="rounded-md border border-border bg-bg p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          We searched with these words
        </div>
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted">
              user-language rephrase
            </span>
            <p className="mt-1 text-fg">{reframe.user_language_rephrase}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-muted">
              pain hypotheses
            </span>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg">
              {reframe.pain_hypotheses.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onRefineReframe && (
          <button
            type="button"
            onClick={onRefineReframe}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Refine the reframe
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAlt((v) => !v)}
          className="rounded-md border border-border bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-panel"
        >
          {showAlt ? "Hide alternative sources" : "Look elsewhere"}
        </button>
      </div>

      {showAlt && (
        <NextActionBlock
          title="Alternative sources"
          sources={adequacy.recommended_alternative_sources}
        />
      )}
    </Shell>
  );
}

function SearchMismatchHigh({
  details,
  reframe,
  onRefineReframe,
  onViewRawSearch,
}: {
  details: Props["details"];
  reframe: Reframe;
  onRefineReframe?: () => void;
  onViewRawSearch?: () => void;
}) {
  const postsFound = (details?.posts_found as number | undefined) ?? 0;
  const subs = (details?.subreddits_searched as string[] | undefined) ?? [];
  return (
    <Shell
      title="Our search returned nothing, but Reddit should have this"
      subtitle={`Adequacy says Reddit is a primary source for this audience, but our pipeline found 0 matching quotes across ${postsFound} harvested post${postsFound !== 1 ? "s" : ""}. This is unusual and likely a search-query issue on our end, not the audience's.`}
    >
      <div className="rounded-md border border-border bg-bg p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          We searched with these words
        </div>
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted">
              user-language rephrase
            </span>
            <p className="mt-1 text-fg">{reframe.user_language_rephrase}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-muted">
              pain hypotheses
            </span>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg">
              {reframe.pain_hypotheses.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="rounded-md border border-border bg-bg p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Subreddits we searched
          </div>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {subs.map((s, i) => (
              <li
                key={i}
                className="rounded border border-border bg-panel px-2 py-0.5 font-mono text-xs text-fg"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onRefineReframe && (
          <button
            type="button"
            onClick={onRefineReframe}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Try again with different phrasing
          </button>
        )}
        {onViewRawSearch && (
          <button
            type="button"
            onClick={onViewRawSearch}
            className="rounded-md border border-border bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-panel"
          >
            View raw search debug
          </button>
        )}
      </div>
    </Shell>
  );
}

interface RejectedQuote {
  gap: string;
  quotes: string[];
  rejection_reason: string;
}

function SignalTooWeak({
  details,
  adequacy,
}: {
  details: Props["details"];
  adequacy: PlatformAdequacy;
}) {
  const [showRejected, setShowRejected] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const rejected =
    (details?.rejected_quotes as RejectedQuote[] | undefined) ?? [];
  const analyzerCount =
    (details?.analyzer_evidence_count as number | undefined) ?? 0;
  return (
    <Shell
      title="Discussion exists, but not at decision-making signal strength"
      subtitle="We found posts mentioning your problem space, but none passed our critic and validator for demand signal quality."
    >
      <p className="text-sm leading-relaxed text-fg">
        Our filters require quotes that show (1) a real user pain, (2) an
        attempted solution, and (3) willingness to pay or switch. These are the
        signals that predict buying behaviour. What we saw was either casual
        mentions, off-topic threads, or tangential complaints — {analyzerCount}{" "}
        candidate quote{analyzerCount !== 1 && "s"} surfaced, 0 survived.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowRejected((v) => !v)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          {showRejected
            ? "Hide rejected quotes"
            : `Show rejected quotes (${rejected.length})`}
        </button>
        <button
          type="button"
          onClick={() => setShowAlt((v) => !v)}
          className="rounded-md border border-border bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-panel"
        >
          {showAlt ? "Hide alternative sources" : "Alternative sources"}
        </button>
      </div>

      {showRejected && rejected.length > 0 && (
        <div className="space-y-3">
          {rejected.map((r, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-bg p-4"
            >
              <div className="text-xs font-medium text-fg">{r.gap}</div>
              <ul className="mt-2 space-y-1 text-xs italic text-muted">
                {r.quotes.map((q, j) => (
                  <li key={j}>“{q}”</li>
                ))}
              </ul>
              <div className="mt-3 border-t border-border pt-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  Why we rejected them
                </span>
                <p className="mt-1 text-xs leading-relaxed text-fg">
                  {r.rejection_reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAlt && (
        <NextActionBlock
          title="Alternative sources"
          sources={adequacy.recommended_alternative_sources}
        />
      )}
    </Shell>
  );
}

function NextActionBlock({
  title,
  sources,
  emphasis = false,
}: {
  title: string;
  sources: string[];
  emphasis?: boolean;
}) {
  if (sources.length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        emphasis
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-bg",
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {title}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-fg">
        {sources.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted">·</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
