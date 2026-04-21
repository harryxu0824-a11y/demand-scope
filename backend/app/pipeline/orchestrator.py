import sys
import time
import traceback
from contextlib import contextmanager
from typing import Any, Callable

from ..clients.llm import LLMClient
from ..clients.reddit import get_reddit_source
from ..config import settings
from ..schemas import DemandReport, PlatformAdequacy, Reframe, TraceStep
from .analyzer import analyze
from .critic import critique
from .query_planner import plan_queries
from .validator import validate_report


class PipelineError(RuntimeError):
    def __init__(self, step: str, inner: Exception):
        self.step = step
        self.inner = inner
        super().__init__(f"Reddit analysis failed at {step}: {inner}")


def _log_exception(step: str, e: Exception) -> None:
    print(f"[pipeline] {step} FAILED: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
    traceback.print_exc(file=sys.stderr)


PREVIEW_CHARS = 500


def _truncate(s: str, limit: int = PREVIEW_CHARS) -> str:
    if s is None:
        return ""
    if len(s) <= limit:
        return s
    return s[:limit] + f"…[+{len(s) - limit} chars]"


class _StepRecorder:
    """Handle to populate input/output/metadata from inside the `with` block."""

    def __init__(self) -> None:
        self.input_preview: str = ""
        self.output_preview: str = ""
        self.metadata: dict[str, Any] = {}


class TraceCollector:
    """Collects TraceStep entries during pipeline execution."""

    def __init__(self) -> None:
        self.steps: list[TraceStep] = []

    @contextmanager
    def record(self, *, step: str, phase: str, model: str | None = None):
        started = time.time()
        mono_start = time.monotonic()
        rec = _StepRecorder()
        print(f"[pipeline] {step} …", file=sys.stderr, flush=True)
        try:
            yield rec
        finally:
            elapsed_ms = int((time.monotonic() - mono_start) * 1000)
            print(
                f"[pipeline] {step} done in {elapsed_ms / 1000:.1f}s",
                file=sys.stderr,
                flush=True,
            )
            self.steps.append(
                TraceStep(
                    step=step,
                    phase=phase,
                    model=model,
                    started_at=started,
                    elapsed_ms=elapsed_ms,
                    input_preview=_truncate(rec.input_preview),
                    output_preview=_truncate(rec.output_preview),
                    metadata=rec.metadata,
                )
            )


PhaseEvent = dict[str, Any]
EventCallback = Callable[[PhaseEvent], None] | None


@contextmanager
def _phase(emit: EventCallback, name: str):
    """Bracket a phase with start/done events for SSE streaming."""
    mono = time.monotonic()
    if emit:
        emit({"type": "phase", "phase": name, "status": "start"})
    try:
        yield
    finally:
        elapsed = int((time.monotonic() - mono) * 1000)
        if emit:
            emit(
                {
                    "type": "phase",
                    "phase": name,
                    "status": "done",
                    "elapsed_ms": elapsed,
                }
            )


def run_reddit_analysis(
    client: LLMClient,
    reframe: Reframe,
    adequacy: PlatformAdequacy,
    *,
    override_low_adequacy: bool = False,
    on_event: EventCallback = None,
) -> DemandReport:
    """Run the full pipeline. `on_event` receives coarse 4-phase events for SSE."""
    collector = TraceCollector()
    models = settings.model_for

    with _phase(on_event, "understanding_market"):
        try:
            with collector.record(
                step="query_planner",
                phase="understanding_market",
                model=models["query_planner"],
            ) as rec:
                rec.input_preview = (
                    f"Job-to-be-done: {reframe.job_to_be_done}\n"
                    f"User-language: {reframe.user_language_rephrase}\n"
                    f"Pain hypotheses ({len(reframe.pain_hypotheses)}): "
                    + "; ".join(reframe.pain_hypotheses)
                )
                plan = plan_queries(client, reframe)
                rec.output_preview = (
                    f"Positive keywords: {', '.join(plan.positive_keywords)}\n"
                    f"Pain keywords: {', '.join(plan.pain_keywords)}\n"
                    f"Subreddits: {', '.join(plan.candidate_subreddits)}"
                )
                rec.metadata = {
                    "positive_count": len(plan.positive_keywords),
                    "pain_count": len(plan.pain_keywords),
                    "subreddit_count": len(plan.candidate_subreddits),
                }
        except Exception as e:
            _log_exception("query_planner", e)
            raise PipelineError("query_planner", e) from e

    keywords = [*plan.positive_keywords, *plan.pain_keywords]
    with _phase(on_event, "gathering_signal"):
        try:
            with collector.record(
                step="harvester",
                phase="gathering_signal",
                model=None,
            ) as rec:
                source = get_reddit_source()
                source_label = "mock_reddit" if settings.reddit_source == "mock" else "praw"
                rec.input_preview = (
                    f"Source: {source_label}\n"
                    f"Keywords ({len(keywords)}): {', '.join(keywords)}\n"
                    f"Subreddits: {', '.join(plan.candidate_subreddits) or '<none>'}"
                )
                corpus = source.search(
                    keywords=keywords,
                    subreddits=plan.candidate_subreddits or None,
                    limit=20,
                )
                corpus = _truncate_corpus(corpus, settings.max_input_chars_per_analysis)
                posts = sum(1 for i in corpus if i.kind == "post")
                comments = sum(1 for i in corpus if i.kind == "comment")
                subs = sorted({i.subreddit for i in corpus})
                rec.output_preview = (
                    f"Items: {len(corpus)} ({posts} posts, {comments} comments)\n"
                    f"Subreddits represented: {', '.join(subs) or '<none>'}"
                )
                rec.metadata = {
                    "source": source_label,
                    "item_count": len(corpus),
                    "post_count": posts,
                    "comment_count": comments,
                    "subreddits": subs,
                }
        except Exception as e:
            _log_exception("harvester", e)
            raise PipelineError("harvester", e) from e
        print(
            f"[pipeline] corpus size: {len(corpus)} items",
            file=sys.stderr,
            flush=True,
        )

    if not corpus:
        return DemandReport(
            adequacy=adequacy,
            reframe=reframe,
            demand_level="low",
            demand_level_rationale="No Reddit discussion surfaced for the planned queries.",
            demand_type="unknown",
            demand_type_rationale="Without corpus data we cannot classify demand type.",
            gaps=[],
            confidence=None,
            low_adequacy_override=override_low_adequacy,
            empty_reason="no_discussion",
            empty_reason_details={
                "subreddits_searched": plan.candidate_subreddits,
                "keywords_tried": keywords,
                "posts_found": 0,
            },
            trace=collector.steps,
        )

    with _phase(on_event, "analyzing_demand"):
        try:
            with collector.record(
                step="analyzer",
                phase="analyzing_demand",
                model=models["analyzer"],
            ) as rec:
                rec.input_preview = (
                    f"Reframe (user-language): {reframe.user_language_rephrase}\n"
                    f"Adequacy: level={adequacy.level}, override={override_low_adequacy}\n"
                    f"Corpus: {len(corpus)} items"
                )
                report = analyze(
                    client,
                    reframe,
                    adequacy,
                    corpus,
                    override_low_adequacy=override_low_adequacy,
                )
                rec.output_preview = (
                    f"demand_level={report.demand_level}, "
                    f"demand_type={report.demand_type}, "
                    f"confidence={report.confidence}\n"
                    f"Gaps ({len(report.gaps)}): "
                    + "; ".join(g.description[:80] for g in report.gaps)
                )
                rec.metadata = {
                    "gap_count": len(report.gaps),
                    "evidence_count": sum(len(g.evidence) for g in report.gaps),
                    "demand_level": report.demand_level,
                    "demand_type": report.demand_type,
                    "confidence": report.confidence,
                }
        except Exception as e:
            _log_exception("analyzer", e)
            raise PipelineError("analyzer", e) from e

        analyzer_evidence_count = sum(len(g.evidence) for g in report.gaps)
        # Snapshot analyzer output for signal_too_weak details if later stages drop everything.
        analyzer_snapshot = [
            {
                "gap": g.description,
                "quotes": [e.quote for e in g.evidence][:3],
            }
            for g in report.gaps
        ]
        if analyzer_evidence_count == 0:
            return DemandReport(
                adequacy=adequacy,
                reframe=reframe,
                demand_level="low",
                demand_level_rationale="Corpus present, but analyzer extracted no quotes matching the reframed problem.",
                demand_type="unknown",
                demand_type_rationale="No quotes extracted — cannot classify demand type.",
                gaps=[],
                confidence=None,
                low_adequacy_override=override_low_adequacy,
                empty_reason="search_mismatch",
                empty_reason_details={
                    "subreddits_searched": plan.candidate_subreddits,
                    "posts_found": len(corpus),
                    "user_language_rephrase": reframe.user_language_rephrase,
                    "pain_hypotheses": reframe.pain_hypotheses,
                },
                trace=collector.steps,
            )

        try:
            with collector.record(
                step="critic",
                phase="analyzing_demand",
                model=models["critic"],
            ) as rec:
                rec.input_preview = (
                    f"Reviewing {len(report.gaps)} gaps with {sum(len(g.evidence) for g in report.gaps)} "
                    "evidence items. Adversarial review."
                )
                before = [(g.verdict, g.critic_notes) for g in report.gaps]
                report = critique(client, report, corpus)
                after = [(g.verdict, g.critic_notes) for g in report.gaps]
                verdict_counts: dict[str, int] = {}
                for v, _ in after:
                    verdict_counts[v] = verdict_counts.get(v, 0) + 1
                rec.output_preview = (
                    "Verdicts after critic: "
                    + ", ".join(f"{v}={c}" for v, c in verdict_counts.items())
                )
                rec.metadata = {
                    "verdict_counts": verdict_counts,
                    "gaps_reviewed": len(report.gaps),
                }
        except Exception as e:
            _log_exception("critic", e)
            raise PipelineError("critic", e) from e

    with _phase(on_event, "verifying_evidence"):
        try:
            with collector.record(
                step="validator",
                phase="verifying_evidence",
                model=None,
            ) as rec:
                gaps_in = len(report.gaps)
                evidence_in = sum(len(g.evidence) for g in report.gaps)
                rec.input_preview = (
                    f"Input: {gaps_in} gaps, {evidence_in} evidence items.\n"
                    "Rules: evidence_id ∈ corpus · quote matches source · ≥2 independent sources per gap"
                )
                report = validate_report(report, corpus)
                gaps_out = len(report.gaps)
                evidence_out = sum(len(g.evidence) for g in report.gaps)
                rec.output_preview = (
                    f"Kept {gaps_out}/{gaps_in} gaps and {evidence_out}/{evidence_in} evidence items"
                )
                rec.metadata = {
                    "gaps_in": gaps_in,
                    "gaps_kept": gaps_out,
                    "evidence_in": evidence_in,
                    "evidence_kept": evidence_out,
                }
        except Exception as e:
            _log_exception("validator", e)
            raise PipelineError("validator", e) from e

    report.trace = collector.steps
    final_evidence = sum(len(g.evidence) for g in report.gaps)
    if final_evidence == 0:
        return DemandReport(
            adequacy=adequacy,
            reframe=reframe,
            demand_level="low",
            demand_level_rationale="Analyzer surfaced candidates but critic+validator rejected all of them.",
            demand_type="unknown",
            demand_type_rationale="No quotes survived validation — cannot classify demand type.",
            gaps=[],
            confidence=None,
            low_adequacy_override=override_low_adequacy,
            empty_reason="signal_too_weak",
            empty_reason_details={
                "rejected_quotes": analyzer_snapshot,
                "analyzer_evidence_count": analyzer_evidence_count,
            },
            trace=collector.steps,
        )
    return report


def _truncate_corpus(corpus, max_chars: int):
    running = 0
    kept = []
    for item in sorted(corpus, key=lambda x: x.score, reverse=True):
        chunk = len(item.body) + len(item.title or "")
        if running + chunk > max_chars:
            break
        kept.append(item)
        running += chunk
    return kept
