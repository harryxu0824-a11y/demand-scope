import re
import sys

from ..schemas import DemandReport, Evidence, Gap, RedditItem


_PUNCT = re.compile(r"[^\w\s]")
_WS = re.compile(r"\s+")


def _normalize(text: str) -> str:
    text = text.lower()
    text = _PUNCT.sub(" ", text)
    text = _WS.sub(" ", text).strip()
    return text


def _source_text(item: RedditItem) -> str:
    if item.title:
        return f"{item.title} {item.body}"
    return item.body


def _quote_matches(quote_norm: str, source_norm: str) -> bool:
    """Direct substring is ideal. Fall back: accept if at least 40 chars of
    a contiguous prefix of the quote appears in the source. This forgives LLM
    trailing ellipsis or one-word drift without letting free invention through.
    """
    if not quote_norm:
        return False
    if quote_norm in source_norm:
        return True
    n = len(quote_norm)
    # Walk back from the full quote; require at least 40 chars OR 70% of quote,
    # whichever is smaller, to still be present as a prefix.
    min_chars = min(40, max(20, int(n * 0.7)))
    for cut in range(n, min_chars - 1, -1):
        if quote_norm[:cut] in source_norm:
            return True
    return False


def validate_report(report: DemandReport, corpus: list[RedditItem]) -> DemandReport:
    """Enforce hard anti-hallucination rules. No LLM involved.

    - Evidence.evidence_id must be in the corpus.
    - Evidence.quote (normalized) must substantially match the source item's
      normalized title+body. Punctuation / whitespace / trailing truncation
      are tolerated; free invention is not.
    - Each Gap must retain >=2 evidence drawn from distinct (parent_id, author)
      pairs. Otherwise the gap is demoted to 'anecdotal'.
    - Gaps with zero surviving evidence are dropped.

    STRUCTURAL EXEMPTION: gaps the critic labeled "structural" are NOT subject
    to the anecdotal downgrade rule. Structural observations are rare on
    Reddit; statistical-independence rules designed for pain-signal validation
    would incorrectly suppress strategically significant but sparse signals.
    The content floor for "structural" is enforced in the critic prompt
    (at least one quote must articulate a market-structure dimension), and
    the critic's rationale is surfaced to the user via critic_notes so they
    can evaluate the judgment themselves. See DECISIONS.md.
    """
    by_id: dict[str, RedditItem] = {it.evidence_id: it for it in corpus}
    normalized_source: dict[str, str] = {
        k: _normalize(_source_text(v)) for k, v in by_id.items()
    }

    dropped_evidence = 0
    dropped_gaps = 0
    validated_gaps: list[Gap] = []
    for gap in report.gaps:
        kept: list[Evidence] = []
        for ev in gap.evidence:
            item = by_id.get(ev.evidence_id)
            if not item:
                dropped_evidence += 1
                continue
            if not _quote_matches(_normalize(ev.quote), normalized_source[ev.evidence_id]):
                dropped_evidence += 1
                continue
            ev.permalink = item.permalink
            ev.score = item.score
            ev.author = item.author
            kept.append(ev)

        if not kept:
            dropped_gaps += 1
            continue

        distinct: set[tuple[str, str]] = set()
        for ev in kept:
            item = by_id[ev.evidence_id]
            parent_key = item.parent_id or item.evidence_id
            distinct.add((parent_key, item.author))

        gap.evidence = kept
        if len(distinct) < 2 and gap.verdict != "structural":
            gap.verdict = "anecdotal"
        validated_gaps.append(gap)

    print(
        f"[validator] in={len(report.gaps)} gaps, kept={len(validated_gaps)}, "
        f"dropped_gaps={dropped_gaps}, dropped_evidence={dropped_evidence}",
        file=sys.stderr,
        flush=True,
    )
    report.gaps = validated_gaps
    return report
