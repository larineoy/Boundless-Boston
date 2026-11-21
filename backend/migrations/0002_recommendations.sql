CREATE SCHEMA IF NOT EXISTS boundless;

CREATE TABLE IF NOT EXISTS boundless.recommendation_runs (
  id uuid PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_time timestamptz NOT NULL,
  budget text NOT NULL CHECK (budget IN ('$', '$$', '$$$')),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  max_walk_min integer NOT NULL CHECK (max_walk_min BETWEEN 1 AND 120),
  travel text NOT NULL CHECK (travel IN ('walk', 'walk_t')),
  free_text text,
  preference_tags text[] NOT NULL DEFAULT '{}',
  weather_override text,
  app_mode text NOT NULL CHECK (app_mode IN ('demo', 'live')),
  recommendation_count integer NOT NULL DEFAULT 0,
  response jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS recommendation_runs_requested_at_idx
  ON boundless.recommendation_runs (requested_at DESC, id);

CREATE TABLE IF NOT EXISTS boundless.recommendation_items (
  run_id uuid NOT NULL REFERENCES boundless.recommendation_runs(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank > 0),
  venue_id text NOT NULL,
  venue_name text NOT NULL,
  latitude double precision,
  longitude double precision,
  categories text[] NOT NULL DEFAULT '{}',
  price_level integer,
  rating double precision,
  review_count integer,
  walk_min integer,
  fit_score double precision NOT NULL CHECK (fit_score BETWEEN 0 AND 1),
  reachability_method text,
  item jsonb NOT NULL,
  PRIMARY KEY (run_id, rank)
);

CREATE INDEX IF NOT EXISTS recommendation_items_venue_idx
  ON boundless.recommendation_items (venue_id, run_id DESC);

INSERT INTO boundless.schema_migrations(version)
VALUES ('002_recommendations')
ON CONFLICT (version) DO NOTHING;
