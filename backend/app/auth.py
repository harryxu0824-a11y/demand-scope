import json
import threading
from datetime import date
from pathlib import Path

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings


_LOCK = threading.Lock()
_bearer = HTTPBearer(auto_error=False)


def _quota_file_for(d: date) -> Path:
    return settings.cache_dir / f"quota_{d.isoformat()}.json"


def _read_usage(d: date) -> dict[str, int]:
    path = _quota_file_for(d)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _write_usage(d: date, usage: dict[str, int]) -> None:
    path = _quota_file_for(d)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(usage))
    tmp.replace(path)


def require_token(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")
    token = creds.credentials.strip()
    if token not in settings.access_tokens:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return token


def consume_quota(token: str) -> None:
    today = date.today()
    with _LOCK:
        usage = _read_usage(today)
        current = usage.get(token, 0)
        if current >= settings.daily_quota_per_token:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Daily quota ({settings.daily_quota_per_token}) exceeded for this token",
            )
        usage[token] = current + 1
        _write_usage(today, usage)
