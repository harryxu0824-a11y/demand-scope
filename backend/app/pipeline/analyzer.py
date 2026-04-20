import sys

from ..clients.llm import LLMClient
from ..prompts import ANALYZER_SYSTEM
from ..schemas import AnalyzerOutput, DemandReport, PlatformAdequacy, Reframe, RedditItem


def _render_corpus(corpus: list[RedditItem]) -> str:
    lines: list[str] = []
    for item in corpus:
        header = f"[id={item.evidence_id}] (r/{item.subreddit}, {item.kind}, score={item.score}, author={item.author})"
        lines.append(header)
        if item.title:
            lines.append(f"Title: {item.title}")
        lines.append(f"Body: {item.body}")
        lines.append("")
    return "\n".join(lines).strip()


def analyze(
    client: LLMClient,
    reframe: Reframe,
    adequacy: PlatformAdequacy,
    corpus: list[RedditItem],
    *,
    override_low_adequacy: bool = False,
) -> DemandReport:
    user = (
        "Business description (user language):\n"
        f"{reframe.user_language_rephrase}\n\n"
        "Job-to-be-done:\n"
        f"{reframe.job_to_be_done}\n\n"
        f"Platform Adequacy: level={adequacy.level}\n"
        f"Adequacy rationale: {adequacy.reddit_fit_rationale}\n"
        f"Low-adequacy override active: {override_low_adequacy}\n\n"
        "Reddit corpus (treat each [id=...] block as a single item):\n\n"
        f"{_render_corpus(corpus)}"
    )

    out = client.complete_json(
        step="analyzer",
        system=ANALYZER_SYSTEM,
        user=user,
        schema=AnalyzerOutput,
        max_tokens=6000,
    )
    print(
        f"[analyzer] LLM produced {len(out.gaps)} gaps with "
        f"total {sum(len(g.evidence) for g in out.gaps)} evidence items",
        file=sys.stderr,
        flush=True,
    )

    confidence = out.confidence
    if (override_low_adequacy or adequacy.level == "low") and confidence == "high":
        confidence = "medium"

    return DemandReport(
        adequacy=adequacy,
        reframe=reframe,
        demand_level=out.demand_level,
        demand_level_rationale=out.demand_level_rationale,
        demand_type=out.demand_type,
        demand_type_rationale=out.demand_type_rationale,
        gaps=out.gaps,
        confidence=confidence,
        low_adequacy_override=override_low_adequacy,
    )
