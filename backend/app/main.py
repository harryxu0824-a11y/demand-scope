import json
import queue as queue_mod
import sys
import threading
import traceback

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .auth import consume_quota, require_token
from .clients.llm import LLMClient
from .config import settings
from .pipeline.adequacy import assess_adequacy
from .pipeline.orchestrator import PipelineError, run_reddit_analysis
from .pipeline.reframer import reframe
from .schemas import (
    AdequacyRequest,
    DemandReport,
    PlatformAdequacy,
    Reframe,
    ReframeRequest,
    RunRedditRequest,
)

app = FastAPI(title="demand-scope", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

_llm = LLMClient()


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(
        f"[{request.method} {request.url.path}] UNHANDLED {type(exc).__name__}: {exc}",
        file=sys.stderr,
        flush=True,
    )
    traceback.print_exc(file=sys.stderr)
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/me")
def me(token: str = Depends(require_token)) -> dict[str, object]:
    return {
        "token_prefix": token[:8] + "…",
        "reddit_source": settings.reddit_source,
        "models": settings.model_for,
    }


@app.post("/api/reframe", response_model=Reframe)
def reframe_endpoint(
    req: ReframeRequest,
    request: Request,
    token: str = Depends(require_token),
) -> Reframe:
    desc = req.description.strip()
    if len(desc) < 30:
        raise HTTPException(400, "Description too short (min 30 chars)")
    if len(desc) > settings.max_input_chars_per_analysis:
        raise HTTPException(400, "Description too long")
    consume_quota(token, request)
    try:
        return reframe(_llm, desc)
    except Exception as e:
        raise HTTPException(502, f"Reframer failed: {e}") from e


@app.post("/api/adequacy", response_model=PlatformAdequacy)
def adequacy_endpoint(
    req: AdequacyRequest,
    request: Request,
    token: str = Depends(require_token),
) -> PlatformAdequacy:
    consume_quota(token, request)
    try:
        return assess_adequacy(_llm, req.reframe)
    except Exception as e:
        raise HTTPException(502, f"Adequacy failed: {e}") from e


@app.post("/api/run-reddit")
def run_reddit_endpoint(
    req: RunRedditRequest,
    request: Request,
    token: str = Depends(require_token),
):
    if req.adequacy.level == "low" and not req.override_low_adequacy:
        raise HTTPException(
            400,
            "Low platform adequacy requires override_low_adequacy=true",
        )
    consume_quota(token, request)
    try:
        report = run_reddit_analysis(
            _llm,
            req.reframe,
            req.adequacy,
            override_low_adequacy=req.override_low_adequacy,
        )
    except PipelineError as e:
        raise HTTPException(502, str(e)) from e
    except Exception as e:
        print(f"[run-reddit] PIPELINE error: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(502, f"Reddit analysis failed: {type(e).__name__}: {e}") from e

    try:
        return jsonable_encoder(report)
    except Exception as e:
        print(f"[run-reddit] SERIALIZATION error: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            500, f"Response serialization failed: {type(e).__name__}: {e}"
        ) from e


@app.post("/api/run-reddit/stream")
def run_reddit_stream_endpoint(
    req: RunRedditRequest,
    request: Request,
    token: str = Depends(require_token),
):
    """Streams coarse phase events via SSE, ending with the full report.

    Event formats (one JSON object per SSE `data:` line):
      {"type": "phase", "phase": "...", "status": "start"}
      {"type": "phase", "phase": "...", "status": "done", "elapsed_ms": N}
      {"type": "complete", "report": {...full DemandReport...}}
      {"type": "error", "message": "..."}
    """
    if req.adequacy.level == "low" and not req.override_low_adequacy:
        raise HTTPException(
            400,
            "Low platform adequacy requires override_low_adequacy=true",
        )
    consume_quota(token, request)

    q: queue_mod.Queue = queue_mod.Queue()
    _SENTINEL = object()

    def worker():
        def emit(event):
            q.put(event)

        try:
            report = run_reddit_analysis(
                _llm,
                req.reframe,
                req.adequacy,
                override_low_adequacy=req.override_low_adequacy,
                on_event=emit,
            )
            q.put({"type": "complete", "report": jsonable_encoder(report)})
        except PipelineError as e:
            q.put({"type": "error", "message": str(e), "step": e.step})
        except Exception as e:
            print(
                f"[run-reddit/stream] UNHANDLED {type(e).__name__}: {e}",
                file=sys.stderr,
                flush=True,
            )
            traceback.print_exc(file=sys.stderr)
            q.put({"type": "error", "message": f"{type(e).__name__}: {e}"})
        finally:
            q.put(_SENTINEL)

    threading.Thread(target=worker, daemon=True).start()

    def gen():
        while True:
            event = q.get()
            if event is _SENTINEL:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
