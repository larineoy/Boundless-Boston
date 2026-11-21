CREATE TABLE IF NOT EXISTS public.catalog_campuses (
  id text PRIMARY KEY, name text NOT NULL,
  lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK(lng BETWEEN -180 AND 180),
  radius_m integer NOT NULL CHECK(radius_m BETWEEN 1 AND 5000)
);
CREATE TABLE IF NOT EXISTS public.catalog_venues (
  id text PRIMARY KEY, source text NOT NULL CHECK(source='overpass'), external_id text NOT NULL,
  name text NOT NULL, lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK(lng BETWEEN -180 AND 180),
  categories jsonb NOT NULL, details jsonb NOT NULL,
  last_seen_at timestamptz NOT NULL, UNIQUE(source,external_id)
);
CREATE INDEX IF NOT EXISTS catalog_venues_campuses ON public.catalog_venues USING gin((details->'campuses'));
CREATE INDEX IF NOT EXISTS catalog_venues_categories ON public.catalog_venues USING gin(categories);
CREATE INDEX IF NOT EXISTS catalog_venues_seen ON public.catalog_venues(last_seen_at);
CREATE TABLE IF NOT EXISTS public.catalog_refresh_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source text NOT NULL,
  fetched_at timestamptz NOT NULL, record_count integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
-- Backend-only tables: Data API/browser roles receive no policies or grants.
ALTER TABLE public.catalog_campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_refresh_runs ENABLE ROW LEVEL SECURITY;
