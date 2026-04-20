from ..clients.llm import LLMClient
from ..prompts import REFRAMER_SYSTEM
from ..schemas import Reframe


def reframe(client: LLMClient, description: str) -> Reframe:
    return client.complete_json(
        step="reframer",
        system=REFRAMER_SYSTEM,
        user=description.strip(),
        schema=Reframe,
    )
