from ..clients.llm import LLMClient
from ..prompts import ADEQUACY_SYSTEM
from ..schemas import PlatformAdequacy, Reframe


def assess_adequacy(client: LLMClient, reframe: Reframe) -> PlatformAdequacy:
    user = (
        f"Job-to-be-done: {reframe.job_to_be_done}\n\n"
        f"User-language description:\n{reframe.user_language_rephrase}\n\n"
        "Underlying pain hypotheses:\n"
        + "\n".join(f"- {p}" for p in reframe.pain_hypotheses)
    )
    result = client.complete_json(
        step="adequacy",
        system=ADEQUACY_SYSTEM,
        user=user,
        schema=PlatformAdequacy,
    )
    # Enforce schema expectation: the two low-adequacy hypotheses must be
    # present when level == "low", and must be absent otherwise. The model
    # sometimes fills them even on high/medium; drop to stay honest.
    if result.level != "low":
        result.wrong_platform_hypothesis = None
        result.no_demand_hypothesis = None
    return result
