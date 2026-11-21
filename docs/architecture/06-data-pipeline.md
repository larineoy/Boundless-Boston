# 06 — API-to-app data pipeline

## Goal

Boundless keeps upstream API access behind the FastAPI backend and now records a
durable staging receipt for every recommendation run. The request-time response
cache remains optimized for fast public reads; the staging store is optimized for
traceability, replay, and UI provenance.

```text
Upstream APIs
  Google Places / MBTA / NWS / Boston CKAN
        |
        v
Source adapters + resilience wrapper
  timeout | retry | circuit breaker | source health | attribution
        |
        v
StagingStore (.cache/staging.sqlite3)
  pipeline_runs      -> one run per query or manual refresh
  source_snapshots   -> payload, status, TTL, record count, failure metadata
  normalized_venues  -> stable venue rows keyed by run/source/external id
        |
        v
Query orchestration + hard filters + scoring
        |
        v
`/api/query` response
  recommendations + weather + sources_used + pipeline receipt
        |
        v
React UI
  ranked cards + source strip + staged-record/run provenance
```

## Contracts

`pipeline_runs` is the operational unit. A run records its trigger (`query` or
`manual_refresh`), bounded request key, lifecycle status, record/error counts,
and timestamps. `source_snapshots` stores the normalized JSON payload returned by
an adapter, its source health status, TTL-derived expiry, and any typed failure
metadata. `normalized_venues` stores only venue-shaped records needed for later
replay or inspection; it does not store user free text or credentials.

The query response includes:

```json
{
  "pipeline": {
    "run_id": "run_…",
    "staged_sources": ["google_places", "nws", "mbta"],
    "staged_venue_count": 6,
    "status": "succeeded"
  }
}
```

If staging is unavailable, recommendations still return and the receipt is
marked `unavailable`; staging must never become a hidden hard dependency for the
core user flow.

## Operations

- `GET /api/pipeline/status` returns the latest run and most recent snapshot per source.
- `POST /api/pipeline/refresh` runs the same adapter/orchestration path with a
  `manual_refresh` trigger. It is open in demo mode and requires `X-Pipeline-Token`
  in live mode.
- `STAGING_DB` can point at a durable volume in deployment. The default local
  path is `.cache/staging.sqlite3`.
- The next production step is moving the staging tables to Neon or a managed
  Postgres schema once replay/history requirements exceed local SQLite.

