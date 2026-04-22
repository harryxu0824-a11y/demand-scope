import json
import threading
from datetime import date
from pathlib import Path

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings


_LOCK = threading.Lock()
_bearer = HTTPBearer(auto_error=False)


def _quota_file_for(d: date) -> Path:
    return settings.cache_dir / f"quota_{d.isoformat()}.json"


def _ip_quota_file_for(d: date) -> Path:
    return settings.cache_dir / f"ip_quota_{d.isoformat()}.json"


def _read_json_counts(path: Path) -> dict[str, int]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _write_json_counts(path: Path, data: dict[str, int]) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data))
    tmp.replace(path)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def require_token(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")
    token = creds.credentials.strip()
    if token not in settings.access_tokens:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return token


def consume_quota(token: str, request: Request) -> None:
    today = date.today()
    ip = _client_ip(request)
    token_path = _quota_file_for(today)
    ip_path = _ip_quota_file_for(today)
    with _LOCK:
        token_usage = _read_json_counts(token_path)
        ip_usage = _read_json_counts(ip_path)

        ip_count = ip_usage.get(ip, 0)
        if ip_count >= settings.ip_daily_limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Daily limit ({settings.ip_daily_limit} requests) reached for your network. "
                "Come back tomorrow, or self-host from the GitHub repo.",
            )

        token_count = token_usage.get(token, 0)
        if token_count >= settings.daily_quota_per_token:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Daily quota ({settings.daily_quota_per_token}) exceeded for this token",
            )

        token_usage[token] = token_count + 1
        ip_usage[ip] = ip_count + 1
        _write_json_counts(token_path, token_usage)
        _write_json_counts(ip_path, ip_usage)
