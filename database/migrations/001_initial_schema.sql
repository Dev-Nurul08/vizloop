-- VizLoop initial learning schema.
-- Auth identities are owned by the managed provider; user_id stores that external UUID.

create extension if not exists pgcrypto;

create table if not exists learning_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')),
  school_level text not null default 'first-year',
  preferred_language text not null default 'JavaScript',
  locale text not null default 'en',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  title text not null,
  language text not null,
  source_code text not null,
  detected_pattern text not null,
  trace_json jsonb not null,
  report_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists concept_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  concept_id text not null,
  status text not null check (status in ('not-started', 'in-progress', 'complete')),
  score integer not null default 0 check (score between 0 and 100),
  last_lesson_id uuid references lessons(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, concept_id)
);

create table if not exists assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bank_version text not null,
  language text not null,
  level text not null,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  answers_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  game_id text not null,
  concept_id text not null,
  success boolean not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lessons_owner_created on lessons(owner_user_id, created_at desc);
create index if not exists idx_concept_progress_user on concept_progress(user_id, updated_at desc);
create index if not exists idx_assessment_attempts_user on assessment_attempts(user_id, created_at desc);
create index if not exists idx_game_attempts_user on game_attempts(user_id, created_at desc);
