from typing import Literal
from pydantic import BaseModel, Field


class RedditItem(BaseModel):
    evidence_id: str
    kind: Literal["post", "comment"]
    subreddit: str
    title: str | None = None
    body: str
    author: str
    score: int
    permalink: str
    created_utc: int
    parent_id: str | None = None


class Evidence(BaseModel):
    evidence_id: str
    quote: str
    permalink: str
    score: int
    author: str


class Gap(BaseModel):
    description: str
    evidence: list[Evidence] = Field(default_factory=list)
    # "structural" is for sparse-but-clear signal: few quotes, each
    # independently describing a market-structure observation (distribution
    # mismatch, underserved segment, access barrier, pricing gap). These
    # are scarce on Reddit and should NOT be demoted to "weak" purely on
    # count. Critic owns this elevation.
    verdict: Literal[
        "strong", "structural", "weak", "flagged", "anecdotal"
    ] = "weak"
    critic_notes: str | None = None


class Reframe(BaseModel):
    job_to_be_done: str
    user_language_rephrase: str
    pain_hypotheses: list[str]


class PlatformAdequacy(BaseModel):
    level: Literal["high", "medium", "low"]
    headline_summary: str = ""
    target_audience: str
    where_audience_actually_is: list[str]
    reddit_fit_rationale: str
    recommended_alternative_sources: list[str] = Field(default_factory=list)
    wrong_platform_hypothesis: str | None = None
    no_demand_hypothesis: str | None = None


class TraceStep(BaseModel):
    step: str                       # internal name: query_planner / harvester / analyzer / critic / validator
    phase: str                      # user-facing phase: understanding_market / gathering_signal / analyzing_demand / verifying_evidence
    model: str | None = None        # None for non-LLM steps (harvester, validator)
    started_at: float               # unix epoch seconds
    elapsed_ms: int
    input_preview: str = ""         # truncated to 500 chars
    output_preview: str = ""        # truncated to 500 chars
    metadata: dict = Field(default_factory=dict)


EmptyReason = Literal["no_discussion", "search_mismatch", "signal_too_weak"]


class DemandReport(BaseModel):
    adequacy: PlatformAdequacy
    reframe: Reframe
    demand_level: Literal["peak", "moderate", "low"]
    demand_level_rationale: str
    demand_type: Literal["unmet-supply", "unknown", "satisfied"]
    demand_type_rationale: str
    gaps: list[Gap] = Field(default_factory=list)
    confidence: Literal["high", "medium", "low"] | None = None
    low_adequacy_override: bool = False
    # When set, the pipeline short-circuited because no usable Reddit signal surfaced.
    # Frontend renders ZeroSignalCard and suppresses demand_level / demand_type / gaps.
    empty_reason: EmptyReason | None = None
    empty_reason_details: dict = Field(default_factory=dict)
    trace: list[TraceStep] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    description: str
    user_language_override: str | None = None
    run_anyway_on_low_adequacy: bool = False
    force_refresh: bool = False


class ReframeRequest(BaseModel):
    description: str


class AdequacyRequest(BaseModel):
    reframe: Reframe


class QueryPlan(BaseModel):
    positive_keywords: list[str]
    pain_keywords: list[str]
    candidate_subreddits: list[str]


class RunRedditRequest(BaseModel):
    reframe: Reframe
    adequacy: PlatformAdequacy
    override_low_adequacy: bool = False


class AnalyzerOutput(BaseModel):
    """Narrow schema the analyzer must produce. The orchestrator assembles
    the full DemandReport around this so the LLM doesn't have to faithfully
    echo the nested reframe/adequacy objects (which it fails at)."""

    demand_level: Literal["peak", "moderate", "low"]
    demand_level_rationale: str
    demand_type: Literal["unmet-supply", "unknown", "satisfied"]
    demand_type_rationale: str
    gaps: list[Gap] = Field(default_factory=list)
    confidence: Literal["high", "medium", "low"]
