-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

-- ── leads ──────────────────────────────────────────────────────────────────

create table if not exists leads (
  id           uuid        default gen_random_uuid() primary key,
  name         text,
  phone        text        not null,
  message      text,
  utm_source   text,
  utm_campaign text,
  device       text,
  created_at   timestamptz default now() not null
);

-- If table already exists without these columns, add them:
alter table leads alter column name drop not null;
alter table leads add column if not exists utm_campaign text;
alter table leads add column if not exists device text;

-- RLS
alter table leads enable row level security;

create policy "allow_insert" on leads
  for insert to anon
  with check (true);

-- Allow reads via anon key (admin panel is protected by middleware)
create policy "allow_select" on leads
  for select to anon
  using (true);

-- ── events ─────────────────────────────────────────────────────────────────

create table if not exists events (
  id         uuid        default gen_random_uuid() primary key,
  type       text        not null,
  device     text,
  utm_source text,
  created_at timestamptz default now() not null
);

alter table events enable row level security;

create policy "allow_insert" on events
  for insert to anon
  with check (true);

create policy "allow_select" on events
  for select to anon
  using (true);

-- ── rate_limits ─────────────────────────────────────────────────────────────

create table if not exists rate_limits (
  id         bigserial   primary key,
  ip_hash    text        not null,
  created_at timestamptz default now() not null
);

alter table rate_limits enable row level security;

create policy "allow_insert" on rate_limits
  for insert to anon
  with check (true);

create policy "allow_select" on rate_limits
  for select to anon
  using (true);

-- Index for fast rate-limit queries
create index if not exists rate_limits_ip_hash_created_at
  on rate_limits (ip_hash, created_at desc);
