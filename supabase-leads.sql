-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

create table if not exists leads (
  id           uuid        default gen_random_uuid() primary key,
  name         text        not null,
  phone        text        not null,
  message      text,
  utm_source   text,
  utm_campaign text,
  created_at   timestamptz default now() not null
);

-- Allow anonymous inserts (contact form submissions)
alter table leads enable row level security;

create policy "allow_insert" on leads
  for insert to anon
  with check (true);

-- Allow reads via anon key (admin panel is protected by middleware)
create policy "allow_select" on leads
  for select to anon
  using (true);
