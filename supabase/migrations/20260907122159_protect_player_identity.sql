create unique index if not exists players_normalized_name_key
  on public.players (lower(btrim(name)));

create unique index if not exists players_active_jersey_number_key
  on public.players (jersey_number)
  where is_active and jersey_number is not null;

create or replace function public.link_guest_match_rows_for_player()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.match_players existing
  set
    attending = existing.attending or guest.attending,
    assigned_team = coalesce(guest.assigned_team, existing.assigned_team),
    manual_team = coalesce(guest.manual_team, existing.manual_team),
    rotation_order = coalesce(guest.rotation_order, existing.rotation_order)
  from public.match_players guest
  where guest.player_id is null
    and lower(btrim(guest.guest_name)) = lower(btrim(new.name))
    and existing.match_id = guest.match_id
    and existing.player_id = new.id;

  delete from public.match_players guest
  where guest.player_id is null
    and lower(btrim(guest.guest_name)) = lower(btrim(new.name))
    and exists (
      select 1
      from public.match_players existing
      where existing.match_id = guest.match_id
        and existing.player_id = new.id
    );

  update public.match_players guest
  set
    player_id = new.id,
    guest_name = null,
    guest_jersey_number = null,
    guest_defense = null,
    guest_passing = null,
    guest_shooting = null,
    guest_control = null,
    guest_activity = null
  where guest.player_id is null
    and lower(btrim(guest.guest_name)) = lower(btrim(new.name));

  return new;
end;
$$;

revoke all on function public.link_guest_match_rows_for_player() from public;

drop trigger if exists trg_link_guest_match_rows_for_player on public.players;
create trigger trg_link_guest_match_rows_for_player
after insert or update of name on public.players
for each row execute function public.link_guest_match_rows_for_player();

update public.match_players existing
set
  attending = existing.attending or guest.attending,
  assigned_team = coalesce(guest.assigned_team, existing.assigned_team),
  manual_team = coalesce(guest.manual_team, existing.manual_team),
  rotation_order = coalesce(guest.rotation_order, existing.rotation_order)
from public.match_players guest
join public.players player
  on lower(btrim(player.name)) = lower(btrim(guest.guest_name))
where guest.player_id is null
  and existing.match_id = guest.match_id
  and existing.player_id = player.id;

delete from public.match_players guest
using public.players player
where guest.player_id is null
  and lower(btrim(player.name)) = lower(btrim(guest.guest_name))
  and exists (
    select 1
    from public.match_players existing
    where existing.match_id = guest.match_id
      and existing.player_id = player.id
  );

update public.match_players guest
set
  player_id = player.id,
  guest_name = null,
  guest_jersey_number = null,
  guest_defense = null,
  guest_passing = null,
  guest_shooting = null,
  guest_control = null,
  guest_activity = null
from public.players player
where guest.player_id is null
  and lower(btrim(player.name)) = lower(btrim(guest.guest_name));

create unique index if not exists match_players_match_player_key
  on public.match_players (match_id, player_id)
  where player_id is not null;

create unique index if not exists match_players_match_guest_name_key
  on public.match_players (match_id, lower(btrim(guest_name)))
  where player_id is null;
