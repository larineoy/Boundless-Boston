# Cool Finds and Saved Places

## Flow

1. Open Cool Finds and paste a TikTok or YouTube Shorts/video URL.
2. Optionally enter the venue name or address you saw. Official metadata may not identify it, and metadata failure does not block an explicit clue.
3. Review Boston candidates and their attribution. Name similarity is not a calibrated match probability.
4. Save a candidate with your own label and optional note. This confirms the identity, independently of current hours/budget. Alternatively, save only the video as an unresolved idea.
5. Open Saved Places to search, filter, edit, mark visited, remove, or revisit the original video.
6. Check an outing to refresh current place details and evaluate the planner settings. Existing results/tokens are never reused from storage. Unknown hours/price fail eligibility. Walking times are conservative estimates; eligible live plans link to Google Maps directions.

## Storage boundary

The browser key `boundless.saved-places.v1` contains at most 200 entries. An entry holds `id`, `sourceUrl`, `platform`, nullable `placeId`, user-authored `label`/`notes`, `visited`, `mode`, and `savedAt`. Modes are demo, live, and unresolved. Google provider content, creator metadata, coordinates, and confirmation tokens are excluded. No account, shared collection, continuous location tracking, or cloud sync is enabled. Data is local to this browser and origin; clearing site data removes it. Storage errors are visible, and corrupt data is not silently replaced. Saves deduplicate the same source URL plus place ID; cross-tab storage events update the collection.

## API

- POST `/api/cool-finds/intake`: `{source_url, venue_hint?}`. Returns request-scoped official metadata, attributed candidates, provenance, notices, and a signed 15-minute confirmation token.
- POST `/api/cool-finds/select`: `{source_url, place_id, confirmation_token, confirmed:true}`. Confirms identity without outing constraints; returns only identifiers, mode, and confirmation status. No database save occurs here.
- POST `/api/cool-finds/refresh`: `{source_url, place_id}`. Fetches current place content and issues a new token. A demo ID cannot be treated as a live destination. Lookup failure leaves the browser's saved record intact.
- POST `/api/cool-finds/plan`: selection fields plus `query: QueryInput`. Re-fetches details and evaluates hours, budget, walking, weather, and reachability. All source statuses remain visible; saving is still permitted if outing eligibility fails.

## Configuration

`APP_MODE=demo` uses synthetic candidates regardless of what the pasted video actually contains. No live navigation URL is returned. `APP_MODE=live` uses `GOOGLE_MAPS_API_KEY`, `YOUTUBE_API_KEY`, and optionally `GEMINI_API_KEY` plus `GEMINI_MODEL`. The model is explicitly configured for the operator's account; it is not guessed. Without it, enter a place clue. Set a consistent random `COOL_FINDS_SIGNING_KEY` across API workers; otherwise outstanding tokens become invalid after restart.

Use a backend `.env` via `uvicorn --env-file .env` or hosting environment variables. Never use Vite-prefixed secret variables. No new deploy/hosting configuration is needed; the existing same-origin `/api` proxy is retained. Credentialed live-source acceptance has not been performed by offline tests.

## Provider boundaries

[TikTok oEmbed](https://developers.tiktok.com/docs/en/embed-videos), [YouTube videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [Google Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search), and [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) are the official reference paths. TikTok's current embed documentation flags future deprecation, so review its lifecycle before production rollout. Only fixed official hosts are fetched, with no redirects, scraping, downloaded videos, or rendered provider HTML. Short TikTok links may be saved as ideas or searched with a user clue, but are not followed. Instagram and generic web sources are disabled. Gemini receives only permitted metadata and an extracted name is accepted only if it occurs in that metadata.

Google, TikTok, YouTube, and Gemini responses bypass SQLite cache reads/writes. Creator content remains a lead; live provider data and user-confirmed identity are distinct states. Attribution stays adjacent to current Google content.

## Verification

From the project root:

```powershell
$env:PYTHONPATH='backend'
.venv/Scripts/python -m pytest -q backend/tests
node --test tests/saved-places.test.mjs
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
```

Backend tests cover saving a closed destination independently of outing eligibility, token tampering/expiry, refresh and planning, host validation, metadata failures, official YouTube/TikTok calls, and grounded Gemini extraction. Storage tests cover reload serialization, duplicate saves, visited preservation, unresolved ideas, provider-content exclusion, invalid storage, and bounds. Browser QA covers importing, saving, reloading, collection controls, and responsive layout.
