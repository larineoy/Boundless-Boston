# Boundless Boston Navigator

**New here?** Read [CONTRIBUTING.md](CONTRIBUTING.md) for the design, workflow and current progress.

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

- `backend/app/main.py`: FastAPI query, recommendations, neighborhood, and health endpoints; request validation; scoring; SQLite public response TTL cache; demo fixtures.
- `backend/app/tiktok.py`: TikTok Login Kit OAuth + Display API taste preferences (personalization only).
- `src/`: React/Vite UI with responsive search, saved places (`localStorage`), TikTok connect, score breakdowns, weather override, source status, and attribution presentation.
- `scoring/weights.yaml`: declared scoring weights (includes `taste`).
- `docs/architecture/` and `docs/SOURCES.md`: architecture and data handling decisions.

`APP_MODE=demo` is the default and uses clearly labeled synthetic fixtures. Live mode is opt-in with `APP_MODE=live`. Live Tier 1 paths are implemented for Google Places, MBTA stops/routes/schedules/predictions/alerts, National Weather Service hourly forecasts, and Boston CKAN 311 and active food-establishment license data. Boston CKAN resource IDs are discovered dynamically with `package_show`. Transit eligibility uses paired scheduled trips, with prediction confirmation where available, or an explicitly approximate walking fallback. Google Places requires `GOOGLE_MAPS_API_KEY`; without it, live mode returns no Google candidates instead of substituting fixtures. Set `BOSTON_311_PACKAGE` and `BOSTON_LICENSE_PACKAGE` to override the CKAN package slugs.

### TikTok personalization (optional)

Register an app at [TikTok for Developers](https://developers.tiktok.com/), enable Login Kit + TikTok API with scopes `user.info.basic` and `video.list`, and set the redirect URI to your frontend-origin callback (local default `http://localhost:5173/api/tiktok/callback` so the Vite proxy sets the session cookie on the UI host). Set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and `TIKTOK_REDIRECT_URI`. In demo mode, **Connect TikTok** uses fixture taste tags without credentials. TikTok is never used for venue discovery.

## Deploy

- **API:** Render, from `render.yaml` (free web service, `APP_MODE=live`). Set `GOOGLE_MAPS_API_KEY` and `MBTA_API_KEY` in the Render dashboard. The free plan sleeps when idle, so the first request after a pause can take about a minute.
- **Frontend:** Render static site `boundless-boston-web` (also in `render.yaml`). A rewrite sends `/api/*` to `https://boundless-boston-api-5ze8.onrender.com`, so no CORS setup is needed.

## Neon

`neon.ts` remains the Neon project configuration. The application API is FastAPI and needs a Python 3.12 runtime; it is not packaged as a Neon Function. Deploying the database/service requires a configured Neon project and a compatible Python hosting target. No credentials or deployment identifiers belong in the frontend bundle.
