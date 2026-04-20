#!/usr/bin/env python3
"""End-to-end smoke test. Run after backend startup to confirm basic plumbing.

Usage:
    source .venv/bin/activate
    python scripts/smoke.py

Env vars:
    SMOKE_BASE   base URL of running backend (default: http://localhost:8000)
    SMOKE_TOKEN  one of the APP_ACCESS_TOKENS from .env
    SMOKE_LLM    set to 1 to also test a live LLM roundtrip (costs a few tokens)
"""
from __future__ import annotations

import os
import sys

import httpx

BASE = os.getenv("SMOKE_BASE", "http://localhost:8000").rstrip("/")
TOKEN = os.getenv("SMOKE_TOKEN", "token_harry_change_me")
TEST_LLM = os.getenv("SMOKE_LLM") == "1"


def check(name: str, cond: bool, detail: str = "") -> bool:
    mark = "\033[32m✓\033[0m" if cond else "\033[31m✗\033[0m"
    line = f"{mark} {name}"
    if detail:
        line += f"  \033[2m{detail}\033[0m"
    print(line)
    return cond


def run() -> int:
    ok = True

    try:
        r = httpx.get(f"{BASE}/api/health", timeout=5)
        ok &= check("health 200", r.status_code == 200, str(r.json()))
    except Exception as e:
        ok &= check("health 200", False, f"{type(e).__name__}: {e}")
        return 1  # backend unreachable, skip the rest

    r = httpx.get(f"{BASE}/api/me", timeout=5)
    ok &= check("me rejects missing token", r.status_code == 401)

    r = httpx.get(f"{BASE}/api/me", headers={"Authorization": "Bearer wrong"}, timeout=5)
    ok &= check("me rejects bad token", r.status_code == 401)

    r = httpx.get(f"{BASE}/api/me", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5)
    ok &= check(
        "me accepts real token",
        r.status_code == 200,
        str(r.json()) if r.status_code == 200 else r.text,
    )

    if TEST_LLM:
        # Hit the gateway with a cheap deterministic model (deepseek) to verify
        # token + base_url + network path. We don't use gemini-2.5-pro here because
        # it sometimes returns empty content on trivial prompts (safety filters),
        # which would flap this health check independent of real pipeline health.
        try:
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from openai import OpenAI
            from app.config import settings as cfg
            raw_client = OpenAI(
                api_key=cfg.ai_builder_token,
                base_url=f"{cfg.ai_builder_base_url}/v1",
            )
            resp = raw_client.chat.completions.create(
                model="deepseek",
                messages=[{"role": "user", "content": "say the word pong"}],
                max_tokens=10,
            )
            text = (resp.choices[0].message.content or "").strip()
            ok &= check("llm gateway reachable", "pong" in text.lower(), text[:60])
        except Exception as e:
            ok &= check("llm gateway reachable", False, f"{type(e).__name__}: {e}")

        desc = (
            "An AI tool that helps patients remember what their doctors said after "
            "appointments. It records the visit and produces a plain-language summary of "
            "the plan, side effects to watch for, and when to follow up."
        )
        r = httpx.post(
            f"{BASE}/api/reframe",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={"description": desc},
            timeout=60,
        )
        if r.status_code == 200:
            reframe_data = r.json()
            fields_present = all(
                k in reframe_data
                for k in ("job_to_be_done", "user_language_rephrase", "pain_hypotheses")
            )
            nonempty = (
                bool(reframe_data.get("job_to_be_done"))
                and bool(reframe_data.get("user_language_rephrase"))
                and len(reframe_data.get("pain_hypotheses") or []) >= 1
            )
            ok &= check(
                "reframe returns valid schema",
                fields_present and nonempty,
                f"jtbd={reframe_data.get('job_to_be_done','')[:60]}…",
            )

            r2 = httpx.post(
                f"{BASE}/api/adequacy",
                headers={"Authorization": f"Bearer {TOKEN}"},
                json={"reframe": reframe_data},
                timeout=60,
            )
            if r2.status_code == 200:
                adq = r2.json()
                level_ok = adq.get("level") in ("high", "medium", "low")
                required = ("level", "target_audience", "reddit_fit_rationale")
                shape_ok = all(adq.get(k) for k in required)
                if adq.get("level") == "low":
                    shape_ok = shape_ok and bool(adq.get("wrong_platform_hypothesis")) and bool(
                        adq.get("no_demand_hypothesis")
                    )
                ok &= check(
                    "adequacy returns valid schema",
                    level_ok and shape_ok,
                    f"level={adq.get('level')} audience={adq.get('target_audience','')[:50]}…",
                )

                override = adq.get("level") == "low"
                r3 = httpx.post(
                    f"{BASE}/api/run-reddit",
                    headers={"Authorization": f"Bearer {TOKEN}"},
                    json={
                        "reframe": reframe_data,
                        "adequacy": adq,
                        "override_low_adequacy": override,
                    },
                    timeout=300,
                )
                if r3.status_code == 200:
                    rep = r3.json()
                    level_in = rep.get("demand_level") in ("peak", "moderate", "low")
                    type_in = rep.get("demand_type") in ("unmet-supply", "unknown", "satisfied")
                    gaps = rep.get("gaps") or []
                    ok &= check(
                        "run-reddit returns valid report",
                        level_in and type_in and isinstance(gaps, list),
                        f"demand_level={rep.get('demand_level')} gaps={len(gaps)}",
                    )
                else:
                    ok &= check(
                        "run-reddit returns valid report",
                        False,
                        f"{r3.status_code} {r3.text[:200]}",
                    )
            else:
                ok &= check(
                    "adequacy returns valid schema",
                    False,
                    f"{r2.status_code} {r2.text[:120]}",
                )
        else:
            ok &= check("reframe returns valid schema", False, f"{r.status_code} {r.text[:120]}")

    print()
    if ok:
        print("\033[32mAll checks passed.\033[0m")
    else:
        print("\033[31mSome checks failed.\033[0m")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(run())
