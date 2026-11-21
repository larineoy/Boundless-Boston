# Boundless Boston Navigator

A newcomer-facing Boston night planner. The app combines venue fit, walk estimates, transit context, weather, and neighborhood signals, while showing when information is demo, live, cached, or unavailable.

## Run locally

Requires Python 3.12 and Node.js 20+.

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
APP_MODE=demo uvicorn app.main:app --app-dir backend --reload --port 8000
```

In another terminal:

```sh
pnpm install
pnpm dev
```

Open the Vite URL (normally `http://localhost:5173`). The frontend proxies `/api` to port 8000. The API docs are at `http://localhost:8000/docs`.

## Current implementation

- `mobile/`: React Native / Expo iOS and Android app with Tonight, Around you, Saved, and source/neighborhood screens. See [mobile setup and build instructions](mobile/README.md).

- `backend/app/main.py`: FastAPI query, recommendations, neighborhood, and health endpoints; request validation; scoring; SQLite public response TTL cache; demo fixtures.
- `src/`: React/Vite UI with responsive search, score breakdowns, map, weather override, source status, and attribution presentation.
- `scoring/weights.yaml`: declared scoring weights.
- `docs/architecture/` and `docs/SOURCES.md`: architecture and data handling decisions.

`APP_MODE=demo` is the default and uses clearly labeled synthetic fixtures. Live mode is opt-in with `APP_MODE=live`. Live Tier 1 paths are implemented for Google Places, MBTA stops/routes/schedules/predictions/alerts, Open-Meteo hourly forecasts, and Boston CKAN 311 and active food-establishment license data. Boston CKAN resource IDs are discovered dynamically with `package_show`. Transit eligibility uses paired scheduled trips, with prediction confirmation where available, or an explicitly approximate walking fallback. Google Places requires `GOOGLE_MAPS_API_KEY`; without it, live mode returns no Google candidates instead of substituting fixtures. Set `BOSTON_311_PACKAGE` and `BOSTON_LICENSE_PACKAGE` to override the CKAN package slugs. Live adapter acceptance still needs to run against the configured credentials and current source quotas before production use. Tier 2 event, routing, and Yelp integrations remain out of scope. Cool Finds now supports optional Gemini extraction from official video metadata; see below.

## Cool Finds and Saved Places (web)

The web navigation includes Explore, Cool Finds, and Saved Places. Paste a TikTok or YouTube Shorts/video link, add a venue clue if needed, then choose a Boston candidate. Saving a destination confirms its identity without requiring it to fit tonight's budget/hours. Check an outing separately for current hours, weather, MBTA context, budget, and approximate walking time.

Saved Places persists in this browser, with search, platform/visited filters, editable labels and notes, visited status, original video links, and removal. You can also keep an unresolved video idea when metadata or lookup is unavailable. This is not account-backed or cross-device sync. Clearing browser site data removes the collection. Only original URLs, permitted place IDs, and your own labels/notes/status are stored; Google names, addresses, hours, ratings, and confirmation tokens are not persisted. See [the feature contract and setup](docs/COOL_FINDS.md).

Demo mode uses labeled synthetic matches and no provider calls. Live mode needs GOOGLE_MAPS_API_KEY, YOUTUBE_API_KEY for YouTube metadata, and optional GEMINI_API_KEY plus GEMINI_MODEL for metadata extraction. Explicit venue clues work even when video metadata is unavailable. Instagram and arbitrary websites are not fetched. Live credentialed acceptance remains separate from the offline tests.

## Deploy

- **API:** Render, from `render.yaml` (free web service, `APP_MODE=live`). Set `GOOGLE_MAPS_API_KEY` and `MBTA_API_KEY` in the Render dashboard. The free plan sleeps when idle, so the first request after a pause can take about a minute.
- **Frontend:** Vercel. `vercel.json` proxies `/api/*` to `https://boundless-boston-api-5ze8.onrender.com`, so no CORS setup is needed.

## Neon

`neon.ts` remains the Neon project configuration. The application API is FastAPI and needs a Python 3.12 runtime; it is not packaged as a Neon Function. Deploying the database/service requires a configured Neon project and a compatible Python hosting target. No credentials or deployment identifiers belong in the frontend bundle.
