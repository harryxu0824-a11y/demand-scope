import json
import re
from typing import Any, Iterator, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from ..config import settings


T = TypeVar("T", bound=BaseModel)


TEMP_LOCKED_MODELS = {"gpt-5", "kimi-k2.5"}
MAX_COMPLETION_TOKENS_MODELS = {"gpt-5"}


def _coerce_params(model: str, temperature: float, max_tokens: int | None) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if model in TEMP_LOCKED_MODELS:
        params["temperature"] = 1.0
    else:
        params["temperature"] = temperature
    if max_tokens is not None:
        if model in MAX_COMPLETION_TOKENS_MODELS:
            params["max_completion_tokens"] = max(max_tokens, 1000)
        else:
            params["max_tokens"] = max_tokens
    return params


class LLMClient:
    def __init__(self) -> None:
        self._client = OpenAI(
            api_key=settings.ai_builder_token,
            base_url=f"{settings.ai_builder_base_url}/v1",
        )

    def _model_for(self, step: str) -> str:
        try:
            return settings.model_for[step]
        except KeyError as e:
            raise ValueError(f"Unknown pipeline step: {step}") from e

    def complete_text(
        self,
        *,
        step: str,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_tokens: int | None = 4096,
    ) -> str:
        model = self._model_for(step)
        params = _coerce_params(model, temperature, max_tokens)
        resp = self._client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            **params,
        )
        return resp.choices[0].message.content or ""

    def complete_json(
        self,
        *,
        step: str,
        system: str,
        user: str,
        schema: Type[T],
        temperature: float = 0.0,
        max_tokens: int | None = 4096,
        max_retries: int = 2,
    ) -> T:
        """Request JSON output and validate against a Pydantic schema.

        Tries native JSON mode first. Falls back to raw parse on models that
        don't support response_format or on validation failure.
        """
        model = self._model_for(step)
        params = _coerce_params(model, temperature, max_tokens)
        hardened_system = (
            system
            + "\n\nRespond with a single JSON object matching the schema. "
            + "No prose, no markdown, no code fences."
        )
        messages = [
            {"role": "system", "content": hardened_system},
            {"role": "user", "content": user},
        ]

        last_err: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    **params,
                )
            except Exception:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **params,
                )
            raw = resp.choices[0].message.content or ""
            try:
                data = _extract_json(raw)
                return schema.model_validate(data)
            except (json.JSONDecodeError, ValidationError) as e:
                last_err = e
                messages.append({"role": "assistant", "content": raw})
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            f"Your previous response failed validation: {e}. "
                            "Return only the JSON object matching the schema."
                        ),
                    }
                )
        raise RuntimeError(f"complete_json failed after retries: {last_err}")

    def stream_text(
        self,
        *,
        step: str,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_tokens: int | None = 4096,
    ) -> Iterator[str]:
        model = self._model_for(step)
        params = _coerce_params(model, temperature, max_tokens)
        stream = self._client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            stream=True,
            **params,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta


def _extract_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}|\[.*\]", text, re.DOTALL)
    if match:
        text = match.group(0)
    return json.loads(text)
