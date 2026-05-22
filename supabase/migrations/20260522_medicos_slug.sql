-- supabase/migrations/20260522_medicos_slug.sql

-- Enable unaccent extension for accent-insensitive slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug column (nullable initially to allow backfill)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing rows
UPDATE medicos
SET slug = regexp_replace(
             regexp_replace(
               lower(unaccent(nombre_completo)),
               '[^a-z0-9 ]', '', 'g'
             ),
             ' +', '-', 'g'
           )
WHERE slug IS NULL;

-- Make NOT NULL and add unique constraint
ALTER TABLE medicos ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medicos_slug_key'
  ) THEN
    ALTER TABLE medicos ADD CONSTRAINT medicos_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS medicos_slug_idx ON medicos (slug);
