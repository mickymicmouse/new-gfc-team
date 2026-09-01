-- Lock public writes behind an administrator PIN without storing the PIN itself.
create or replace function public.is_gfc_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(
      coalesce(
        coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-gfc-admin-pin',
        ''
      ),
      'sha256'
    ),
    'hex'
  ) = '3427ff8de45c01490f7378a6c75062347014ecfbe3ea0ffe6f66432f4595b09d';
$$;

revoke all on function public.is_gfc_admin() from public;
grant execute on function public.is_gfc_admin() to anon, authenticated;

drop policy if exists players_all on public.players;
drop policy if exists matches_all on public.matches;
drop policy if exists match_players_all on public.match_players;

create policy players_public_read
on public.players for select
to anon, authenticated
using (is_active = true or public.is_gfc_admin());

create policy players_admin_write
on public.players for all
to anon, authenticated
using (public.is_gfc_admin())
with check (public.is_gfc_admin());

create policy matches_public_read
on public.matches for select
to anon, authenticated
using (status = 'confirmed' or public.is_gfc_admin());

create policy matches_admin_write
on public.matches for all
to anon, authenticated
using (public.is_gfc_admin())
with check (public.is_gfc_admin());

create policy match_players_public_read
on public.match_players for select
to anon, authenticated
using (
  public.is_gfc_admin()
  or exists (
    select 1
    from public.matches
    where matches.id = match_players.match_id
      and matches.status = 'confirmed'
  )
);

create policy match_players_admin_write
on public.match_players for all
to anon, authenticated
using (public.is_gfc_admin())
with check (public.is_gfc_admin());
