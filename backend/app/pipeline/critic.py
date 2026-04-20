from typing import Literal

from pydantic import BaseModel

from ..clients.llm import LLMClient
from ..prompts import CRITIC_SYSTEM
from ..schemas import DemandReport, RedditItem
from .analyzer import _render_corpus


class _CriticVerdict(BaseModel):
    gap_index: int
    verdict: Literal["supported", "structural", "weak", "contradicted"]
    critic_notes: str


class _CriticResponse(BaseModel):
    verdicts: list[_CriticVerdict]


def critique(
    client: LLMClient,
    report: DemandReport,
    corpus: list[RedditItem],
) -> DemandReport:
    if not report.gaps:
        return report

    gaps_payload = "\n\n".join(
        f"Gap {i}: {g.description}\n"
        + "Evidence:\n"
        + "\n".join(f"  - [{e.evidence_id}] {e.quote}" for e in g.evidence)
        for i, g in enumerate(report.gaps)
    )
    user = (
        "Initial DemandReport gaps to review:\n\n"
        f"{gaps_payload}\n\n"
        "Full Reddit corpus for cross-reference:\n\n"
        f"{_render_corpus(corpus)}"
    )
    try:
        critic_resp = client.complete_json(
            step="critic",
            system=CRITIC_SYSTEM,
            user=user,
            schema=_CriticResponse,
            temperature=1.0,  # gpt-5 is temp-locked anyway; explicit for clarity
            max_tokens=3000,
        )
    except Exception:
        # Critic failure is non-fatal — we keep analyzer's verdicts and move on.
        return report

    by_index: dict[int, _CriticVerdict] = {v.gap_index: v for v in critic_resp.verdicts}
    for i, gap in enumerate(report.gaps):
        v = by_index.get(i)
        if not v:
            continue
        if v.verdict == "supported":
            gap.verdict = "strong" if gap.verdict != "flagged" else "flagged"
        elif v.verdict == "structural":
            gap.verdict = "structural"
        elif v.verdict == "weak":
            gap.verdict = "weak"
        elif v.verdict == "contradicted":
            gap.verdict = "flagged"
        gap.critic_notes = v.critic_notes
    return report
