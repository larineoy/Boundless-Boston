"""Run from the repo: python backend/scripts/refresh_catalog.py [--sql-only]."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from app.catalog import CAMPUSES, ROOT, RADIUS_M, database_url, import_sql, normalize


def fetch_osm():
    cache = ROOT / ".cache" / "campus-osm.json"
    if cache.exists() and time.time() - cache.stat().st_mtime < 86400:
        return json.loads(cache.read_text(encoding="utf-8"))
    selectors = [('amenity', 'restaurant|cafe|bar|pub|fast_food|ice_cream|cinema|theatre|library|arts_centre|music_venue|nightclub'),
                 ('tourism', 'museum|gallery|attraction|viewpoint'), ('leisure', 'park'), ('shop', 'books|bakery')]
    # A single bounded union for this small metropolitan area; never fan out requests.
    body = "[out:json][timeout:60];(" + "".join(
        f'nwr(around:{RADIUS_M},{lat},{lng})["name"]["{tag}"~"^({values})$"];'
        for _, _, lat, lng in CAMPUSES for tag, values in selectors) + ");out center tags;"
    with httpx.Client(timeout=90, headers={"User-Agent": "BoundlessBoston/0.1 (https://github.com/paruchurisid/Boundless-Boston)"}) as client:
        response = client.post(os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter"), data={"data": body})
        response.raise_for_status()
        data = response.json()
    if data.get("remark") or not isinstance(data.get("elements"), list) or not data["elements"]:
        raise RuntimeError("Incomplete or empty Overpass response; previous catalog preserved")
    payload = {"fetched_at": datetime.now(timezone.utc).isoformat(), "elements": data["elements"]}
    cache.parent.mkdir(exist_ok=True, parents=True)
    temp = cache.with_suffix(".tmp")
    temp.write_text(json.dumps(payload), encoding="utf-8")
    temp.replace(cache)
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sql-only", action="store_true", help="Write a JSON array of SQL statements to stdout for Neon MCP")
    args = parser.parse_args()
    if not args.sql_only:
        database_url()  # fail before consuming upstream quota
    snapshot = fetch_osm()
    rows = normalize(snapshot["elements"])
    if not rows or any(not any(c["campus_id"] == campus[0] for r in rows for c in r["campuses"]) for campus in CAMPUSES):
        raise RuntimeError("Empty campus coverage; previous catalog preserved")
    schema = (ROOT / "backend/migrations/20261121_campus_catalog.sql").read_text()
    # Keep imports bounded and atomic per snapshot.
    statements = [s.strip() for s in schema.split(";") if s.strip()] + [import_sql(rows, snapshot["fetched_at"])]
    if args.sql_only:
        print(json.dumps(statements))
    else:
        import psycopg
        with psycopg.connect(database_url(), connect_timeout=10) as db:
            db.execute("SET statement_timeout = '60000ms'")
            for statement in statements:
                db.execute(statement)
        print(json.dumps({"venues": len(rows), "campuses": len(CAMPUSES), "fetched_at": snapshot["fetched_at"]}))


if __name__ == "__main__":
    main()
