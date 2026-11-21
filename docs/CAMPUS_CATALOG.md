# Boston campus catalog

The durable catalog lives in Neon project `rapid-rain-34456283`, production branch
`br-snowy-wildflower-bbe0c41w`. It is independent of user-owned `saved_places`.
`backend/migrations/20261121_campus_catalog.sql` defines backend-only tables with RLS.
The database owner can access them; no browser/Data API policies are granted.

Nineteen campus anchors cover Harvard, MIT, BU, BC, Northeastern, Tufts, Lesley,
Suffolk, Emerson, Berklee, Simmons, Wentworth, MassArt, Emmanuel, UMass Boston,
Brandeis, Bentley, Babson, and Wellesley. Anchors approximate campus centers; each
venue belongs to every campus within 2 km straight-line distance. This is discovery
coverage, not a walking-route guarantee.

## Refresh

Run `python backend/scripts/refresh_catalog.py` with the production `DATABASE_URL`
in the process environment after installing `backend/requirements.txt`.
The script fetches one bounded OSM Overpass union, caches it locally for 24 hours,
rejects partial/empty results, and atomically upserts stable OSM object IDs.
It records the original fetch timestamp, not the replay timestamp. Older snapshots
cannot overwrite newer rows. Missing venues are retained for audit and excluded
from the API after seven days without observation. No venue history is fabricated.
OSM can contain node/way duplicates; object IDs prevent repeat-import duplicates,
but independently mapped objects are not automatically merged.

Without a local DB connection, `--sql-only` emits a JSON array of migration and
import statements for the connected Neon `run_sql_transaction` tool. Target the
explicit production branch above; `.neon` currently points to an unrelated
temporary saved-places verification branch and is deliberately unchanged.

Daily refresh is scheduled through the Codex app automation for this chat. It
requires this computer and Codex to be available. Each run uses the checked-in
script and the connected Neon tool; no privileged database password is saved in
the repository. This is not an always-on cloud scheduler.

## Read API

After deploying the backend and setting its `DATABASE_URL`:

- `GET /api/catalog/campuses` lists anchors and campus IDs.
- `GET /api/catalog?campus=harvard&category=cafe&limit=50&offset=0` reads OSM data.
- `GET /api/catalog/yelp?campus=mit` requests live Yelp businesses ordered by review
  count. Requires `APP_MODE=live` and `YELP_API_KEY`. Provider radius is advisory.

The catalog is a browsing/discovery API. Existing `/api/query` recommendation
eligibility still requires verified requested-time opening and price information;
raw OSM hours are not treated as verified hours. The current frontend does not yet
consume the catalog endpoints.

## Provenance and popularity

Credit [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) and
comply with the ODbL when publishing this database or derivatives. Named OSM venues
include food, nightlife, museums, parks, theatres, libraries, bakeries and bookstores.
OSM has no reliable popularity score: rating and review count stay null and
`popularity_status` stays `unverified`.

Yelp supplies live popularity signals only when credentials are available. Its
[FAQ](https://docs.developer.yelp.com/docs/places-faq) permits content caching for
at most 24 hours, so this implementation stores no Yelp content at all, including
ratings, review counts, names or coordinates. The shared resilience wrapper skips
disk caching for Yelp. Responses carry `Cache-Control: no-store`, required branding
metadata and business URLs. Display the required Yelp logo and returned business
links if adding this response to a UI. No reviews are copied and no Yelp scores are
used for commercial analysis or merged into OSM records.
