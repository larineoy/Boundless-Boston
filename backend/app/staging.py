"""Small, durable staging layer for upstream API responses.

The staging database is deliberately separate from the public-response cache. The
cache answers repeat requests quickly; this layer records what the pipeline saw,
how it normalized it, and which run produced the data for the app.
"""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any
from uuid import uuid4


class _Connection(sqlite3.Connection):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            if exc_type:
                self.rollback()
            else:
                self.commit()
        finally:
            self.close()
        return False


class StagingStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, factory=_Connection)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        return connection

    def init(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS pipeline_runs (
                    run_id TEXT PRIMARY KEY,
                    started_at REAL NOT NULL,
                    finished_at REAL,
                    status TEXT NOT NULL,
                    trigger TEXT NOT NULL,
                    request_key TEXT,
                    record_count INTEGER NOT NULL DEFAULT 0,
                    error_count INTEGER NOT NULL DEFAULT 0,
                    detail TEXT
                );
                CREATE TABLE IF NOT EXISTS source_snapshots (
                    snapshot_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL,
                    fetched_at REAL NOT NULL,
                    expires_at REAL,
                    record_count INTEGER NOT NULL DEFAULT 0,
                    payload_json TEXT,
                    error_code TEXT,
                    detail TEXT,
                    FOREIGN KEY(run_id) REFERENCES pipeline_runs(run_id)
                );
                CREATE INDEX IF NOT EXISTS source_snapshots_latest
                    ON source_snapshots(source, fetched_at DESC);
                CREATE TABLE IF NOT EXISTS normalized_venues (
                    run_id TEXT NOT NULL,
                    source TEXT NOT NULL,
                    external_id TEXT NOT NULL,
                    venue_json TEXT NOT NULL,
                    lat REAL,
                    lng REAL,
                    staged_at REAL NOT NULL,
                    PRIMARY KEY(run_id, source, external_id),
                    FOREIGN KEY(run_id) REFERENCES pipeline_runs(run_id)
                );
                CREATE INDEX IF NOT EXISTS normalized_venues_location
                    ON normalized_venues(lat, lng, staged_at DESC);
                """
            )

    def start_run(self, trigger: str, request_key: str | None = None) -> str:
        run_id = f"run_{uuid4().hex}"
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO pipeline_runs(run_id, started_at, status, trigger, request_key) VALUES(?,?,?,?,?)",
                (run_id, time.time(), "running", trigger, request_key),
            )
        return run_id

    def stage_snapshot(
        self,
        run_id: str,
        source: str,
        payload: Any,
        *,
        status: str,
        ttl_seconds: int | None = None,
        error_code: str | None = None,
        detail: str | None = None,
    ) -> str:
        snapshot_id = f"snap_{uuid4().hex}"
        fetched_at = time.time()
        record_count = len(payload) if isinstance(payload, list) else 1
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO source_snapshots(snapshot_id,run_id,source,status,fetched_at,expires_at,record_count,payload_json,error_code,detail) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (snapshot_id, run_id, source, status, fetched_at,
                 fetched_at + ttl_seconds if ttl_seconds else None, record_count,
                 json.dumps(payload, separators=(",", ":"), default=str), error_code, detail),
            )
            connection.execute(
                "UPDATE pipeline_runs SET record_count=record_count+? WHERE run_id=?",
                (record_count, run_id),
            )
        return snapshot_id

    def stage_venues(self, run_id: str, source: str, venues: list[dict[str, Any]]) -> int:
        now = time.time()
        rows = []
        for venue in venues:
            external_id = str(venue.get("id") or venue.get("place_id") or "")
            if not external_id:
                continue
            rows.append((run_id, source, external_id, json.dumps(venue, separators=(",", ":"), default=str), venue.get("lat"), venue.get("lng"), now))
        with self._connect() as connection:
            connection.executemany(
                "INSERT OR REPLACE INTO normalized_venues(run_id,source,external_id,venue_json,lat,lng,staged_at) VALUES(?,?,?,?,?,?,?)",
                rows,
            )
        return len(rows)

    def finish_run(self, run_id: str, *, status: str, error_count: int = 0, detail: str | None = None) -> None:
        with self._connect() as connection:
            connection.execute(
                "UPDATE pipeline_runs SET finished_at=?,status=?,error_count=?,detail=? WHERE run_id=?",
                (time.time(), status, error_count, detail, run_id),
            )

    def latest_run(self) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1").fetchone()
        return dict(row) if row else None

    def status(self) -> dict[str, Any]:
        latest = self.latest_run()
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT source,status,fetched_at,record_count,error_code,detail FROM source_snapshots WHERE snapshot_id IN (SELECT snapshot_id FROM source_snapshots s2 WHERE s2.source=source ORDER BY fetched_at DESC LIMIT 1) ORDER BY source"
            ).fetchall()
        return {"latest_run": latest, "sources": [dict(row) for row in rows]}

