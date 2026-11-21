"""TikTok Login Kit + Display API for opt-in taste personalization only.

Not a venue discovery source. Tokens live in a separate session store, never the public TTL cache.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import sqlite3
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse

ROOT = Path(__file__).resolve().parents[2]
SESSION_DB = Path(os.getenv("TIKTOK_SESSION_DB", str(ROOT / ".cache" / "tiktok-sessions.sqlite3")))
SESSION_COOKIE = "bb_tiktok_session"
STATE_COOKIE = "bb_tiktok_oauth_state"
PKCE_COOKIE = "bb_tiktok_pkce"
SESSION_TTL_S = 7 * 24 * 3600
SCOPES = "user.info.basic,video.list"
AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/"

# Map free-text tokens from video titles/descriptions onto venue category slugs used by scoring.
TAG_KEYWORDS: dict[str, str] = {
    "ramen": "noodles",
    "noodle": "noodles",
    "noodles": "noodles",
    "pho": "noodles",
    "pizza": "pizza",
    "coffee": "cafe",
    "cafe": "cafe",
    "bakery": "cafe",
    "espresso": "cafe",
    "park": "park",
    "garden": "park",
    "outdoors": "park",
    "bar": "bar",
    "cocktail": "bar",
    "pub": "bar",
    "club": "night_club",
    "nightlife": "night_club",
    "dj": "night_club",
    "restaurant": "restaurant",
    "dinner": "restaurant",
    "seafood": "restaurant",
    "sushi": "restaurant",
    "cozy": "cafe",
    "live_music": "bar",
    "music": "bar",
}

DEMO_TAGS = [
    {"tag": "noodles", "count": 4},
    {"tag": "cafe", "count": 3},
    {"tag": "bar", "count": 2},
]

router = APIRouter(prefix="/api/tiktok", tags=["tiktok"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _client_key() -> str | None:
    return os.getenv("TIKTOK_CLIENT_KEY") or None


def _client_secret() -> str | None:
    return os.getenv("TIKTOK_CLIENT_SECRET") or None


def _redirect_uri() -> str:
    # Prefer the frontend origin so the session cookie is set on the same host the UI calls (Vite proxy in local dev).
    return os.getenv("TIKTOK_REDIRECT_URI", "http://localhost:5173/api/tiktok/callback")


def _frontend_origin() -> str:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    return origins[0].strip() or "http://localhost:5173"


def configured() -> bool:
    return bool(_client_key() and _client_secret())


def init_session_db() -> None:
    SESSION_DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(SESSION_DB) as db:
        db.execute(
            """CREATE TABLE IF NOT EXISTS sessions(
                id TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                open_id TEXT,
                expires_at REAL,
                created_at REAL
            )"""
        )


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    import base64

    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def normalize_tag_token(token: str) -> str | None:
    cleaned = re.sub(r"[^a-z0-9_]+", "", token.lower().replace("-", "_").replace(" ", "_"))
    if not cleaned:
        return None
    if cleaned in TAG_KEYWORDS:
        return TAG_KEYWORDS[cleaned]
    for key, slug in TAG_KEYWORDS.items():
        if key in cleaned or cleaned in key:
            return slug
    return None


def extract_tags_from_videos(videos: list[dict[str, Any]], limit: int = 8) -> list[dict[str, str | int]]:
    counts: Counter[str] = Counter()
    for video in videos:
        parts = [
            str(video.get("title") or ""),
            str(video.get("video_description") or ""),
        ]
        text = " ".join(parts).lower()
        hashtags = re.findall(r"#([a-z0-9_]+)", text)
        words = re.findall(r"[a-z][a-z0-9_]{2,}", text)
        for token in hashtags + words:
            slug = normalize_tag_token(token)
            if slug:
                counts[slug] += 1
    return [{"tag": tag, "count": count} for tag, count in counts.most_common(limit)]


def _set_session(session_id: str, access_token: str, refresh_token: str | None, open_id: str | None, expires_in: int) -> None:
    init_session_db()
    with sqlite3.connect(SESSION_DB) as db:
        db.execute(
            "INSERT OR REPLACE INTO sessions VALUES(?,?,?,?,?,?)",
            (session_id, access_token, refresh_token, open_id, time.time() + max(expires_in, 60), time.time()),
        )


def _get_session(session_id: str | None) -> dict[str, Any] | None:
    if not session_id:
        return None
    init_session_db()
    with sqlite3.connect(SESSION_DB) as db:
        row = db.execute(
            "SELECT access_token, refresh_token, open_id, expires_at FROM sessions WHERE id=?",
            (session_id,),
        ).fetchone()
    if not row:
        return None
    if row[3] and row[3] < time.time():
        _clear_session(session_id)
        return None
    return {"access_token": row[0], "refresh_token": row[1], "open_id": row[2], "expires_at": row[3]}


def _clear_session(session_id: str | None) -> None:
    if not session_id:
        return
    init_session_db()
    with sqlite3.connect(SESSION_DB) as db:
        db.execute("DELETE FROM sessions WHERE id=?", (session_id,))


def _cookie_kwargs() -> dict[str, Any]:
    return {"httponly": True, "samesite": "lax", "secure": os.getenv("TIKTOK_COOKIE_SECURE", "").lower() in ("1", "true"), "path": "/"}


@router.get("/login")
async def tiktok_login(response: Response) -> RedirectResponse:
    """Start OAuth with PKCE. In demo mode without keys, bounce back with a demo flag."""
    if not configured():
        # Demo path: no TikTok developer app configured.
        dest = f"{_frontend_origin()}/?tiktok=demo"
        return RedirectResponse(dest, status_code=302)

    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    challenge = _pkce_challenge(verifier)
    params = {
        "client_key": _client_key(),
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": _redirect_uri(),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    redirect = RedirectResponse(f"{AUTH_URL}?{urlencode(params)}", status_code=302)
    redirect.set_cookie(STATE_COOKIE, state, max_age=600, **_cookie_kwargs())
    redirect.set_cookie(PKCE_COOKIE, verifier, max_age=600, **_cookie_kwargs())
    return redirect


@router.get("/callback")
async def tiktok_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None) -> RedirectResponse:
    if error:
        return RedirectResponse(f"{_frontend_origin()}/?tiktok=error", status_code=302)
    expected = request.cookies.get(STATE_COOKIE)
    verifier = request.cookies.get(PKCE_COOKIE)
    if not code or not state or state != expected or not verifier:
        return RedirectResponse(f"{_frontend_origin()}/?tiktok=error", status_code=302)
    if not configured():
        return RedirectResponse(f"{_frontend_origin()}/?tiktok=demo", status_code=302)

    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
        token_resp = await client.post(
            TOKEN_URL,
            data={
                "client_key": _client_key(),
                "client_secret": _client_secret(),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": _redirect_uri(),
                "code_verifier": verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_resp.status_code >= 400:
        return RedirectResponse(f"{_frontend_origin()}/?tiktok=error", status_code=302)
    payload = token_resp.json()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    access = data.get("access_token")
    if not access:
        return RedirectResponse(f"{_frontend_origin()}/?tiktok=error", status_code=302)

    session_id = secrets.token_urlsafe(32)
    _set_session(
        session_id,
        access,
        data.get("refresh_token"),
        data.get("open_id"),
        int(data.get("expires_in") or 86400),
    )
    redirect = RedirectResponse(f"{_frontend_origin()}/?tiktok=connected", status_code=302)
    redirect.set_cookie(SESSION_COOKIE, session_id, max_age=SESSION_TTL_S, **_cookie_kwargs())
    redirect.delete_cookie(STATE_COOKIE, path="/")
    redirect.delete_cookie(PKCE_COOKIE, path="/")
    return redirect


async def _fetch_videos(access_token: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
        resp = await client.post(
            VIDEO_LIST_URL,
            params={"fields": "id,title,video_description,create_time"},
            json={"max_count": 20},
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
    if resp.status_code >= 400:
        return []
    body = resp.json()
    videos = (body.get("data") or {}).get("videos") or []
    return videos if isinstance(videos, list) else []


def preferences_payload(tags: list[dict[str, str | int]], status: str, detail: str = "") -> dict[str, Any]:
    return {
        "connected": status in ("live", "demo"),
        "mode": status,
        "tags": tags,
        "preference_tags": [t["tag"] for t in tags],
        "detail": detail,
        "sources_used": [
            {
                "source": "tiktok",
                "status": status,
                "observed_at": _now_iso() if status in ("live", "demo") else None,
                "cache_age_s": None,
                "attribution": [{"source": "tiktok", "text": "TikTok Display API (user-authorized)", "url": "https://developers.tiktok.com/"}],
            }
        ],
        "generated_at": _now_iso(),
    }


def _touch_health(status: str, detail: str = "") -> None:
    """Best-effort update of shared HEALTH without importing app.main (avoids circular import)."""
    try:
        from app import main as app_main

        app_main.HEALTH["tiktok"].update(
            status=status,
            checked_at=_now_iso(),
            last_success_at=_now_iso() if status in ("live", "demo") else app_main.HEALTH["tiktok"].get("last_success_at"),
            detail=detail,
        )
    except Exception:
        pass


@router.get("/preferences")
async def tiktok_preferences(request: Request) -> dict[str, Any]:
    """Return taste tags from the connected user's videos, or demo fixtures."""
    demo_mode = os.getenv("APP_MODE", "demo") == "demo"
    session = _get_session(request.cookies.get(SESSION_COOKIE))

    if demo_mode and not session:
        # Allow explicit demo personalization without OAuth when APP_MODE=demo.
        if request.query_params.get("demo") == "1" or request.cookies.get("bb_tiktok_demo") == "1":
            _touch_health("demo", "Demo TikTok taste fixtures")
            return preferences_payload(DEMO_TAGS, "demo", "Demo TikTok taste fixtures")
        return preferences_payload([], "disabled", "Not connected")

    if not session:
        if not configured():
            _touch_health("disabled", "TIKTOK_CLIENT_KEY is not configured")
            return preferences_payload([], "disabled", "TIKTOK_CLIENT_KEY is not configured")
        return preferences_payload([], "disabled", "Not connected")

    videos = await _fetch_videos(session["access_token"])
    tags = extract_tags_from_videos(videos)
    if not tags and demo_mode:
        _touch_health("demo", "Connected session with empty video list; demo tags")
        return preferences_payload(DEMO_TAGS, "demo", "Connected session with empty video list; demo tags")
    status = "live" if tags else "disabled"
    _touch_health(status, "" if tags else "No mappable tags from videos")
    return preferences_payload(tags, status, "" if tags else "No mappable tags from videos")


@router.post("/logout")
async def tiktok_logout(request: Request, response: Response) -> dict[str, str]:
    _clear_session(request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie("bb_tiktok_demo", path="/")
    return {"status": "ok"}


@router.post("/demo")
async def tiktok_demo_enable(response: Response) -> dict[str, Any]:
    """Enable demo TikTok taste fixtures when APP_MODE=demo or Login Kit is not configured."""
    demo_mode = os.getenv("APP_MODE", "demo") == "demo"
    if not demo_mode and configured():
        return preferences_payload([], "disabled", "Use Login Kit in live mode")
    response.set_cookie("bb_tiktok_demo", "1", max_age=SESSION_TTL_S, **_cookie_kwargs())
    _touch_health("demo", "Demo TikTok taste fixtures")
    return preferences_payload(DEMO_TAGS, "demo", "Demo TikTok taste fixtures")
