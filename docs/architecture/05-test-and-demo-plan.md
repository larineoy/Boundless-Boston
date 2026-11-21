# 05 — Test and demo plan

## Test matrix

| Layer | Coverage / pass condition |
|---|---|
| Unit | Request validation boundaries; normalization; dedupe 10 pair categories and threshold edges; each scoring formula and missing-data path; CKAN schema alias mapping; cache key determinism; breaker state transitions; attribution aggregation. |
| Adapter integration | Mock HTTP; timeout/retry counts; 429/5xx behavior; source-specific parsing; dynamic CKAN `package_show` discovery and `datastore_search`; no hardcoded resource IDs; Google and Yelp attribution metadata. |
| Zero-key demo integration | With all secrets absent and demo mode explicitly enabled, endpoints return fixture-backed data marked `demo`, with complete response envelopes, no outbound call dependency, stable results, fixture hours/transit/weather/neighborhood. |
| Resilience acceptance | Kill each upstream independently; query still returns coherent response or exact empty state; source health identifies failed source; no unhandled exception; no failure reported as verified zero. Verify circuit opens after 3 consecutive failures and recovers after 60 s half-open probe. |
| Performance | Warm-cache query p95 <3 s on agreed demo hardware/network, excluding browser tile fetch; record sample count and conditions. |
| Frontend | Render all source statuses and attributions; exact empty state copy; score breakdown no bare values; modal lifecycle; cancellation; responsive map/list. |
| Plasma audit | Runtime count never exceeds 16 including modal; provider budget fixed; separated panels do not blend; list has one scrollable Plasma parent; no nested plasma surfaces; reduced-motion and fallback paths render usable UI. |
| Security/CI | Frontend bundle key-pattern grep passes; no secrets in built assets; input fuzz/boundary validation; rate-limit behavior; log redaction checks. |
| Accessibility | Keyboard-only flow, screen-reader source status/score labels, contrast, focus management, reduced-motion and map list alternative. |

Acceptance requires Tier 1 live-configured adapter checks and zero-key demo checks to pass before Tier 2 work. Fixture tests are deterministic; live smoke checks are separately labeled and do not gate offline development.

## 90-second demo blueprint

1. **0–12 s — late-night constraint:** enter a late-night request, show time/budget/location/walk fields and source-health strip.
2. **12–27 s — starving query:** submit a deliberately restrictive query; show exact empty state and explain hard filters.
3. **27–42 s — natural language:** enter “cheap, under a 15 min walk”; show parsed filters and ranked candidates with price/walk eligibility.
4. **42–57 s — rain reaction:** toggle rain; show indoor candidates reorder, weather contribution changes, Plasma mood shifts, and source mode remains visible.
5. **57–67 s — Why:** expand one venue; show raw values, weights, sources, and an `approx.` momentum label if snapshot delta is used.
6. **67–78 s — neighborhood:** open the 311/license/service-contact panel with source dates and attribution.
7. **78–90 s — killed source:** deliberately stop or mock-fail one source, refresh, and show circuit/source health plus continued usable results or explicit degradation.

Demo fixtures must be labeled `DEMO`; script narration must not imply external data is live when fixtures are active. Record fallback route if a live dependency is unavailable.
