create table public.player_score_history (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete restrict,
  player_name text not null,
  jersey_number integer,
  changed_at timestamptz not null default now(),
  source text not null,
  old_shooting numeric(3,2) not null,
  old_defense numeric(3,2) not null,
  old_passing numeric(3,2) not null,
  old_control numeric(3,2) not null,
  old_activity numeric(3,2) not null,
  new_shooting numeric(3,2) not null,
  new_defense numeric(3,2) not null,
  new_passing numeric(3,2) not null,
  new_control numeric(3,2) not null,
  new_activity numeric(3,2) not null
);
create index player_score_history_player_time_idx on public.player_score_history(player_id, changed_at desc);
alter table public.player_score_history enable row level security;
grant select on public.player_score_history to anon, authenticated;
create policy player_score_history_admin_read on public.player_score_history
  for select to anon, authenticated using (public.is_gfc_admin());

create schema if not exists gfc_internal;
revoke all on schema gfc_internal from public;
create function gfc_internal.record_player_score_change()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  insert into public.player_score_history (
    player_id, player_name, jersey_number, source,
    old_shooting, old_defense, old_passing, old_control, old_activity,
    new_shooting, new_defense, new_passing, new_control, new_activity
  ) values (
    old.id, old.name, old.jersey_number,
    coalesce(nullif(current_setting('app.gfc_score_source', true), ''), 'manual'),
    old.shooting, old.defense, old.passing, old.control, old.activity,
    new.shooting, new.defense, new.passing, new.control, new.activity
  );
  return new;
end;
$fn$;
revoke all on function gfc_internal.record_player_score_change() from public;
create trigger record_player_score_change
after update of shooting, defense, passing, control, activity on public.players
for each row when (
  (old.shooting, old.defense, old.passing, old.control, old.activity)
  is distinct from
  (new.shooting, new.defense, new.passing, new.control, new.activity)
)
execute function gfc_internal.record_player_score_change();

do $import$
declare
  item record;
  matched integer;
  changed integer := 0;
begin
  if (select count(*) from public.players where is_active) <> 20 then
    raise exception 'Expected exactly 20 active players';
  end if;
  perform set_config('app.gfc_score_source', 'peer_review_2026_10_18', true);
  for item in select * from jsonb_to_recordset('[{"name":"김진형","jersey_number":10,"shooting":3.26,"defense":3.44,"passing":2.89,"control":3.33,"activity":3.24},{"name":"유태종","jersey_number":4,"shooting":2.53,"defense":4.16,"passing":2.53,"control":2.29,"activity":3.39},{"name":"이승준","jersey_number":11,"shooting":2.55,"defense":3.08,"passing":2.33,"control":2.1,"activity":3.0},{"name":"강상원","jersey_number":66,"shooting":4.21,"defense":4.11,"passing":3.94,"control":4.0,"activity":4.16},{"name":"김현재","jersey_number":41,"shooting":2.46,"defense":3.08,"passing":2.08,"control":2.0,"activity":3.0},{"name":"박재민","jersey_number":8,"shooting":3.74,"defense":4.47,"passing":3.68,"control":3.68,"activity":4.05},{"name":"연호준","jersey_number":14,"shooting":3.09,"defense":2.82,"passing":4.09,"control":3.27,"activity":1.88},{"name":"육준수","jersey_number":13,"shooting":3.89,"defense":2.82,"passing":3.0,"control":3.22,"activity":3.11},{"name":"임준성","jersey_number":12,"shooting":3.11,"defense":3.95,"passing":2.84,"control":2.47,"activity":4.11},{"name":"정수찬","jersey_number":33,"shooting":2.0,"defense":3.72,"passing":2.0,"control":1.78,"activity":3.18},{"name":"연상준","jersey_number":7,"shooting":3.68,"defense":3.16,"passing":3.26,"control":3.42,"activity":3.21},{"name":"이승재","jersey_number":21,"shooting":4.37,"defense":3.33,"passing":3.95,"control":4.21,"activity":3.89},{"name":"최민혁","jersey_number":5,"shooting":4.47,"defense":4.32,"passing":4.37,"control":4.05,"activity":4.53},{"name":"권태윤","jersey_number":6,"shooting":3.53,"defense":3.18,"passing":3.5,"control":3.82,"activity":3.25},{"name":"박재진","jersey_number":9,"shooting":3.58,"defense":2.89,"passing":2.74,"control":3.42,"activity":3.32},{"name":"변준성","jersey_number":15,"shooting":2.5,"defense":3.5,"passing":2.23,"control":2.1,"activity":2.93},{"name":"서태광","jersey_number":77,"shooting":4.06,"defense":3.59,"passing":3.72,"control":3.78,"activity":3.94},{"name":"연희준","jersey_number":37,"shooting":3.0,"defense":3.0,"passing":2.78,"control":2.41,"activity":3.26},{"name":"이준행","jersey_number":99,"shooting":2.43,"defense":3.09,"passing":2.1,"control":2.0,"activity":3.15},{"name":"정찬영","jersey_number":17,"shooting":2.41,"defense":3.41,"passing":2.25,"control":2.23,"activity":3.38}]'::jsonb)
    as x(name text, jersey_number integer, shooting numeric, defense numeric,
         passing numeric, control numeric, activity numeric)
  loop
    if item.shooting not between 1 and 5 or item.defense not between 1 and 5
      or item.passing not between 1 and 5 or item.control not between 1 and 5
      or item.activity not between 1 and 5 then
      raise exception 'Invalid score for %', item.name;
    end if;
    select count(*) into matched from public.players
      where name = item.name and jersey_number = item.jersey_number and is_active;
    if matched <> 1 then
      raise exception 'Player match failed: % (#%)', item.name, item.jersey_number;
    end if;
    update public.players set shooting = item.shooting, defense = item.defense,
      passing = item.passing, control = item.control, activity = item.activity,
      updated_at = now()
      where name = item.name and jersey_number = item.jersey_number and is_active;
    changed := changed + 1;
  end loop;
  if changed <> 20 then raise exception 'Expected 20 input scores, got %', changed; end if;
end;
$import$;
