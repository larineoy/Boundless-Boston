"""Emit an idempotent SQL import of the bundled OSM snapshot for Neon."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def sql():
    snapshot = json.loads((ROOT / "backend/data/osm_venues.json").read_text(encoding="utf-8"))
    records = {}
    for venue in snapshot["venues"]:
        external_id = venue["osm"]
        lat, lng = venue["lat"], venue["lng"]
        if not venue.get("name") or not (42.2 <= lat <= 42.5 and -71.3 <= lng <= -70.9):
            continue
        categories = [venue[k] for k in ("amenity", "leisure", "tourism") if venue.get(k)]
        details = dict(venue, id=f"osm:{external_id}", external_id=external_id,
                       categories=categories, rating=None, review_count=None,
                       source_url=f"https://www.openstreetmap.org/{external_id}",
                       popularity_status="unverified", snapshot_generated_at=snapshot["generated_at"],
                       attributions=[{"source": "overpass", "text": "© OpenStreetMap contributors",
                                      "url": "https://www.openstreetmap.org/copyright"}])
        records[external_id] = dict(id=f"osm:{external_id}", source="overpass",
            external_id=external_id, name=venue["name"], lat=lat, lng=lng,
            categories=categories, details=details)
    offset = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else len(records)
    payload = json.dumps(list(records.values())[offset:offset + limit], ensure_ascii=True).replace("'", "''")
    return """WITH imported AS (
INSERT INTO public.catalog_venues(id,source,external_id,name,lat,lng,categories,details,last_seen_at)
SELECT id,source,external_id,name,lat,lng,categories,details,
       (details->>'snapshot_generated_at')::timestamptz
FROM jsonb_to_recordset('""" + payload + """'::jsonb)
AS x(id text,source text,external_id text,name text,lat double precision,lng double precision,categories jsonb,details jsonb)
ON CONFLICT DO NOTHING RETURNING id
) SELECT count(*) AS inserted_places FROM imported;"""


if __name__ == "__main__":
    print(json.dumps({"sql": sql()}))
