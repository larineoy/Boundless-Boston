import pytest
from fastapi.testclient import TestClient

import app.main as m
from app.tiktok import extract_tags_from_videos, normalize_tag_token


def test_normalize_tag_token_maps_keywords():
    assert normalize_tag_token("Ramen") == "noodles"
    assert normalize_tag_token("coffee") == "cafe"
    assert normalize_tag_token("xyzzy") is None


def test_extract_tags_from_videos():
    tags = extract_tags_from_videos(
        [
            {"title": "Best ramen in Boston #noodles", "video_description": "late night noodles"},
            {"title": "Cozy cafe morning", "video_description": "#coffee"},
            {"title": "Live music at a bar", "video_description": ""},
        ]
    )
    names = [t["tag"] for t in tags]
    assert "noodles" in names
    assert "cafe" in names
    assert "bar" in names


def test_taste_score_jaccard_and_missing():
    missing = m.taste_score(["cafe"], [])
    assert missing["missing_reason"] == "no_preference_data"
    hit = m.taste_score(["cafe", "bakery"], ["cafe", "noodles"])
    assert hit["missing_reason"] is None
    assert hit["value"] == pytest.approx(1 / 3)  # intersection cafe; union cafe,bakery,noodles
    assert "cafe" in hit["raw"]["intersection"]


def test_score_venue_includes_taste_and_rescales_when_missing():
    venue = {
        "rating": 4.5,
        "review_count": 100,
        "indoor_outdoor": "indoor",
        "momentum_delta": 5,
        "categories": ["cafe", "bakery"],
        "nearby_events": 1,
    }
    weather = {"temperature_f": 55, "precipitation_chance_pct": 0}
    reach = {"reach_value": 0.5}

    without = m.score_venue(venue, 4.0, weather, reach, [])
    assert without["components"]["taste"]["weight"] == 0
    assert without["components"]["taste"]["missing_reason"] == "no_preference_data"
    assert sum(c["weight"] for c in without["components"].values()) == pytest.approx(1.0)

    with_tags = m.score_venue(venue, 4.0, weather, reach, ["cafe"])
    assert with_tags["components"]["taste"]["weight"] == pytest.approx(m.SCORING["weights"]["taste"])
    assert with_tags["components"]["taste"]["value"] > 0


def test_preferences_demo_endpoint():
    client = TestClient(m.app)
    res = client.post("/api/tiktok/demo")
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "demo"
    assert "noodles" in body["preference_tags"]


def test_query_accepts_preference_tags():
    client = TestClient(m.app)
    from datetime import datetime, timedelta, timezone

    when = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    res = client.post(
        "/api/query",
        json={
            "time": when,
            "budget": "$$",
            "lat": 42.355,
            "lng": -71.062,
            "max_walk_min": 25,
            "preference_tags": ["cafe", "noodles"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["query"]["preference_tags"] == ["cafe", "noodles"]
    assert body["recommendations"]
    taste = body["recommendations"][0]["score"]["components"]["taste"]
    assert taste["missing_reason"] is None
    assert "tiktok" in [s["source"] for s in body["sources_used"]]
