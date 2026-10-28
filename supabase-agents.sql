-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Safe to run more than once.

-- ── agents ─────────────────────────────────────────────────────────────────
-- One row per sales agent. Rows are never deleted — an agent who leaves is
-- deactivated — so public_id, which will later be printed into QR codes and
-- written onto NFC tags, can never be handed to someone else.

create table if not exists agents (
  id          uuid        default gen_random_uuid() primary key,
  public_id   text        not null unique,
  full_name   text        not null,
  phone       text        not null,
  email       text,
  title       text,
  photo_path  text,
  photo_url   text,
  active      boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists agents_active_sort on agents (active, sort_order);

-- RLS: the public anon key may only read active agents (exactly what the team
-- page shows anyway). All writes go through /api/admin/agents with the
-- service-role key.
alter table agents enable row level security;

drop policy if exists "public_read_active" on agents;
create policy "public_read_active" on agents
  for select to anon
  using (active);

-- ── agent-photos bucket ────────────────────────────────────────────────────
-- Public bucket for profile photos. Uploads happen server-side only.

insert into storage.buckets (id, name, public)
values ('agent-photos', 'agent-photos', true)
on conflict (id) do nothing;
