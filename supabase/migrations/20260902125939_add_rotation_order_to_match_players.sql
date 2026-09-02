alter table public.match_players
  add column rotation_order smallint
  check (rotation_order between 1 and 99);

create unique index match_players_team_rotation_order_key
  on public.match_players (
    match_id,
    coalesce(manual_team, assigned_team),
    rotation_order
  )
  where attending and rotation_order is not null;
