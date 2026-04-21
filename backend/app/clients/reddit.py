import hashlib
import json
import time
from pathlib import Path
from typing import Protocol

from ..config import settings
from ..schemas import RedditItem


class RedditSource(Protocol):
    def search(
        self,
        keywords: list[str],
        subreddits: list[str] | None = None,
        limit: int = 20,
    ) -> list[RedditItem]: ...


class MockRedditSource:
    """Returns fixture data based on keyword hints. Used until PRAW creds arrive."""

    def __init__(self, fixtures_dir: Path | None = None) -> None:
        self.fixtures_dir = fixtures_dir or Path(__file__).parent.parent / "fixtures"

    def search(
        self,
        keywords: list[str],
        subreddits: list[str] | None = None,
        limit: int = 20,
    ) -> list[RedditItem]:
        scenario = _pick_scenario(keywords)
        if scenario is None:
            return []
        path = self.fixtures_dir / f"{scenario}.json"
        if not path.exists():
            return []
        raw = json.loads(path.read_text())
        items = [RedditItem.model_validate(r) for r in raw]
        return items[:limit]


class PrawRedditSource:
    def __init__(self) -> None:
        import praw  # imported lazily so mock users don't need praw installed

        self._reddit = praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
        )

    def search(
        self,
        keywords: list[str],
        subreddits: list[str] | None = None,
        limit: int = 20,
    ) -> list[RedditItem]:
        cache_key = _cache_key(keywords, subreddits, limit)
        cache_file = settings.cache_dir / f"reddit_{cache_key}.json"
        if cache_file.exists() and _fresh(cache_file):
            raw = json.loads(cache_file.read_text())
            return [RedditItem.model_validate(r) for r in raw]

        items: list[RedditItem] = []
        targets = subreddits or ["all"]
        for kw in keywords:
            for sub in targets:
                for post in self._reddit.subreddit(sub).search(kw, limit=limit, sort="relevance"):
                    items.append(_post_to_item(post))
                    post.comments.replace_more(limit=0)
                    for comment in post.comments[:10]:
                        items.append(_comment_to_item(comment, post))

        seen: set[str] = set()
        deduped: list[RedditItem] = []
        for it in items:
            if it.evidence_id in seen:
                continue
            seen.add(it.evidence_id)
            deduped.append(it)

        cache_file.write_text(json.dumps([i.model_dump() for i in deduped]))
        return deduped


def get_reddit_source() -> RedditSource:
    if settings.reddit_source == "praw":
        return PrawRedditSource()
    return MockRedditSource()


def _pick_scenario(keywords: list[str]) -> str | None:
    joined = " ".join(keywords).lower()
    if any(w in joined for w in ["curtain", "decor", "nursery", "baby", "wedding"]):
        return "low_adequacy_curtains"
    if any(w in joined for w in ["medical", "health", "doctor", "patient", "clinic"]):
        return "unmet_supply_patient_notes"
    return None


def _cache_key(keywords: list[str], subs: list[str] | None, limit: int) -> str:
    payload = json.dumps({"k": sorted(keywords), "s": sorted(subs or []), "n": limit})
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def _fresh(path: Path) -> bool:
    age_days = (time.time() - path.stat().st_mtime) / 86400
    return age_days < settings.cache_ttl_days


def _post_to_item(post) -> RedditItem:
    return RedditItem(
        evidence_id=f"r_{post.id}",
        kind="post",
        subreddit=str(post.subreddit),
        title=post.title,
        body=(post.selftext or "")[:500],
        author=str(post.author) if post.author else "[deleted]",
        score=post.score,
        permalink=f"https://reddit.com{post.permalink}",
        created_utc=int(post.created_utc),
    )


def _comment_to_item(comment, post) -> RedditItem:
    return RedditItem(
        evidence_id=f"r_{comment.id}",
        kind="comment",
        subreddit=str(post.subreddit),
        title=None,
        body=(comment.body or "")[:300],
        author=str(comment.author) if comment.author else "[deleted]",
        score=comment.score,
        permalink=f"https://reddit.com{comment.permalink}",
        created_utc=int(comment.created_utc),
        parent_id=f"r_{post.id}",
    )
