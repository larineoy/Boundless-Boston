-- Additive, repeatable migration. No provider content or coordinates are stored.
CREATE SCHEMA IF NOT EXISTS boundless;
CREATE TABLE IF NOT EXISTS boundless.schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS boundless.saved_collections (
    owner_key text PRIMARY KEY CHECK (owner_key ~ '^[a-f0-9]{64}$'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS boundless.saved_places (
    id uuid PRIMARY KEY,
    owner_key text NOT NULL REFERENCES boundless.saved_collections(owner_key) ON DELETE CASCADE,
    source_key text NOT NULL CHECK (source_key ~ '^[a-f0-9]{64}$'),
    source_url text NOT NULL CHECK (char_length(source_url) BETWEEN 1 AND 2048),
    platform text NOT NULL CHECK (platform IN ('youtube','tiktok')),
    place_id text CHECK (place_id IS NULL OR place_id ~ '^[A-Za-z0-9_-]{1,256}$'),
    label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
    notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
    visited boolean NOT NULL DEFAULT false,
    mode text NOT NULL CHECK (mode IN ('demo','live','unresolved')),
    saved_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (owner_key, source_key),
    CHECK ((place_id IS NULL AND mode = 'unresolved') OR (place_id IS NOT NULL AND mode IN ('demo','live')))
);
CREATE INDEX IF NOT EXISTS saved_places_owner_date_idx
    ON boundless.saved_places (owner_key, saved_at DESC, id);
INSERT INTO boundless.schema_migrations(version) VALUES ('001_saved_places') ON CONFLICT DO NOTHING;
