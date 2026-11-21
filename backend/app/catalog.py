"""Durable OSM catalog; Yelp responses are live-only, never persisted."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CAMPUSES = [
    ("harvard", "Harvard University", 42.3744, -71.1169),
    ("mit", "Massachusetts Institute of Technology", 42.3601, -71.0942),
    ("bu", "Boston University", 42.3505, -71.1054),
    ("bc", "Boston College", 42.3355, -71.1685),
    ("northeastern", "Northeastern University", 42.3398, -71.0892),
    ("tufts", "Tufts University", 42.4075, -71.1190),
    ("lesley", "Lesley University", 42.3785, -71.1171),
    ("suffolk", "Suffolk University", 42.3588, -71.0614),
    ("emerson", "Emerson College", 42.3522, -71.0657),
    ("berklee", "Berklee College of Music", 42.3467, -71.0878),
    ("simmons", "Simmons University", 42.3393, -71.1003),
    ("wentworth", "Wentworth Institute of Technology", 42.3366, -71.0957),
    ("massart", "Massachusetts College of Art and Design", 42.3369, -71.0993),
    ("emmanuel", "Emmanuel College", 42.3407, -71.1031),
    ("umass-boston", "University of Massachusetts Boston", 42.3140, -71.0388),
    ("brandeis", "Brandeis University", 42.3657, -71.2586),
    ("bentley", "Bentley University", 42.3876, -71.2209),
    ("babson", "Babson College", 42.2994, -71.2657),
    ("wellesley", "Wellesley College", 42.2936, -71.3059),
]
RADIUS_M = 2000
OSM_ATTRIBUTION = {"source": "overpass", "text": "© OpenStreetMap contributors", "url": "https://www.openstreetmap.org/copyright"}


def distance_m(lat, lng, other_lat, other_lng):
    a, b = math.radians(lat), math.radians(other_lat)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(other_lng-lng)/2)**2
    return 12742000 * math.asin(min(1, math.sqrt(h)))


def normalize(elements):
    """Stable OSM IDs and spatial campus membership; unknown facts stay null."""
    rows = {}
    for el in elements:
        tags = el.get("tags", {})
        point = el.get("center", el)
        lat, lng = point.get("lat"), point.get("lon")
        if not tags.get("name") or lat is None or lng is None:
            continue
        if tags.get("access") in ("private", "no") or any(tags.get(k) == "yes" for k in ("disused", "abandoned")):
            continue
        campuses = [{"campus_id": c[0], "distance_m": round(distance_m(lat, lng, c[2], c[3]))}
                    for c in CAMPUSES if distance_m(lat, lng, c[2], c[3]) <= RADIUS_M]
        if not campuses:
            continue
        external_id = f"{el['type']}/{el['id']}"
        categories = sorted({tags[k] for k in ("amenity", "tourism", "leisure", "shop") if tags.get(k)})
        address = ", ".join(x for x in [" ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")])), tags.get("addr:city"), tags.get("addr:postcode")] if x)
        rows[external_id] = {"id": "osm:" + external_id, "external_id": external_id,
            "name": tags["name"], "lat": lat, "lng": lng, "address": address or None,
            "categories": categories, "website": tags.get("website") or tags.get("contact:website"),
            "opening_hours": tags.get("opening_hours"), "cuisine": tags.get("cuisine"),
            "wheelchair": tags.get("wheelchair"), "wikidata": tags.get("wikidata"),
            "source_url": "https://www.openstreetmap.org/" + external_id,
            "campuses": campuses, "rating": None, "review_count": None,
            "popularity_status": "unverified", "attributions": [OSM_ATTRIBUTION]}
    return list(rows.values())


def sql_literal(value):
    return "'" + json.dumps(value, ensure_ascii=True, separators=(",", ":")).replace("'", "''") + "'::jsonb"


def import_sql(rows, fetched_at):
    """One atomic, repeatable import. Missing records age out; no destructive prune."""
    campus_rows = [{"id": c[0], "name": c[1], "lat": c[2], "lng": c[3]} for c in CAMPUSES]
    # JSON populating typed records avoids interpolating any upstream text as SQL.
    return f"""WITH lock AS (SELECT pg_advisory_xact_lock(82741032)),
    campuses AS (
      INSERT INTO public.catalog_campuses(id,name,lat,lng,radius_m)
      SELECT x.id,x.name,x.lat,x.lng,{RADIUS_M} FROM lock,
      jsonb_to_recordset({sql_literal(campus_rows)}) AS x(id text,name text,lat double precision,lng double precision)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,lat=excluded.lat,lng=excluded.lng,radius_m=excluded.radius_m RETURNING id
    ), venues AS (
      INSERT INTO public.catalog_venues(id,source,external_id,name,lat,lng,categories,details,last_seen_at)
      SELECT x->>'id','overpass',x->>'external_id',x->>'name',(x->>'lat')::double precision,
        (x->>'lng')::double precision,x->'categories',x,({sql_literal(fetched_at)} #>> '{{}}')::timestamptz
        FROM lock,jsonb_array_elements({sql_literal(rows)}) x
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,lat=excluded.lat,lng=excluded.lng,
        categories=excluded.categories,details=excluded.details,last_seen_at=excluded.last_seen_at
        WHERE excluded.last_seen_at >= catalog_venues.last_seen_at RETURNING id
    ), receipt AS (
      INSERT INTO public.catalog_refresh_runs(source,fetched_at,record_count)
      SELECT 'overpass',({sql_literal(fetched_at)} #>> '{{}}')::timestamptz,count(*) FROM venues RETURNING record_count
    ) SELECT record_count FROM receipt"""


def database_url():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    return url


def read_catalog(campus_id, category, limit, offset):
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(database_url(), connect_timeout=5, row_factory=dict_row) as db:
        db.execute("SET statement_timeout = '5000ms'")
        rows = db.execute("""SELECT details,last_seen_at FROM public.catalog_venues
          WHERE last_seen_at > now() - interval '7 days'
            AND (%s::text IS NULL OR details->'campuses' @> jsonb_build_array(jsonb_build_object('campus_id',%s::text)))
            AND (%s::text IS NULL OR categories ? %s::text)
          ORDER BY name,id LIMIT %s OFFSET %s""", (campus_id,campus_id,category,category,limit,offset)).fetchall()
    return [{**r["details"], "last_seen_at": r["last_seen_at"].isoformat(), "status": "cached"} for r in rows]
