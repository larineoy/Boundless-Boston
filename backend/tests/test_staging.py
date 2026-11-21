from pathlib import Path
from uuid import uuid4

from app.staging import StagingStore


def test_staging_run_records_snapshot_and_normalized_venues():
    path = Path.cwd() / f".staging-test-{uuid4().hex}.sqlite3"
    try:
        store = StagingStore(path)
        store.init()
        run_id = store.start_run("test", "boston")
        venues = [{"id": "venue-1", "name": "Example", "lat": 42.35, "lng": -71.06}]

        store.stage_snapshot(run_id, "google_places", venues, status="demo", ttl_seconds=300)
        assert store.stage_venues(run_id, "google_places", venues) == 1
        store.finish_run(run_id, status="succeeded", detail="one venue")

        status = store.status()
        assert status["latest_run"]["run_id"] == run_id
        assert status["latest_run"]["status"] == "succeeded"
        assert status["sources"][0]["source"] == "google_places"
        assert status["sources"][0]["record_count"] == 1
    finally:
        for candidate in (path, Path(f"{path}-wal"), Path(f"{path}-shm")):
            candidate.unlink(missing_ok=True)

