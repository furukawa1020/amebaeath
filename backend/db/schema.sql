-- PostgreSQL schema for Ameba Earth
CREATE TABLE IF NOT EXISTS organisms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS world_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tick bigint NOT NULL DEFAULT 0,
  temperature_map jsonb,
  food_map jsonb,
  density_map jsonb,
  last_tick_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x int NOT NULL,
  y int NOT NULL,
  amplitude float,
  sigma float,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spawn_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL,
  day date NOT NULL,
  count int NOT NULL DEFAULT 0,
  UNIQUE(ip, day)
);

-- Extensions recommended
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
