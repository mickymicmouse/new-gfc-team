create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  jersey_number integer,
  defense integer not null default 2 check (defense between 1 and 5),
  passing integer not null default 2 check (passing between 1 and 5),
  shooting integer not null default 2 check (shooting between 1 and 5),
  control integer not null default 2 check (control between 1 and 5),
  activity integer not null default 2 check (activity between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null default current_date,
  title text not null default 'GFC 풋살',
  team_count integer not null default 3 check (team_count in (2, 3)),
  balance_mode text not null default 'overall' check (balance_mode in ('random', 'overall', 'specific')),
  specific_ability text check (specific_ability in ('defense', 'passing', 'shooting', 'control', 'activity')),
  random_seed integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid references public.players(id),
  guest_name text,
  guest_jersey_number integer,
  guest_defense integer check (guest_defense between 1 and 5),
  guest_passing integer check (guest_passing between 1 and 5),
  guest_shooting integer check (guest_shooting between 1 and 5),
  guest_control integer check (guest_control between 1 and 5),
  guest_activity integer check (guest_activity between 1 and 5),
  attending boolean not null default false,
  assigned_team integer check (assigned_team between 1 and 3),
  manual_team integer check (manual_team between 1 and 3),
  created_at timestamptz not null default now(),
  constraint match_player_identity check (
    (player_id is not null and guest_name is null)
    or (player_id is null and guest_name is not null)
  )
);

create index if not exists match_players_match_id_idx on public.match_players(match_id);
create index if not exists match_players_player_id_idx on public.match_players(player_id);
create index if not exists matches_match_date_idx on public.matches(match_date desc);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy players_all on public.players for all to anon, authenticated using (true) with check (true);
create policy matches_all on public.matches for all to anon, authenticated using (true) with check (true);
create policy match_players_all on public.match_players for all to anon, authenticated using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_players_updated_at before update on public.players
for each row execute function public.set_updated_at();

create trigger trg_matches_updated_at before update on public.matches
for each row execute function public.set_updated_at();
