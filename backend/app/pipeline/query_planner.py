from ..clients.llm import LLMClient
from ..prompts import QUERY_PLANNER_SYSTEM
from ..schemas import QueryPlan, Reframe


def plan_queries(client: LLMClient, reframe: Reframe) -> QueryPlan:
    user = (
        f"Job-to-be-done: {reframe.job_to_be_done}\n\n"
        f"User-language description:\n{reframe.user_language_rephrase}\n\n"
        "Underlying pain hypotheses:\n"
        + "\n".join(f"- {p}" for p in reframe.pain_hypotheses)
    )
    return client.complete_json(
        step="query_planner",
        system=QUERY_PLANNER_SYSTEM,
        user=user,
        schema=QueryPlan,
    )
