"""Small, optional Neon persistence adapter for recommendation snapshots."""
from __future__ import annotations

import json
import os
import math
import asyncio
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

try:
    import asyncpg
except ImportError:  # Local demo mode can run without the optional database driver.
    asyncpg = None

_pool = None
_last_error: str | None = None
_catalog_status: dict[str, Any] = {"status": "not_checked"}


async def catalog_places(latitude: float, longitude: float) -> list[dict[str, Any]] | None:
    """Nearby OSM records; None means unavailable, [] means a successful empty query."""
    global _pool, _catalog_status
    if not configured():
        _catalog_status = {"status": "disabled"}
        return None
    try:
        async with asyncio.timeout(6):
            if _pool is None:
                _pool = await asyncpg.create_pool(
                    os.getenv("DATABASE_URL") or os.getenv("NEON_DATABASE_URL"),
                    min_size=0, max_size=4, command_timeout=4)
            # Bounding box narrows the scan; the shared candidate normalizer checks
            # the exact 5 km distance and requested opening hours afterwards.
            delta_lat = 5000 / 110000
            delta_lng = delta_lat / max(0.01, math.cos(math.radians(latitude)))
            rows = await _pool.fetch(
                """SELECT external_id,name,lat,lng,categories,details
                   FROM public.catalog_venues
                   WHERE source = 'overpass'
                     AND lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4
                   ORDER BY (lat-$5)*(lat-$5) + ((lng-$6)*$7)*((lng-$6)*$7), id
                   LIMIT 1000""",
                latitude-delta_lat, latitude+delta_lat,
                longitude-delta_lng, longitude+delta_lng, latitude, longitude,
                math.cos(math.radians(latitude)))
        places = []
        for row in rows:
            details = row["details"]
            details = json.loads(details) if isinstance(details, str) else dict(details or {})
            categories = row["categories"]
            categories = json.loads(categories) if isinstance(categories, str) else categories
            # Older catalog imports stored the type only in categories.
            if not any(details.get(k) for k in ("amenity", "leisure", "tourism")):
                details["amenity"] = next(iter(categories or []), "venue")
            places.append(dict(details, osm=row["external_id"], name=row["name"],
                               lat=row["lat"], lng=row["lng"]))
        _catalog_status = {"status": "connected", "nearby_count": len(places)}
        return places
    except Exception:
        # Never expose connection strings or database error details to clients.
        _catalog_status = {"status": "unavailable"}
        return None


def configured() -> bool:
    return bool(os.getenv("DATABASE_URL") or os.getenv("NEON_DATABASE_URL")) and asyncpg is not None


async def persist_recommendation_run(query: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    """Write one generated recommendation response; never make the API dependent on Neon."""
    global _pool, _last_error
    if not configured():
        return {"status": "disabled", "detail": "DATABASE_URL is not configured"}
    try:
        if _pool is None:
            url = os.getenv("DATABASE_URL") or os.getenv("NEON_DATABASE_URL")
            _pool = await asyncpg.create_pool(url, min_size=0, max_size=4, command_timeout=4)
        run_id = uuid4()
        requested_time = query["time"]
        if isinstance(requested_time, str):
            requested_time = datetime.fromisoformat(requested_time.replace("Z", "+00:00"))
        recommendations = response.get("recommendations", [])
        async with _pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO boundless.recommendation_runs
                      (id, requested_time, budget, latitude, longitude, max_walk_min, travel,
                       free_text, preference_tags, weather_override, app_mode, recommendation_count, response)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
                    """,
                    run_id, requested_time, query["budget"], query["lat"], query["lng"],
                    query["max_walk_min"], query.get("travel", "walk_t"), query.get("free_text"),
                    query.get("preference_tags", []), query.get("weather_override"),
                    os.getenv("APP_MODE", "demo"), len(recommendations), json.dumps(response, default=str),
                )
                for rank, item in enumerate(recommendations, 1):
                    venue = item.get("venue", {})
                    await conn.execute(
                        """
                        INSERT INTO boundless.recommendation_items
                          (run_id, rank, venue_id, venue_name, latitude, longitude, categories,
                           price_level, rating, review_count, walk_min, fit_score, reachability_method, item)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
                        """,
                        run_id, rank, str(venue.get("id", "unknown")), venue.get("name", "Unknown venue"),
                        venue.get("lat"), venue.get("lng"), venue.get("categories", []), venue.get("price_level"),
                        venue.get("rating"), venue.get("review_count"), venue.get("walk_min"),
                        float(item.get("score", {}).get("value", 0)), item.get("reachability", {}).get("method"),
                        json.dumps(item, default=str),
                    )
        _last_error = None
        return {"status": "persisted", "run_id": str(run_id)}
    except Exception as exc:  # Persistence is observability/storage, not a reason to fail recommendations.
        _last_error = str(exc)[:240]
        return {"status": "unavailable", "detail": _last_error}


def status() -> dict[str, Any]:
    if not configured():
        return {"status": "disabled", "detail": "DATABASE_URL is not configured"}
    return {"status": "configured" if _last_error is None else "error", "detail": _last_error,
            "catalog": _catalog_status}
