from app.catalog import normalize, import_sql


def element(id=1, **tags):
    return {"id": id, "type": "node", "lat": 42.3744, "lon": -71.1169,
            "tags": {"name": "Example Cafe", "amenity": "cafe", **tags}}


def test_osm_stable_ids_campus_overlap_and_no_invented_facts():
    rows = normalize([element(), element()])
    assert len(rows) == 1
    row = rows[0]
    assert row["id"] == "osm:node/1"
    assert {c["campus_id"] for c in row["campuses"]} >= {"harvard", "lesley"}
    assert row["rating"] is None and row["review_count"] is None
    assert row["opening_hours"] is None


def test_private_unnamed_and_out_of_area_are_excluded():
    assert not normalize([element(access="private"), element(name=""),
                          {**element(), "lat": 0, "lon": 0}])


def test_upstream_sql_text_is_escaped_and_snapshot_is_not_redated():
    sql = import_sql(normalize([element(name="Joe's; DROP TABLE x; --")]), "2026-11-21T12:00:00+00:00")
    assert "Joe''s; DROP TABLE x; --" in sql
    assert "2026-11-21T12:00:00+00:00" in sql
    assert "excluded.last_seen_at >= catalog_venues.last_seen_at" in sql
